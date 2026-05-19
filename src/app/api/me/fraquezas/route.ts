import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/fraquezas?courseSlug=
// Retorna pontos fracos do aluno baseado em UserSubjectMastery
//   - matérias com masteryScore < 60 são consideradas fracas
//   - ordenado por pior masteryScore primeiro
//   - inclui # de erros recentes (últimos 30 dias)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug') ?? undefined

  let courseId: string | undefined
  if (courseSlug) {
    const c = await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } })
    courseId = c?.id
  }

  const masteries = await prisma.userSubjectMastery.findMany({
    where: {
      userId: user.id,
      ...(courseId && { courseId }),
    },
    include: {
      subject: { select: { id: true, slug: true, name: true } },
      course: { select: { id: true, slug: true, name: true, cargo: true } },
    },
    orderBy: { masteryScore: 'asc' },
  })

  // Conta erros recentes (30 dias) por matéria
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const recentWrong = await prisma.questionAttempt.groupBy({
    by: ['questionId'],
    where: { userId: user.id, correct: false, createdAt: { gte: since } },
    _count: { _all: true },
  })

  // Pra mapear questionId -> subjectId
  const wrongQuestionIds = recentWrong.map((r) => r.questionId)
  const questions = wrongQuestionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: wrongQuestionIds } },
        select: { id: true, subjectId: true },
      })
    : []
  const qBySubject = new Map<string, number>()
  for (const r of recentWrong) {
    const q = questions.find((qq) => qq.id === r.questionId)
    if (q?.subjectId) {
      qBySubject.set(q.subjectId, (qBySubject.get(q.subjectId) ?? 0) + r._count._all)
    }
  }

  const data = masteries.map((m) => ({
    subjectId: m.subjectId,
    subjectName: m.subject.name,
    subjectSlug: m.subject.slug,
    courseId: m.courseId,
    courseName: m.course.name,
    courseSlug: m.course.slug,
    masteryScore: m.masteryScore,
    totalAttempts: m.totalAttempts,
    correctAttempts: m.correctAttempts,
    recentWrongCount: qBySubject.get(m.subjectId) ?? 0,
    lastAttemptAt: m.lastAttemptAt,
    nivel: m.masteryScore >= 85 ? 'FORTE' : m.masteryScore >= 60 ? 'MEDIO' : 'FRACO',
  }))

  return NextResponse.json({
    masteries: data,
    fracas: data.filter((d) => d.nivel === 'FRACO'),
    medias: data.filter((d) => d.nivel === 'MEDIO'),
    fortes: data.filter((d) => d.nivel === 'FORTE'),
  })
}
