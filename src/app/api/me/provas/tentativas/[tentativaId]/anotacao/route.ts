import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { rateLimit } from '@/lib/rate-limit'
import { anotarTentativa } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** PUT { anotacao } — a anotação do aluno nesta tentativa (até 500 caracteres; vazio apaga). */
export async function PUT(req: NextRequest, { params }: { params: { tentativaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const rl = rateLimit({ key: `anotacao:${auth.user.id}`, windowMs: 60_000, max: 30 })
  if (!rl.allowed) return NextResponse.json({ message: 'Muitas alterações seguidas. Espere um minuto.' }, { status: 429 })
  try {
    const corpo = await req.json().catch(() => ({}))
    return NextResponse.json(await anotarTentativa(auth.user.id, params.tentativaId, corpo?.anotacao))
  } catch (err) {
    return respostaDeErro(err, 'provas-anotacao')
  }
}
