import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { indexarLote, estadoIndexacao } from '@/lib/rag/indexar'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/rag/backfill
 *
 * Indexa materiais para busca semântica: fatia o conteúdo, gera os embeddings e grava.
 *
 * Processa poucos materiais por chamada de propósito. Função serverless na Vercel tem
 * teto de execução, e indexar a base inteira de uma vez estoura o tempo e perde o
 * trabalho já feito. Então cada chamada processa um lote e devolve `remaining`:
 * o cliente chama de novo até zerar. Como a gravação é UPSERT por (materialId, chunkIndex),
 * repetir uma chamada é inofensivo.
 *
 * O cron /api/cron/rag-index faz o mesmo sozinho, todo dia — esta rota fica para
 * forçar uma reindexação na hora.
 *
 * Body (tudo opcional):
 *   { materialId?: string   // indexa só esse material
 *     batch?: number        // materiais por chamada (padrão 5, teto 20)
 *     force?: boolean }     // reindexa mesmo o que já tem chunk
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Nenhuma chave de embedding configurada (GEMINI_API_KEY ou OPENAI_API_KEY).' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  return NextResponse.json(await indexarLote({
    materialId: typeof body.materialId === 'string' ? body.materialId : undefined,
    force: body.force === true,
    batch: Math.min(Math.max(Number(body.batch) || 5, 1), 20),
  }))
}

/** GET — estado da indexação, pra acompanhar sem disparar nada. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  return NextResponse.json(await estadoIndexacao())
}
