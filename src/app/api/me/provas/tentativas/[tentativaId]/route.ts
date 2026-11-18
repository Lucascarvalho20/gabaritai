import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { descartarTentativa, resultadoDaTentativa, salvarRespostas } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** GET — resultado da tentativa entregue, com a revisão item a item. */
export async function GET(req: NextRequest, { params }: { params: { tentativaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json(await resultadoDaTentativa(auth.user.id, params.tentativaId))
  } catch (err) {
    return respostaDeErro(err, 'provas-resultado')
  }
}

/** PATCH { respostas } — salva enquanto o aluno marca (a tela manda a cada mudança, com espera de 1,5 s). */
export async function PATCH(req: NextRequest, { params }: { params: { tentativaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const rl = rateLimit({ key: `prova-salvar:${auth.user.id}:${getClientIp(req)}`, windowMs: 60_000, max: 90 })
  if (!rl.allowed) return NextResponse.json({ message: 'Salvando rápido demais — espere um instante.' }, { status: 429 })
  try {
    const { respostas } = await req.json().catch(() => ({}))
    return NextResponse.json(await salvarRespostas(auth.user.id, params.tentativaId, respostas))
  } catch (err) {
    return respostaDeErro(err, 'provas-salvar')
  }
}

/** DELETE — desistir da tentativa em andamento: ela some, sem ir para o histórico. Entregue: 409. */
export async function DELETE(req: NextRequest, { params }: { params: { tentativaId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json(await descartarTentativa(auth.user.id, params.tentativaId))
  } catch (err) {
    return respostaDeErro(err, 'provas-descartar')
  }
}
