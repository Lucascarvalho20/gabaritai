/**
 * Cache de geração IA pra reuso entre alunos.
 *
 * Estratégia:
 *  1. Gera cache key = hash(tipo + subject + topic + banca + extras)
 *  2. Procura no banco (AIGenerationCache)
 *  3. Se acha: incrementa hitCount + lastUsedAt, retorna
 *  4. Se não acha: chama IA, salva no cache, retorna
 *
 * Resultado prático:
 *  - Resumo de "Constitucional → Direitos Fundamentais" gerado UMA vez
 *  - 1000 alunos do mesmo curso usam o mesmo resumo (hitCount=1000)
 *  - Custo IA = $0.01 dividido por 1000 = praticamente zero
 */

import crypto from 'crypto'
import { prisma } from './prisma'
import { callAI, type AITask } from './ai-client'

export type CacheKind = 'resumo' | 'questao' | 'flashcard' | 'mapa_mental' | 'explicacao'

function buildCacheKey(opts: {
  kind: CacheKind
  subjectId?: string | null
  topicId?: string | null
  bancaSlug?: string | null
  extra?: string // diferenciador adicional (ex: "dificuldade:medium")
}): string {
  const parts = [
    opts.kind,
    opts.subjectId ?? '_',
    opts.topicId ?? '_',
    opts.bancaSlug ?? '_',
    opts.extra ?? '',
  ]
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

export async function generateOrFetchCached<T = any>(opts: {
  kind: CacheKind
  subjectId?: string | null
  topicId?: string | null
  bancaSlug?: string | null
  extra?: string
  prompt: string
  aiTask?: AITask
  maxTokens?: number
  temperature?: number
  parser?: (raw: string) => T
}): Promise<{ content: T; cached: boolean; cacheKey: string }> {
  const cacheKey = buildCacheKey(opts)

  // Procura no cache
  const cached = await prisma.aIGenerationCache.findUnique({ where: { cacheKey } })
  if (cached) {
    await prisma.aIGenerationCache.update({
      where: { cacheKey },
      data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
    })
    const content = cached.content as any
    const parsed = opts.parser ? opts.parser(JSON.stringify(content)) : (content as T)
    return { content: parsed, cached: true, cacheKey }
  }

  // Não tem — gera com IA
  const raw = await callAI(opts.prompt, {
    task: opts.aiTask ?? 'generate',
    maxTokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.5,
  })
  const content = (opts.parser ? opts.parser(raw) : raw) as T

  // Salva no cache
  await prisma.aIGenerationCache.create({
    data: {
      cacheKey,
      kind: opts.kind,
      subjectId: opts.subjectId ?? null,
      topicId: opts.topicId ?? null,
      bancaSlug: opts.bancaSlug ?? null,
      content: content as any,
    },
  }).catch((err) => {
    // Race condition: outro request acabou de salvar. Não-fatal.
    if (!String(err.message).includes('Unique constraint')) {
      console.warn('[ai-cache] save error:', err.message)
    }
  })

  return { content, cached: false, cacheKey }
}

/**
 * Limpeza do cache: remove entradas com 0 hits após 30 dias (não tão úteis).
 * Pra usar em cron mensal.
 */
export async function pruneCache(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const result = await prisma.aIGenerationCache.deleteMany({
    where: {
      hitCount: 0,
      createdAt: { lt: cutoff },
    },
  })
  return result.count
}

/**
 * Estatísticas do cache pra admin.
 */
export async function getCacheStats() {
  const [total, byKind] = await Promise.all([
    prisma.aIGenerationCache.count(),
    prisma.aIGenerationCache.groupBy({
      by: ['kind'],
      _count: { _all: true },
      _sum: { hitCount: true },
    }),
  ])
  return {
    totalEntries: total,
    byKind: byKind.map((b) => ({
      kind: b.kind,
      entries: b._count._all,
      totalHits: b._sum.hitCount ?? 0,
      avgHitsPerEntry: b._count._all > 0 ? Math.round((b._sum.hitCount ?? 0) / b._count._all) : 0,
    })),
  }
}
