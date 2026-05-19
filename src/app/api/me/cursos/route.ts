import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/cursos
// Cursos do aluno + % de progresso (questões respondidas / disponíveis, mastery médio)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

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

  // Pra cada curso, calcula:
  //   - mastery médio (média de UserSubjectMastery)
  //   - simulados feitos
  //   - última atividade
  const data = await Promise.all(
    enrollments.map(async (e) => {
      const masteries = await prisma.userSubjectMastery.findMany({
        where: { userId: user.id, courseId: e.courseId },
        select: { masteryScore: true, totalAttempts: true, correctAttempts: true },
      })
      const avgMastery = masteries.length
        ? Math.round(masteries.reduce((s, m) => s + m.masteryScore, 0) / masteries.length)
        : 0
      const totalAttempts = masteries.reduce((s, m) => s + m.totalAttempts, 0)
      const totalCorrect = masteries.reduce((s, m) => s + m.correctAttempts, 0)

      const simulados = await prisma.mockExamResult.count({
        where: {
          userId: user.id,
          status: { in: ['SUBMITTED', 'EXPIRED'] },
          mockExam: { courseId: e.courseId },
        },
      })

      // Progresso: combinação de mastery + sessions completadas / total esperado
      const progress = avgMastery // simplificação

      return {
        ...e.course,
        enrolledAt: e.enrolledAt,
        expiresAt: e.expiresAt,
        lastStudyAt: e.lastStudyAt,
        progress,
        avgMastery,
        totalAttempts,
        totalCorrect,
        simuladosFeitos: simulados,
      }
    }),
  )

  return NextResponse.json({ cursos: data })
}
