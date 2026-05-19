import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/mock-exam-scheduler'

// GET /api/ranking?courseSlug=&day=TUE|THU|SUN&weekStart=ISO
// Top 50 do simulado da janela. Mostra só quem optou (showInRanking=true).
// Aluno autenticado vê sempre sua posição mesmo se opt-out.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug')
  const day = (searchParams.get('day') ?? 'SUN').toUpperCase()
  const weekStartParam = searchParams.get('weekStart')

  if (!courseSlug) return NextResponse.json({ message: 'courseSlug obrigatório' }, { status: 400 })
  if (!['TUE', 'THU', 'SUN'].includes(day)) return NextResponse.json({ message: 'day inválido' }, { status: 400 })

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const weekStart = weekStartParam ? new Date(weekStartParam) : getWeekStart()

  const mockExam = await prisma.mockExam.findFirst({
    where: { courseId: course.id, weekStart, scheduledDay: day, active: true },
  })
  if (!mockExam) return NextResponse.json({ ranking: [], mockExam: null, weekStart })

  // Top 50 que optaram pra mostrar
  const top = await prisma.mockExamResult.findMany({
    where: {
      mockExamId: mockExam.id,
      status: { in: ['SUBMITTED', 'EXPIRED'] },
      showInRanking: true,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }],
    take: 50,
  })

  // Posição do usuário atual (mesmo se opt-out)
  const myResult = await prisma.mockExamResult.findUnique({
    where: { userId_mockExamId: { userId: user.id, mockExamId: mockExam.id } },
  })
  let myPosition: number | null = null
  if (myResult && (myResult.status === 'SUBMITTED' || myResult.status === 'EXPIRED')) {
    // Quantos têm score maior (ou igual + finishedAt anterior)
    const better = await prisma.mockExamResult.count({
      where: {
        mockExamId: mockExam.id,
        status: { in: ['SUBMITTED', 'EXPIRED'] },
        OR: [
          { score: { gt: myResult.score } },
          { score: myResult.score, finishedAt: { lt: myResult.finishedAt ?? new Date() } },
        ],
      },
    })
    myPosition = better + 1
  }

  // Total de participantes (mesmo opt-out conta)
  const totalParticipants = await prisma.mockExamResult.count({
    where: { mockExamId: mockExam.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
  })

  return NextResponse.json({
    mockExam: {
      id: mockExam.id,
      title: mockExam.title,
      scheduledDay: mockExam.scheduledDay,
      weekStart: mockExam.weekStart,
    },
    ranking: top.map((r, i) => ({
      position: i + 1,
      userId: r.userId,
      userName: r.user.name.split(' ')[0] + (r.user.name.split(' ').length > 1 ? ' ' + (r.user.name.split(' ')[1] ?? '').charAt(0) + '.' : ''),
      avatar: r.user.avatar,
      score: r.score,
      acertos: r.acertos,
      erros: r.erros,
      brancos: r.brancos,
      timeMs: r.timeMs,
      isMe: r.userId === user.id,
    })),
    myPosition,
    totalParticipants,
    myShowInRanking: myResult?.showInRanking ?? true,
  })
}

// PATCH /api/ranking — toggle opt-in/out do user no ranking
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { mockExamId, showInRanking } = await req.json()
  if (!mockExamId) return NextResponse.json({ message: 'mockExamId obrigatório' }, { status: 400 })

  await prisma.mockExamResult.update({
    where: { userId_mockExamId: { userId: user.id, mockExamId } },
    data: { showInRanking: !!showInRanking },
  })
  return NextResponse.json({ ok: true })
}
