import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isWindowOpen } from '@/lib/mock-exam-scheduler'

/**
 * Retorna o simulado COM as questões (sem gabarito/explicação).
 * Gabarito só aparece depois de submeter (endpoint /result).
 *
 * Proteção contra antecipação de simulado:
 * - Se o aluno JÁ TEM um result (chamou /start), pode ver
 * - Se NÃO TEM result, só vê se a janela está aberta (REAL/MINI agendados)
 *   ou se for PERSONALIZADO sem janela
 * - Admin pode ver sempre (pra inspecionar antes de publicar)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({ where: { id: params.id } })
  if (!exam) return NextResponse.json({ message: 'Simulado não encontrado' }, { status: 404 })

  if (user.role !== 'ADMIN') {
    const hasResult = await prisma.mockExamResult.findUnique({
      where: { userId_mockExamId: { userId: user.id, mockExamId: exam.id } },
      select: { id: true },
    })
    if (!hasResult) {
      const isShared = exam.weekStart && exam.scheduledDay
      if (isShared && !isWindowOpen(exam)) {
        return NextResponse.json({
          message: 'Esse simulado ainda não está disponível. Aguarde a janela abrir.',
          code: 'WINDOW_NOT_OPEN',
          opensAt: exam.availableFrom,
        }, { status: 403 })
      }
    }
  }

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
