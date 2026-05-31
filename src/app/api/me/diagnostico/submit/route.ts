import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { createDefaultStudyPlan } from '@/lib/create-default-study-plan'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Answer = { questionId: string; selected: string | null }

/**
 * POST /api/me/diagnostico/submit
 *
 * Recebe as respostas das 20 questões do diagnóstico. Calcula correto/errado,
 * cria QuestionAttempt pra alimentar histórico, atualiza UserSubjectMastery,
 * marca lastDiagnosticAt no enrollment, e RECRIA o StudyPlan dando peso
 * dobrado às matérias onde o aluno acertou menos de 60%.
 *
 * Body: { answers: Array<{ questionId, selected }>, timeMs?: number }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const userId = auth.user.id

  const body = await req.json().catch(() => null)
  const answers = (body?.answers ?? []) as Answer[]
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ message: 'Respostas inválidas' }, { status: 400 })
  }

  // Curso principal
  const primaryEnrollment = await prisma.userCourseEnrollment.findFirst({
    where: { userId, isPrimary: true, isActive: true },
    select: { id: true, courseId: true },
  })
  if (!primaryEnrollment) {
    return NextResponse.json({ message: 'Sem curso principal ativo' }, { status: 400 })
  }

  // Busca gabarito + subject das questões
  const questionIds = answers.map((a) => a.questionId).filter(Boolean)
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, gabarito: true, subjectId: true },
  })
  const qMap = new Map(questions.map((q) => [q.id, q]))

  // Calcula correto por matéria
  type Tally = { total: number; correct: number }
  const bySubject = new Map<string, Tally>()
  let totalAcertos = 0
  let totalErros = 0
  let totalBrancos = 0

  const attemptsData: Array<{
    userId: string
    questionId: string
    selected: string
    correct: boolean
    timeMs: number | null
  }> = []

  for (const a of answers) {
    const q = qMap.get(a.questionId)
    if (!q || !q.subjectId) continue
    const tally = bySubject.get(q.subjectId) ?? { total: 0, correct: 0 }
    tally.total++
    if (!a.selected) {
      totalBrancos++
    } else {
      const correct = String(a.selected).trim().toUpperCase() === String(q.gabarito).trim().toUpperCase()
      if (correct) {
        tally.correct++
        totalAcertos++
      } else {
        totalErros++
      }
      attemptsData.push({
        userId,
        questionId: q.id,
        selected: String(a.selected),
        correct,
        timeMs: null,
      })
    }
    bySubject.set(q.subjectId, tally)
  }

  // Persiste tudo em paralelo (com transaction pra atomicidade)
  await prisma.$transaction(async (tx) => {
    // 1. QuestionAttempt em batch
    if (attemptsData.length > 0) {
      await tx.questionAttempt.createMany({ data: attemptsData })
    }

    // 2. UserSubjectMastery — atualiza/cria pra cada matéria
    for (const [subjectId, tally] of bySubject.entries()) {
      const existing = await tx.userSubjectMastery.findUnique({
        where: { userId_courseId_subjectId: { userId, courseId: primaryEnrollment.courseId, subjectId } },
      })
      const totalAttempts = (existing?.totalAttempts ?? 0) + tally.total
      const correctAttempts = (existing?.correctAttempts ?? 0) + tally.correct
      const masteryScore = totalAttempts > 0 ? +((correctAttempts / totalAttempts) * 100).toFixed(2) : 0
      await tx.userSubjectMastery.upsert({
        where: { userId_courseId_subjectId: { userId, courseId: primaryEnrollment.courseId, subjectId } },
        update: { totalAttempts, correctAttempts, masteryScore, lastAttemptAt: new Date() },
        create: {
          userId, courseId: primaryEnrollment.courseId, subjectId,
          totalAttempts, correctAttempts, masteryScore, lastAttemptAt: new Date(),
        },
      })
    }

    // 3. Marca enrollment com lastDiagnosticAt
    await tx.userCourseEnrollment.update({
      where: { id: primaryEnrollment.id },
      data: { lastDiagnosticAt: new Date() },
    })
  })

  // 4. NÃO altera o StudyPlan — regra do produto: cronograma cobre TODO o
  //    edital, não pode ser distorcido pelo diagnóstico.
  //    O diagnóstico só atualiza UserSubjectMastery (fraquezas) que é o que
  //    alimenta a tela /dashboard/historico e o "modo turbo" do cronograma.
  //    Cria StudyPlan padrão SÓ se o aluno ainda não tiver nenhum ativo.
  const fraquezas: string[] = []
  for (const [subjectId, tally] of bySubject.entries()) {
    if (tally.total === 0) continue
    const pct = (tally.correct / tally.total) * 100
    if (pct < 60) fraquezas.push(subjectId)
  }

  let studyPlanId: string | null = null
  try {
    const planRes = await createDefaultStudyPlan({
      userId,
      courseId: primaryEnrollment.courseId,
      // SEM priorityFraquezas — cronograma cobre tudo igual.
      // SEM forceReplace — não destrói plano existente.
    })
    studyPlanId = planRes?.studyPlanId ?? null
  } catch (err) {
    console.error('[diagnostico] falha ao garantir plano:', err)
    // Não bloqueia — aluno vê o resultado mesmo sem plano
  }

  // Resumo por matéria pra o front mostrar
  const resumoPorMateria = Array.from(bySubject.entries()).map(([subjectId, t]) => ({
    subjectId,
    total: t.total,
    correct: t.correct,
    pct: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    nivel: t.total === 0 ? 'sem-dados' : (t.correct / t.total) >= 0.75 ? 'forte' : (t.correct / t.total) >= 0.6 ? 'medio' : 'fraco',
  }))

  return NextResponse.json({
    ok: true,
    studyPlanId,
    overview: {
      totalRespondidas: totalAcertos + totalErros + totalBrancos,
      acertos: totalAcertos,
      erros: totalErros,
      brancos: totalBrancos,
      taxaAcerto: (totalAcertos + totalErros) > 0
        ? Math.round((totalAcertos / (totalAcertos + totalErros)) * 100)
        : 0,
    },
    porMateria: resumoPorMateria,
    fraquezasIdentificadas: fraquezas.length,
  })
}
