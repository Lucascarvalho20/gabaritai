import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { canAttemptQuestion } from '@/lib/plan-access'
import { autoCreateFlashcardFromWrongAnswer } from '@/lib/auto-flashcard'
import { somarAoDominio } from '@/lib/dominio'
import { depoisDaResposta } from '@/lib/depois-da-resposta'

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
 *
 * É a rota do clique em "Responder": o aluno espera por ela. Por isso as
 * consultas independentes vão em paralelo e o domínio por matéria é um único
 * UPSERT atômico (soma no próprio banco). Antes eram ~11 idas ao banco em
 * fila; cada uma custava ~65 ms com a função em Washington e o banco no Oregon.
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

  // Limite do plano e a questão não dependem um do outro: em paralelo.
  const [limitCheck, question] = await Promise.all([
    canAttemptQuestion(user.id), // trial: 30 questões/dia; pagantes sem limite
    prisma.question.findUnique({
      where: { id: params.id },
      select: { id: true, gabarito: true, subjectId: true, active: true, anulada: true, explicacao: true },
    }),
  ])
  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        message: limitCheck.reason,
        limit: { used: limitCheck.used, max: limitCheck.max, upgrade: limitCheck.upgradeMessage },
      },
      { status: 429 },
    )
  }
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

  const [attempt, enrollment] = await Promise.all([
    prisma.questionAttempt.create({
      data: { userId: user.id, questionId: question.id, selected: selectedNorm, correct, timeMs: timeMs ?? null },
      select: { id: true },
    }),
    // Curso "atual" do aluno que tem a matéria — o domínio é por curso.
    question.subjectId
      ? prisma.userCourseEnrollment.findFirst({
          where: { userId: user.id, isActive: true, course: { courseSubjects: { some: { subjectId: question.subjectId } } } },
          select: { courseId: true },
        })
      : null,
  ])

  let masteryDelta: { old: number; novo: number } | null = null
  if (question.subjectId && enrollment) {
    const [d] = await Promise.all([
      somarAoDominio({ userId: user.id, courseId: enrollment.courseId, subjectId: question.subjectId, acertou: correct, idNovo: `usm_${attempt.id}` }),
      prisma.userCourseEnrollment.updateMany({
        where: { userId: user.id, courseId: enrollment.courseId },
        data: { lastStudyAt: new Date() },
      }),
    ])
    masteryDelta = { old: d.antes, novo: d.novo }
  }

  // Auto-flashcard ao errar: chama IA, então roda depois da resposta — o aluno
  // não espera por ele. Decisão João 2026-05-30: erro = flashcard automático.
  if (!correct) {
    depoisDaResposta(
      autoCreateFlashcardFromWrongAnswer({ userId: user.id, questionId: question.id }).then((res) => {
        if (res.ok && res.created) console.log(`[auto-flashcard] gerado pra user=${user.id} q=${question.id}`)
      }),
      'auto-flashcard',
    )
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    correct,
    gabarito: gabaritoNorm,
    explicacao: question.explicacao ?? null,
    masteryDelta,
    autoFlashcard: !correct, // hint pro front mostrar "+1 flashcard na fila"
  })
}
