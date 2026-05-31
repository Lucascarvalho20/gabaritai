import { prisma } from './prisma'
import crypto from 'crypto'

/**
 * Helpers pra cache de resumo por tópico — usado tanto pela geração IA
 * automática (em /api/sessao/[id]) quanto pelo admin que cola texto do
 * NotebookLM em /api/admin/topics/[topicId]/resumo.
 *
 * Por que essa centralização: a cache key é hash de (kind, subjectId, topicId,
 * bancaSlug). Como sessão.banca depende do edital do curso, e o admin pode
 * colar resumo "global" (sem banca específica), precisamos de funções que:
 *   - quando admin cola: salva pra TODAS bancas relevantes daquele tópico
 *   - quando aluno lê: tenta primeiro com sua banca, depois global (sem banca)
 */

export function buildTopicResumoCacheKey(input: {
  subjectId?: string | null
  topicId: string
  bancaSlug?: string | null
}): string {
  const parts = [
    'resumo',
    input.subjectId ?? '_',
    input.topicId,
    input.bancaSlug ?? '_',
    '',
  ]
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

/**
 * Salva resumo do admin (texto NotebookLM cru). Marca modelUsed='notebooklm'
 * pra distinguir de geração IA automática.
 *
 * Estratégia: salva 2 entradas — uma com bancaSlug específica (se passada) e
 * uma global (bancaSlug=null). Aluno de qualquer banca acha a global.
 */
export async function saveTopicResumoFromAdmin(opts: {
  topicId: string
  subjectId: string | null
  content: string
  bancaSlug?: string | null
}): Promise<{ cacheKeys: string[] }> {
  const cacheKeys: string[] = []

  // Sempre salva entrada global (sem banca) — é o que serve pra qualquer aluno
  const globalKey = buildTopicResumoCacheKey({
    subjectId: opts.subjectId,
    topicId: opts.topicId,
    bancaSlug: null,
  })
  await prisma.aIGenerationCache.upsert({
    where: { cacheKey: globalKey },
    create: {
      cacheKey: globalKey,
      kind: 'resumo',
      content: opts.content,
      modelUsed: 'notebooklm',
    },
    update: {
      content: opts.content,
      modelUsed: 'notebooklm',
      createdAt: new Date(),
    },
  })
  cacheKeys.push(globalKey)

  // Se admin marcou pra banca específica também, salva versão com banca
  if (opts.bancaSlug) {
    const bancaKey = buildTopicResumoCacheKey({
      subjectId: opts.subjectId,
      topicId: opts.topicId,
      bancaSlug: opts.bancaSlug,
    })
    await prisma.aIGenerationCache.upsert({
      where: { cacheKey: bancaKey },
      create: {
        cacheKey: bancaKey,
        kind: 'resumo',
        content: opts.content,
        modelUsed: 'notebooklm',
      },
      update: {
        content: opts.content,
        modelUsed: 'notebooklm',
        createdAt: new Date(),
      },
    })
    cacheKeys.push(bancaKey)
  }

  return { cacheKeys }
}

/**
 * Carrega o resumo do tópico — preferindo NotebookLM (admin), depois IA
 * gerada com banca específica, depois IA global.
 */
export async function getTopicResumo(opts: {
  topicId: string
  subjectId?: string | null
  bancaSlug?: string | null
}): Promise<{ content: string; source: 'notebooklm' | 'ai-banca' | 'ai-global' | null }> {
  // Prioridade 1: tem versão com banca específica
  if (opts.bancaSlug) {
    const bancaKey = buildTopicResumoCacheKey({
      subjectId: opts.subjectId,
      topicId: opts.topicId,
      bancaSlug: opts.bancaSlug,
    })
    const cached = await prisma.aIGenerationCache.findUnique({ where: { cacheKey: bancaKey } })
    if (cached?.content) {
      return {
        content: String(cached.content),
        source: cached.modelUsed === 'notebooklm' ? 'notebooklm' : 'ai-banca',
      }
    }
  }
  // Prioridade 2: versão global
  const globalKey = buildTopicResumoCacheKey({
    subjectId: opts.subjectId,
    topicId: opts.topicId,
    bancaSlug: null,
  })
  const cachedGlobal = await prisma.aIGenerationCache.findUnique({ where: { cacheKey: globalKey } })
  if (cachedGlobal?.content) {
    return {
      content: String(cachedGlobal.content),
      source: cachedGlobal.modelUsed === 'notebooklm' ? 'notebooklm' : 'ai-global',
    }
  }
  return { content: '', source: null }
}

export async function deleteTopicResumo(opts: {
  topicId: string
  subjectId?: string | null
  bancaSlug?: string | null
}): Promise<{ deleted: number }> {
  const keys: string[] = []
  if (opts.bancaSlug) {
    keys.push(buildTopicResumoCacheKey({
      subjectId: opts.subjectId,
      topicId: opts.topicId,
      bancaSlug: opts.bancaSlug,
    }))
  }
  keys.push(buildTopicResumoCacheKey({
    subjectId: opts.subjectId,
    topicId: opts.topicId,
    bancaSlug: null,
  }))
  const result = await prisma.aIGenerationCache.deleteMany({
    where: { cacheKey: { in: keys } },
  })
  return { deleted: result.count }
}
