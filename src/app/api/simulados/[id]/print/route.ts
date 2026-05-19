import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/simulados/[id]/print
// Retorna simulado COM gabarito + explicação. Só libera se:
// - aluno já fez (status SUBMITTED ou EXPIRED), OU
// - janela do simulado já passou, OU
// - é admin
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({
    where: { id: params.id },
    include: { results: { where: { userId: user.id }, take: 1 } },
  })
  if (!exam) return NextResponse.json({ message: 'Simulado não encontrado' }, { status: 404 })

  const myResult = exam.results[0]
  const windowEnded = exam.availableUntil ? new Date() > exam.availableUntil : true
  const completed = myResult && (myResult.status === 'SUBMITTED' || myResult.status === 'EXPIRED')

  if (user.role !== 'ADMIN' && !completed && !windowEnded) {
    return NextResponse.json({
      message: 'Aguarde fazer o simulado ou a janela acabar pra ver o gabarito',
      code: 'NOT_YET_AVAILABLE',
    }, { status: 403 })
  }

  const questionIds = (exam.questions as string[]) ?? []
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      enunciado: true,
      alternativas: true,
      gabarito: true,
      explicacao: true,
      subjectId: true,
      bancaSlug: true,
    },
  })
  const byId = new Map(questions.map((q) => [q.id, q]))
  const ordered = questionIds.map((id, idx) => {
    const q = byId.get(id)
    if (!q) return null
    return { numero: idx + 1, ...q }
  }).filter(Boolean)

  const answers = myResult?.answers as Array<{ questionId: string; selected: string | null; correct: boolean }> | undefined

  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    type: exam.type,
    durationMin: exam.durationMin,
    totalQuestoes: exam.totalQuestoes,
    bancaSlug: exam.bancaSlug,
    examFormat: exam.examFormat,
    wrongAnnulsRight: exam.wrongAnnulsRight,
    questions: ordered,
    minhasRespostas: answers ?? null,
    minhaNota: myResult ? { score: myResult.score, acertos: myResult.acertos, erros: myResult.erros, brancos: myResult.brancos } : null,
  })
}
