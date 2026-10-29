/**
 * Busca semântica sobre os materiais indexados.
 *
 * Usa pgvector com distância de cosseno (operador `<=>`). Os vetores da OpenAI já
 * vêm normalizados, então cosseno é a métrica correta aqui — e `similaridade = 1 - distância`.
 *
 * Por que ordenar pelo operador e não por uma coluna calculada: o índice HNSW só é
 * usado quando o ORDER BY é exatamente `embedding <=> $query`. Se ordenar por um
 * alias, o Postgres cai em varredura sequencial e a busca fica lenta conforme a base cresce.
 */

import { prisma } from '@/lib/prisma'
import { embedQuery, toVectorLiteral } from './embed'

export type RetrievedChunk = {
  id: string
  materialId: string
  materialTitle: string
  heading: string | null
  content: string
  similarity: number
}

/**
 * Abaixo disso o trecho não fala do que foi perguntado.
 * Injetar trecho irrelevante é pior que não injetar nada: o modelo tenta usar e inventa
 * uma ligação que não existe.
 */
export const MIN_SIMILARITY = 0.35

type SearchOpts = {
  /** Restringe ao tópico (ex.: o aluno está estudando "Prazos recursais"). */
  topicId?: string | null
  /** Restringe à matéria. Ignorado se topicId for informado. */
  subjectId?: string | null
  /** Quantos trechos retornar. Acima de ~6 o prompt incha sem ganho de precisão. */
  limit?: number
}

export async function searchMaterial(
  query: string,
  opts: SearchOpts = {},
): Promise<RetrievedChunk[]> {
  const { topicId = null, subjectId = null, limit = 5 } = opts

  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const vector = toVectorLiteral(await embedQuery(trimmed))

  // Busca mais que o necessário e corta pelo limiar depois: filtrar por similaridade
  // dentro do SQL impediria o uso do índice HNSW.
  const overfetch = Math.min(limit * 4, 40)

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      materialId: string
      materialTitle: string
      heading: string | null
      content: string
      distance: number
    }>
  >`
    SELECT
      c.id,
      c."materialId",
      m.title       AS "materialTitle",
      c.heading,
      c.content,
      (c.embedding <=> ${vector}::vector) AS distance
    FROM material_chunks c
    JOIN materials m ON m.id = c."materialId"
    WHERE c.embedding IS NOT NULL
      AND m.active = true
      AND (${topicId}::text   IS NULL OR c."topicId"   = ${topicId}::text)
      AND (${subjectId}::text IS NULL OR c."subjectId" = ${subjectId}::text)
    ORDER BY c.embedding <=> ${vector}::vector
    LIMIT ${overfetch}
  `

  return rows
    .map((r) => ({
      id: r.id,
      materialId: r.materialId,
      materialTitle: r.materialTitle,
      heading: r.heading,
      content: r.content,
      similarity: 1 - Number(r.distance),
    }))
    .filter((r) => r.similarity >= MIN_SIMILARITY)
    .slice(0, limit)
}

/**
 * Monta o bloco de contexto que entra no prompt do mentor.
 *
 * Cada trecho vai numerado para que o modelo possa citar a fonte ("segundo o trecho [2]").
 * A instrução de admitir desconhecimento é deliberada: sem ela o modelo preenche a
 * lacuna com conhecimento genérico e o aluno não tem como saber o que veio do material
 * do curso e o que o modelo inventou.
 */
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return ''

  const trechos = chunks
    .map((c, i) => {
      const titulo = c.heading ? `${c.materialTitle} — ${c.heading}` : c.materialTitle
      return `[${i + 1}] ${titulo}\n${c.content}`
    })
    .join('\n\n---\n\n')

  return [
    'CONTEÚDO DO CURSO (use como fonte primária):',
    '',
    trechos,
    '',
    'Instruções sobre este conteúdo:',
    '- Responda preferencialmente com base nos trechos acima e cite o número, ex.: [2].',
    '- Se os trechos não cobrirem a pergunta, diga isso de forma explícita antes de',
    '  complementar com conhecimento geral — o aluno precisa saber o que é material',
    '  do curso e o que não é.',
    '- Nunca atribua aos trechos algo que eles não dizem.',
  ].join('\n')
}
