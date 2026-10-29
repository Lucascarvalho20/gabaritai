/**
 * Geração de embeddings para busca semântica.
 *
 * ATENÇÃO — aqui NÃO existe fallback entre provedores, ao contrário do ai-client.
 *
 * Embedding é um vetor de dimensão fixa, e cada modelo usa a sua: o
 * text-embedding-3-small da OpenAI gera 1536 dimensões, o text-embedding-004 do
 * Google gera 768. Vetores de dimensões diferentes não são comparáveis, e a coluna
 * do Postgres é declarada com uma dimensão só. Se um trecho fosse indexado com um
 * provedor e a pergunta do usuário com outro, a query falharia — ou, pior, devolveria
 * resultado sem sentido.
 *
 * Então o provedor é fixo. Trocar de modelo exige reindexar a base inteira, e é por
 * isso que o nome do modelo fica gravado junto do vetor (coluna `model`).
 */

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMS = 1536

/** A API da OpenAI aceita lote; 96 é um meio-termo seguro entre custo de rede e payload. */
const BATCH_SIZE = 96

export class EmbeddingError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

async function postEmbeddings(input: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new EmbeddingError(`OpenAI embeddings ${res.status}: ${body.slice(0, 200)}`, res.status)
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> }
  // A API não garante ordem de retorno — reordena pelo índice antes de devolver.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

/** Espera com backoff exponencial. Rate limit (429) e erro de servidor são transitórios. */
function shouldRetry(err: unknown): boolean {
  const s = err instanceof EmbeddingError ? err.status : undefined
  return s === 429 || (typeof s === 'number' && s >= 500)
}

/**
 * Gera embeddings para uma lista de textos, em lotes e com retry.
 * A ordem do retorno corresponde à ordem da entrada.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new EmbeddingError(
      'OPENAI_API_KEY não configurada — necessária para indexar e buscar material (RAG).',
    )
  }
  if (!texts.length) return []

  const out: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    let lastErr: unknown
    let ok = false

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        out.push(...(await postEmbeddings(batch, apiKey)))
        ok = true
        break
      } catch (err) {
        lastErr = err
        if (!shouldRetry(err) || attempt === 3) break
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
      }
    }

    if (!ok) throw lastErr
  }

  return out
}

/** Embedding de um texto só — usado para a pergunta do usuário na hora da busca. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text.slice(0, 8000)])
  if (!vec) throw new EmbeddingError('Falha ao gerar embedding da pergunta')
  return vec
}

/** Formato literal que o pgvector aceita em query parametrizada: '[0.1,0.2,...]' */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
