import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

/**
 * Retorna o simulado COM as questões (sem gabarito/explicação).
 * Gabarito só aparece depois de submeter (endpoint /result).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({ where: { id: params.id } })
  if (!exam) return NextResponse.json({ message: 'Simulado não encontrado' }, { status: 404 })

  const questionIds = (exam.questions as string[]) ?? []
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      enunciado: true,
      alternativas: true,
      subjectId: true,
      // NÃO retorna gabarito/explicação aqui
    },
  })
  // Preserva ordem
  const byId = new Map(questions.map((q) => [q.id, q]))
  const ordered = questionIds.map((id) => byId.get(id)).filter(Boolean)

  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    type: exam.type,
    durationMin: exam.durationMin,
    totalQuestoes: exam.totalQuestoes,
    hasRedacao: exam.hasRedacao,
    examFormat: exam.examFormat,
    wrongAnnulsRight: exam.wrongAnnulsRight,
    questions: ordered,
  })
}
