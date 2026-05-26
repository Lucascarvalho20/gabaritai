import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { canAttemptQuestion } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/questoes/[id]/attempt
 * Persiste a tentativa do aluno. É essa chamada que ALIMENTA as estatísticas
 * reais (acerto, mastery, fraquezas, etc).
 *
 * Body: { selected: string, timeMs?: number }
 *
 * Retorna: { correct: boolean, gabarito: string, attemptId, masteryDelta }
 *  - gabarito só é revelado APÓS persistir (pra impedir cheating no client)
 *  - atualiza UserSubjectMastery automaticamente
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const selected: string | undefined = body.selected ? String(body.selected).trim() : undefined
  const timeMs: number | undefined = typeof body.timeMs === 'number' ? body.timeMs : undefined

  if (!selected) {
    return NextResponse.json({ message: 'Resposta selecionada é obrigatória' }, { status: 400 })
  }

  // Limite diário do trial (30 questões/dia). Pagantes não têm limite.
  const limitCheck = await canAttemptQuestion(user.id)
  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        message: limitCheck.reason,
        limit: { used: limitCheck.used, max: limitCheck.max, upgrade: limitCheck.upgradeMessage },
      },
      { status: 429 },
    )
  }

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    select: {
      id: true, gabarito: true, subjectId: true, active: true, anulada: true,
      explicacao: true,
    },
  })
  if (!question || !question.active) {
    return NextResponse.json({ message: 'Questão não disponível' }, { status: 404 })
  }
  if (question.anulada) {
    return NextResponse.json({ message: 'Questão foi anulada — não conta no histórico' }, { status: 410 })
  }

  // Comparação case-insensitive (gabarito pode ser "C" ou "c" ou "certo")
  const gabaritoNorm = (question.gabarito ?? '').toString().trim().toUpperCase()
  const selectedNorm = selected.toUpperCase()
  const correct = gabaritoNorm.length > 0 && selectedNorm === gabaritoNorm

  const attempt = await prisma.questionAttempt.create({
    data: {
      userId: user.id,
      questionId: question.id,
      selected: selectedNorm,
      correct,
      timeMs: timeMs ?? null,
    },
    select: { id: true, createdAt: true },
  })

  // Atualiza mastery por matéria (somente se a questão tem subjectId)
  let masteryDelta: { old: number; novo: number } | null = null
  if (question.subjectId) {
    // Pega curso "atual" do user (qualquer enrollment com a matéria) — pra mastery por curso
    const enrollment = await prisma.userCourseEnrollment.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        course: { courseSubjects: { some: { subjectId: question.subjectId } } },
      },
      select: { courseId: true },
    })
    if (enrollment) {
      const existing = await prisma.userSubjectMastery.findUnique({
        where: {
          userId_courseId_subjectId: {
            userId: user.id, courseId: enrollment.courseId, subjectId: question.subjectId,
          },
        },
      }).catch(() => null)

      const oldScore = existing?.masteryScore ?? 0
      const newTotal = (existing?.totalAttempts ?? 0) + 1
      const newCorrect = (existing?.correctAttempts ?? 0) + (correct ? 1 : 0)
      const newScore = Math.round((newCorrect / newTotal) * 100)

      await prisma.userSubjectMastery.upsert({
        where: {
          userId_courseId_subjectId: {
            userId: user.id, courseId: enrollment.courseId, subjectId: question.subjectId,
          },
        },
        update: {
          totalAttempts: newTotal,
          correctAttempts: newCorrect,
          masteryScore: newScore,
          lastAttemptAt: new Date(),
        },
        create: {
          userId: user.id,
          courseId: enrollment.courseId,
          subjectId: question.subjectId,
          totalAttempts: newTotal,
          correctAttempts: newCorrect,
          masteryScore: newScore,
          lastAttemptAt: new Date(),
        },
      })
      masteryDelta = { old: oldScore, novo: newScore }

      // Atualiza lastStudyAt do enrollment
      await prisma.userCourseEnrollment.updateMany({
        where: { userId: user.id, courseId: enrollment.courseId },
        data: { lastStudyAt: new Date() },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    correct,
    gabarito: gabaritoNorm,
    explicacao: question.explicacao ?? null,
    masteryDelta,
  })
}
