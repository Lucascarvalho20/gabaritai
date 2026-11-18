import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { antesDeComecar, iniciarTentativa } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** GET — antes de começar: a prova, quantos itens e a tentativa em andamento. Não liga o cronômetro. */
export async function GET(req: NextRequest, { params }: { params: { provaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json(await antesDeComecar(auth.user.id, params.provaId))
  } catch (err) {
    return respostaDeErro(err, 'provas-antes')
  }
}

/**
 * POST /api/me/provas/[provaId]/tentativas — começa a prova (ou retoma a que
 * está em andamento). Devolve textos e itens SEM gabarito, o prazo do servidor
 * e a hora do servidor, para o cronômetro não depender do relógio do aparelho.
 */
export async function POST(req: NextRequest, { params }: { params: { provaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json(await iniciarTentativa(auth.user.id, params.provaId))
  } catch (err) {
    return respostaDeErro(err, 'provas-iniciar')
  }
}
