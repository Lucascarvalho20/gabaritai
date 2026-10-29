import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'
import { chunkMaterial, embeddingText, estimateTokens } from '@/lib/rag/chunk'
import { embedTexts, EMBEDDING_MODEL } from '@/lib/rag/embed'

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
 * Body (tudo opcional):
 *   { materialId?: string   // indexa só esse material
 *     batch?: number        // materiais por chamada (padrão 5, teto 20)
 *     force?: boolean }     // reindexa mesmo o que já tem chunk
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurada — é ela que gera os embeddings.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const materialId: string | undefined = body.materialId
  const force: boolean = body.force === true
  const batch = Math.min(Math.max(Number(body.batch) || 5, 1), 20)

  // Materiais candidatos: têm texto e estão ativos.
  const jaIndexados = force
    ? []
    : (await prisma.materialChunk.findMany({
        select: { materialId: true },
        distinct: ['materialId'],
      })).map((c) => c.materialId)

  const materiais = await prisma.material.findMany({
    where: {
      active: true,
      content: { not: null },
      ...(materialId ? { id: materialId } : {}),
      ...(jaIndexados.length ? { id: { notIn: jaIndexados } } : {}),
    },
    select: { id: true, title: true, content: true, topicId: true, subjectId: true },
    take: batch,
    orderBy: { createdAt: 'asc' },
  })

  const relatorio: Array<{ materialId: string; title: string; chunks: number; skipped?: string }> = []
  let totalChunks = 0

  for (const mat of materiais) {
    const chunks = chunkMaterial(mat.content)

    if (!chunks.length) {
      relatorio.push({ materialId: mat.id, title: mat.title, chunks: 0, skipped: 'sem texto aproveitável' })
      continue
    }

    const vetores = await embedTexts(chunks.map((c) => embeddingText(c, mat.title)))

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      const vec = `[${vetores[i].join(',')}]`

      await prisma.$executeRaw`
        INSERT INTO material_chunks
          (id, "materialId", "topicId", "subjectId", "chunkIndex", heading, content, tokens, embedding, model)
        VALUES
          (${randomUUID()}, ${mat.id}, ${mat.topicId}, ${mat.subjectId}, ${c.index},
           ${c.heading ?? null}, ${c.content}, ${estimateTokens(c.content)},
           ${vec}::vector, ${EMBEDDING_MODEL})
        ON CONFLICT ("materialId", "chunkIndex") DO UPDATE SET
          heading   = EXCLUDED.heading,
          content   = EXCLUDED.content,
          tokens    = EXCLUDED.tokens,
          embedding = EXCLUDED.embedding,
          model     = EXCLUDED.model
      `
    }

    // Se o material encolheu desde a última indexação, sobram trechos órfãos
    // apontando para texto que não existe mais — a busca devolveria conteúdo fantasma.
    await prisma.$executeRaw`
      DELETE FROM material_chunks
      WHERE "materialId" = ${mat.id} AND "chunkIndex" >= ${chunks.length}
    `

    totalChunks += chunks.length
    relatorio.push({ materialId: mat.id, title: mat.title, chunks: chunks.length })
  }

  const restantes = await prisma.material.count({
    where: {
      active: true,
      content: { not: null },
      ...(jaIndexados.length ? { id: { notIn: jaIndexados } } : {}),
    },
  })

  return NextResponse.json({
    processados: materiais.length,
    chunksGravados: totalChunks,
    remaining: Math.max(restantes - materiais.length, 0),
    detalhe: relatorio,
  })
}

/** GET — estado da indexação, pra acompanhar sem disparar nada. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const [materiaisComTexto, chunks, comEmbedding] = await Promise.all([
    prisma.material.count({ where: { active: true, content: { not: null } } }),
    prisma.materialChunk.count(),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM material_chunks WHERE embedding IS NOT NULL
    `,
  ])

  const indexados = await prisma.materialChunk.findMany({
    select: { materialId: true },
    distinct: ['materialId'],
  })

  return NextResponse.json({
    materiaisComTexto,
    materiaisIndexados: indexados.length,
    materiaisPendentes: Math.max(materiaisComTexto - indexados.length, 0),
    chunks,
    chunksComEmbedding: Number(comEmbedding[0]?.count ?? 0),
    modelo: EMBEDDING_MODEL,
  })
}
