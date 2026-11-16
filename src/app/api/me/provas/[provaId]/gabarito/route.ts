import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { gabaritoDaProva } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** GET /api/me/provas/[provaId]/gabarito — modo leitura: a prova inteira com o gabarito oficial. */
export async function GET(req: NextRequest, { params }: { params: { provaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json(await gabaritoDaProva(auth.user.id, params.provaId))
  } catch (err) {
    return respostaDeErro(err, 'provas-gabarito')
  }
}
