import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

/**
 * Resultado completo do simulado COM gabarito e explicações.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string; resultId: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const result = await prisma.mockExamResult.findFirst({
    where: { id: params.resultId, userId: user.id },
    include: { mockExam: { select: { title: true, totalQuestoes: true, hasRedacao: true, examFormat: true } } },
  })
  if (!result) return NextResponse.json({ message: 'Resultado não encontrado' }, { status: 404 })

  // Buscar questões pra montar gabarito completo
  const answers = result.answers as Array<{ questionId: string; selected: string | null; correct: boolean }>
  const questionIds = answers.map((a) => a.questionId)
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      enunciado: true,
      alternativas: true,
      gabarito: true,
      explicacao: true,
      subjectId: true,
      subject: { select: { name: true } },
    },
  })
  const qMap = new Map(questions.map((q) => [q.id, q]))

  return NextResponse.json({
    id: result.id,
    score: result.score,
    scoreRaw: result.scoreRaw,
    acertos: result.acertos,
    erros: result.erros,
    brancos: result.brancos,
    timeMs: result.timeMs,
    redacaoText: result.redacaoText,
    redacaoMin: result.redacaoMin,
    mockExam: result.mockExam,
    review: answers.map((a) => {
      const q = qMap.get(a.questionId)
      return {
        questionId: a.questionId,
        enunciado: q?.enunciado,
        alternativas: q?.alternativas,
        selected: a.selected,
        gabarito: q?.gabarito,
        correct: a.correct,
        explicacao: q?.explicacao,
        materia: q?.subject?.name,
      }
    }),
  })
}
