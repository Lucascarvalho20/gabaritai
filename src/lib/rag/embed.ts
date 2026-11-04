/**
 * Geração de embeddings para busca semântica.
 *
 * DIMENSÃO É CONTRATO. Embedding é um vetor de tamanho fixo, e a coluna do
 * Postgres é declarada com um tamanho só — `vector(1536)`. Indexar um trecho com
 * um modelo e consultar com outro de dimensão diferente não dá erro claro: dá
 * resultado sem sentido, ou a query falha no operador. Por isso tudo aqui
 * converge para 1536, e há uma checagem explícita antes de devolver.
 *
 * ORDEM DOS PROVEDORES. O Gemini vem primeiro porque tem cota gratuita e o
 * `gemini-embedding-001` aceita `outputDimensionality`, então consegue emitir
 * exatamente 1536. A OpenAI fica como reserva: o `text-embedding-3-small` também
 * dá 1536 nativamente, mas é pago.
 *
 * Trocar o modelo de um provedor obriga a reindexar tudo — vetores de modelos
 * diferentes não são comparáveis entre si, mesmo com a mesma dimensão. É por
 * isso que o nome do modelo fica gravado junto do vetor (coluna `model`).
 */

export const EMBEDDING_DIMS = 1536

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'

/** Lote. A API do Gemini aceita até 100 por chamada; 96 deixa folga. */
const BATCH_SIZE = 96

export class EmbeddingError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

/** Qual provedor será usado — serve para gravar na coluna `model`. */
export function embeddingModelEmUso(): string {
  if (process.env.GEMINI_API_KEY) return GEMINI_EMBEDDING_MODEL
  if (process.env.OPENAI_API_KEY) return OPENAI_EMBEDDING_MODEL
  return 'nenhum'
}

function conferirDimensao(vetores: number[][], provedor: string): number[][] {
  for (const v of vetores) {
    if (v.length !== EMBEDDING_DIMS) {
      throw new EmbeddingError(
        `${provedor} devolveu vetor de ${v.length} dimensões; a coluna espera ${EMBEDDING_DIMS}. ` +
          `Indexar assim corromperia a busca — abortado.`,
      )
    }
  }
  return vetores
}

// ─────────────────────────────── Gemini ────────────────────────────────────

async function embedComGemini(textos: string[], apiKey: string): Promise<number[][]> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: textos.map((t) => ({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: t }] },
        outputDimensionality: EMBEDDING_DIMS,
      })),
    }),
  })

  if (!res.ok) {
    const corpo = await res.text()
    throw new EmbeddingError(`Gemini embeddings ${res.status}: ${corpo.slice(0, 200)}`, res.status)
  }

  const json = (await res.json()) as { embeddings: Array<{ values: number[] }> }
  return conferirDimensao(json.embeddings.map((e) => e.values), 'Gemini')
}

// ─────────────────────────────── OpenAI ────────────────────────────────────

async function embedComOpenAI(textos: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input: textos }),
  })

  if (!res.ok) {
    const corpo = await res.text()
    throw new EmbeddingError(`OpenAI embeddings ${res.status}: ${corpo.slice(0, 200)}`, res.status)
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> }
  // A API não garante a ordem do retorno — reordena pelo índice.
  const ordenados = json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
  return conferirDimensao(ordenados, 'OpenAI')
}

// ─────────────────────────────── Público ───────────────────────────────────

/** 429 (cota) e 5xx são transitórios; vale repetir. 400 e 401 não. */
function valeRepetir(err: unknown): boolean {
  const s = err instanceof EmbeddingError ? err.status : undefined
  return s === 429 || (typeof s === 'number' && s >= 500)
}

async function umLote(textos: string[]): Promise<number[][]> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!geminiKey && !openaiKey) {
    throw new EmbeddingError(
      'Nenhuma chave de embedding configurada. Defina GEMINI_API_KEY (tem cota grátis) ' +
        'ou OPENAI_API_KEY.',
    )
  }

  let ultimoErro: unknown

  for (const tentar of [
    geminiKey ? () => embedComGemini(textos, geminiKey) : null,
    openaiKey ? () => embedComOpenAI(textos, openaiKey) : null,
  ].filter(Boolean) as Array<() => Promise<number[][]>>) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await tentar()
      } catch (err) {
        ultimoErro = err
        if (!valeRepetir(err)) break // erro definitivo: vai pro próximo provedor
        await new Promise((r) => setTimeout(r, 2 ** tentativa * 1000))
      }
    }
  }

  throw ultimoErro
}

/**
 * Gera embeddings para uma lista de textos, em lotes.
 * A ordem do retorno corresponde à ordem da entrada.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []

  const saida: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    saida.push(...(await umLote(texts.slice(i, i + BATCH_SIZE))))
  }
  return saida
}

/** Embedding de um texto só — a pergunta do usuário, na hora da busca. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text.slice(0, 8000)])
  if (!vec) throw new EmbeddingError('Falha ao gerar embedding da pergunta')
  return vec
}

/** Formato literal que o pgvector aceita em query parametrizada: '[0.1,0.2,...]' */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
