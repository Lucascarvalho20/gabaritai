import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/cursos[?includeNoEdital=1]
// Retorna cursos do aluno com TODAS as métricas reais. Nada inventado.
//
// Por padrão (aluno comum): retorna SÓ cursos com edital ativo cadastrado.
// Admin ou ?includeNoEdital=1: retorna tudo, com flag hasActiveEdital.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const includeNoEdital = req.nextUrl.searchParams.get('includeNoEdital') === '1' || user.role === 'ADMIN'

  const enrollments = await prisma.userCourseEnrollment.findMany({
    where: { userId: user.id, isActive: true },
    include: {
      course: {
        select: {
          id: true, slug: true, name: true, cargo: true, orgao: true, uf: true, area: true,
          _count: { select: { courseSubjects: true, editais: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  })

  const data = await Promise.all(
    enrollments.map(async (e) => {
      // Mastery por matéria deste curso (cada linha = uma matéria do curso)
      const masteries = await prisma.userSubjectMastery.findMany({
        where: { userId: user.id, courseId: e.courseId },
        select: {
          masteryScore: true, totalAttempts: true, correctAttempts: true,
          subject: { select: { id: true, name: true } },
        },
      })

      const totalAttempts = masteries.reduce((s, m) => s + m.totalAttempts, 0)
      const totalCorrect = masteries.reduce((s, m) => s + m.correctAttempts, 0)
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

      // Progresso geral = média do masteryScore (0-100) das matérias com atividade
      const masteriesComAtividade = masteries.filter((m) => m.totalAttempts > 0)
      const progress = masteriesComAtividade.length
        ? Math.round(masteriesComAtividade.reduce((s, m) => s + m.masteryScore, 0) / masteriesComAtividade.length)
        : 0

      // Ponto fraco = matéria com pior acerto (% e mínimo 5 questões pra significância)
      let topFraqueza: { name: string; pct: number } | null = null
      for (const m of masteriesComAtividade) {
        if (m.totalAttempts < 5) continue
        const pct = Math.round((m.correctAttempts / m.totalAttempts) * 100)
        if (!topFraqueza || pct < topFraqueza.pct) {
          topFraqueza = { name: m.subject.name, pct }
        }
      }

      const simulados = await prisma.mockExamResult.count({
        where: {
          userId: user.id,
          status: { in: ['SUBMITTED', 'EXPIRED'] },
          mockExam: { courseId: e.courseId },
        },
      })

      // Tem edital ativo cadastrado pelo admin?
      const editalAtivo = await prisma.edital.findFirst({
        where: { courseId: e.courseId, isActive: true },
        select: { id: true },
      })

      return {
        courseId: e.course.id,
        slug: e.course.slug,
        name: e.course.name,
        cargo: e.course.cargo,
        orgao: e.course.orgao,
        area: e.course.area,
        progress,
        totalAttempts,
        totalCorrect,
        accuracy,
        simulados,
        hasActiveEdital: !!editalAtivo,
        lastActivityAt: e.lastStudyAt ? e.lastStudyAt.toISOString() : null,
        topFraqueza,
      }
    }),
  )

  const visible = includeNoEdital ? data : data.filter((c) => c.hasActiveEdital)
  return NextResponse.json({ cursos: visible, total: data.length, hidden: data.length - visible.length })
}
