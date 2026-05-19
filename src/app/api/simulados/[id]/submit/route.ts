import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { calculateScore } from '@/lib/simulado-generator'

type SubmitBody = {
  answers: Array<{ questionId: string; selected: string | null; timeMs?: number }>
  redacaoText?: string
  redacaoMin?: number
  timeMs?: number
  autoSubmit?: boolean // true se foi o cronômetro que disparou
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = (await req.json()) as SubmitBody

  const exam = await prisma.mockExam.findUnique({ where: { id: params.id } })
  if (!exam) return NextResponse.json({ message: 'Simulado não encontrado' }, { status: 404 })

  const result = await prisma.mockExamResult.findUnique({
    where: { userId_mockExamId: { userId: user.id, mockExamId: exam.id } },
  })
  if (!result) {
    return NextResponse.json({ message: 'Você precisa iniciar o simulado antes de submeter', code: 'NOT_STARTED' }, { status: 400 })
  }
  if (result.status === 'SUBMITTED' || result.status === 'EXPIRED') {
    return NextResponse.json({ resultId: result.id, score: result.score, alreadyDone: true })
  }

  const now = new Date()
  const expired = result.expiresAt && now > result.expiresAt
  const finalStatus = expired || body.autoSubmit ? 'EXPIRED' : 'SUBMITTED'

  const questionIds = (exam.questions as string[]) ?? []
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, gabarito: true, subjectId: true },
  })
  const gabaritoMap = new Map(questions.map((q) => [q.id, { gabarito: q.gabarito, subjectId: q.subjectId }]))

  let acertos = 0
  let erros = 0
  let brancos = 0
  const answeredWithCorrectness = body.answers.map((a) => {
    const info = gabaritoMap.get(a.questionId)
    if (!info) return { ...a, correct: false, gabarito: null as string | null, subjectId: null as string | null }
    if (!a.selected) {
      brancos++
      return { ...a, correct: false, gabarito: info.gabarito, subjectId: info.subjectId }
    }
    const correct = String(a.selected).trim().toUpperCase() === String(info.gabarito).trim().toUpperCase()
    if (correct) acertos++; else erros++
    return { ...a, correct, gabarito: info.gabarito, subjectId: info.subjectId }
  })

  const { score, scoreRaw } = calculateScore({
    totalQuestoes: exam.totalQuestoes,
    acertos, erros, brancos,
    wrongAnnulsRight: exam.wrongAnnulsRight,
  })

  const updated = await prisma.mockExamResult.update({
    where: { id: result.id },
    data: {
      status: finalStatus,
      score, scoreRaw, acertos, erros, brancos,
      answers: answeredWithCorrectness as any,
      redacaoText: body.redacaoText ?? null,
      redacaoMin: body.redacaoMin ?? null,
      timeMs: body.timeMs ?? null,
      finishedAt: now,
    },
  })

  // Atualiza UserSubjectMastery (a IA aprende)
  if (exam.courseId) {
    const bySubject = new Map<string, { total: number; correct: number }>()
    for (const a of answeredWithCorrectness) {
      if (!a.subjectId) continue
      const cur = bySubject.get(a.subjectId) ?? { total: 0, correct: 0 }
      cur.total++; if (a.correct) cur.correct++
      bySubject.set(a.subjectId, cur)
    }
    for (const [subjectId, stats] of bySubject.entries()) {
      const existing = await prisma.userSubjectMastery.findUnique({
        where: { userId_courseId_subjectId: { userId: user.id, courseId: exam.courseId, subjectId } },
      })
      const totalAttempts = (existing?.totalAttempts ?? 0) + stats.total
      const correctAttempts = (existing?.correctAttempts ?? 0) + stats.correct
      const masteryScore = totalAttempts > 0 ? +((correctAttempts / totalAttempts) * 100).toFixed(2) : 0
      await prisma.userSubjectMastery.upsert({
        where: { userId_courseId_subjectId: { userId: user.id, courseId: exam.courseId, subjectId } },
        update: { totalAttempts, correctAttempts, masteryScore, lastAttemptAt: now },
        create: {
          userId: user.id, courseId: exam.courseId, subjectId,
          totalAttempts, correctAttempts, masteryScore, lastAttemptAt: now,
        },
      })
    }
  }

  return NextResponse.json({
    resultId: updated.id,
    status: finalStatus,
    score, scoreRaw, acertos, erros, brancos,
    expired,
  })
}
