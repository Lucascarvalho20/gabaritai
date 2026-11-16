import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { entregarTentativa } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** POST { respostas } — entrega e corrige no servidor. Entregar de novo não muda a nota. */
export async function POST(req: NextRequest, { params }: { params: { tentativaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    const corpo = await req.json().catch(() => ({}))
    return NextResponse.json(await entregarTentativa(auth.user.id, params.tentativaId, { respostas: corpo?.respostas }))
  } catch (err) {
    return respostaDeErro(err, 'provas-entregar')
  }
}
