import { NextRequest, NextResponse } from 'next/server'
import { exigirTokenCron } from '@/lib/cron-auth'
import { indexarLote, estadoIndexacao } from '@/lib/rag/indexar'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/rag-index — indexação incremental dos materiais, sem ninguém clicar.
 *
 * Roda todo dia (vercel.json) e indexa o que estiver pendente: material novo
 * cadastrado pelo admin entra na busca do mentor no dia seguinte, sem passo
 * manual. Também é o jeito de indexar a base inicial — chamar até `remaining`
 * zerar.
 *
 * Trabalha por orçamento de tempo, não por quantidade: processa lotes até
 * chegar perto do teto da função (60 s no plano Hobby) e para com folga.
 * Parar no meio não perde nada — a gravação é UPSERT e o que ficou pendente
 * entra na próxima execução.
 */
const ORCAMENTO_MS = 45_000

export async function GET(req: NextRequest) {
  const negado = exigirTokenCron(req)
  if (negado) return negado

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: 'Sem chave de embedding (GEMINI_API_KEY).' }, { status: 503 })
  }

  const inicio = Date.now()
  let processados = 0
  let chunksGravados = 0
  let remaining = 0
  const pulados: string[] = []

  do {
    const r = await indexarLote({ batch: 5 })
    processados += r.processados
    chunksGravados += r.chunksGravados
    remaining = r.remaining
    pulados.push(...r.detalhe.filter((d) => d.skipped).map((d) => d.title))
    if (r.processados === 0) break
  } while (remaining > 0 && Date.now() - inicio < ORCAMENTO_MS)

  return NextResponse.json({
    processados,
    chunksGravados,
    remaining,
    pulados,
    duracaoMs: Date.now() - inicio,
    estado: await estadoIndexacao(),
  })
}
