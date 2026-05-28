import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/provas/[provaId]/gabarito
 *
 * Modo LEITURA: retorna a prova INTEIRA com gabarito + comentários.
 * Aluno pode ler sem fazer (estudo passivo).
 *
 * Inclui status de anulação por questão (Question.anulada).
 */
export async function GET(req: NextRequest, { params }: { params: { provaId: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const prova = await prisma.prova.findUnique({
    where: { id: params.provaId },
    include: {
      banca: { select: { name: true, slug: true } },
      course: { select: { id: true, name: true, slug: true } },
      edital: { select: { wrongAnnulsRight: true, examFormat: true } },
      questions: {
        where: { active: true },
        select: {
          id: true,
          enunciado: true,
          alternativas: true,
          gabarito: true,
          explicacao: true,
          subjectId: true,
          subject: { select: { name: true, slug: true } },
          topicId: true,
          topic: { select: { name: true } },
          difficulty: true,
          anulada: true,
          ano: true,
          source: true,
        },
        orderBy: { numeroQuestao: 'asc' },
      },
    },
  })

  if (!prova) return NextResponse.json({ message: 'Prova não encontrada' }, { status: 404 })

  return NextResponse.json({
    prova: {
      id: prova.id,
      titulo: prova.titulo,
      ano: prova.ano,
      etapa: prova.etapa,
      cargo: prova.cargo,
      banca: prova.banca?.name ?? null,
      course: prova.course,
      wrongAnnulsRight: prova.edital?.wrongAnnulsRight ?? false,
      examFormat: prova.edital?.examFormat ?? null,
    },
    questions: prova.questions,
  })
}
