import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { chunkMaterial, embeddingText, estimateTokens } from './chunk'
import { embedTexts, embeddingModelEmUso } from './embed'

/**
 * Indexação dos materiais para a busca semântica — o núcleo, sem HTTP.
 *
 * Usado pela rota de admin (um lote por clique) e pelo cron (vários lotes até
 * acabar o tempo). Antes vivia dentro da rota de admin, e o cron não tinha
 * como reaproveitar.
 *
 * DOIS DEFEITOS QUE A VERSÃO ANTERIOR TINHA:
 *
 * 1. Travamento. A busca pegava os N materiais mais antigos sem trecho
 *    indexado. Material sem texto aproveitável era pulado sem gravar nada — e
 *    continuava "pendente". Com N deles no começo da fila, toda chamada pegava
 *    os mesmos, pulava todos, e a indexação nunca avançava; `remaining` nunca
 *    zerava. Agora o material pulado ganha uma LÁPIDE: uma linha com
 *    `embedding` nulo, que marca "já processado" e que a busca ignora (ela
 *    filtra `embedding IS NOT NULL`).
 *
 * 2. Filtro sobrescrito. `{ ...{id: X}, ...{id: {notIn: [...]}} }` — o segundo
 *    spread substituía o primeiro, então pedir um material específico indexava
 *    outro qualquer. Agora as duas condições vão num AND.
 */

export type ItemRelatorio = { materialId: string; title: string; chunks: number; skipped?: string }
export type ResultadoLote = { processados: number; chunksGravados: number; remaining: number; detalhe: ItemRelatorio[] }

async function idsJaIndexados(): Promise<string[]> {
  const linhas = await prisma.materialChunk.findMany({ select: { materialId: true }, distinct: ['materialId'] })
  return linhas.map((l) => l.materialId)
}

export async function indexarLote(opts: { batch: number; materialId?: string; force?: boolean }): Promise<ResultadoLote> {
  const jaIndexados = opts.force ? [] : await idsJaIndexados()

  const filtros: object[] = [{ active: true }, { content: { not: null } }]
  if (opts.materialId) filtros.push({ id: opts.materialId })
  if (jaIndexados.length) filtros.push({ id: { notIn: jaIndexados } })

  const materiais = await prisma.material.findMany({
    where: { AND: filtros },
    select: { id: true, title: true, content: true, topicId: true, subjectId: true },
    take: opts.batch,
    orderBy: { createdAt: 'asc' },
  })

  const detalhe: ItemRelatorio[] = []
  let chunksGravados = 0

  for (const mat of materiais) {
    const chunks = chunkMaterial(mat.content)

    if (!chunks.length) {
      // Sem texto aproveitável, não pode sobrar trecho antigo na busca (o
      // material pode ter tido conteúdo numa indexação anterior).
      await prisma.$executeRaw`DELETE FROM material_chunks WHERE "materialId" = ${mat.id}`
      // Lápide: marca como processado sem entrar na busca (embedding nulo).
      await prisma.$executeRaw`
        INSERT INTO material_chunks
          (id, "materialId", "topicId", "subjectId", "chunkIndex", heading, content, tokens, embedding, model)
        VALUES
          (${randomUUID()}, ${mat.id}, ${mat.topicId}, ${mat.subjectId}, 0, NULL, '', 0, NULL, 'lapide')
        ON CONFLICT ("materialId", "chunkIndex") DO NOTHING
      `
      detalhe.push({ materialId: mat.id, title: mat.title, chunks: 0, skipped: 'sem texto aproveitável' })
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
           ${vec}::vector, ${embeddingModelEmUso()})
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

    chunksGravados += chunks.length
    detalhe.push({ materialId: mat.id, title: mat.title, chunks: chunks.length })
  }

  const filtrosRestantes: object[] = [{ active: true }, { content: { not: null } }]
  if (jaIndexados.length) filtrosRestantes.push({ id: { notIn: jaIndexados } })
  const restantes = await prisma.material.count({ where: { AND: filtrosRestantes } })

  return {
    processados: materiais.length,
    chunksGravados,
    remaining: Math.max(restantes - materiais.length, 0),
    detalhe,
  }
}

export async function estadoIndexacao() {
  const [materiaisComTexto, chunks, comEmbedding, indexados] = await Promise.all([
    prisma.material.count({ where: { active: true, content: { not: null } } }),
    prisma.materialChunk.count(),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM material_chunks WHERE embedding IS NOT NULL
    `,
    idsJaIndexados(),
  ])
  return {
    materiaisComTexto,
    materiaisIndexados: indexados.length,
    materiaisPendentes: Math.max(materiaisComTexto - indexados.length, 0),
    chunks,
    chunksComEmbedding: Number(comEmbedding[0]?.count ?? 0),
    modelo: embeddingModelEmUso(),
  }
}
