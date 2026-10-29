/**
 * Fatiamento de material em trechos para busca semântica.
 *
 * Por que não cortar a cada N caracteres: o corte cego parte a frase no meio e
 * destrói o sentido do trecho. Um pedaço que começa em "...e, nesse caso, o prazo
 * é de 5 dias" não tem sujeito — o embedding dele vira ruído e a busca nunca acerta.
 *
 * A estratégia aqui é hierárquica: tenta quebrar primeiro onde o autor já quebrou
 * (título de seção), depois em parágrafo, e só corta na força bruta se um parágrafo
 * sozinho estourar o limite.
 *
 * A sobreposição entre trechos vizinhos existe porque a resposta a uma pergunta
 * costuma cair bem na fronteira entre dois pedaços. Repetir o fim do anterior no
 * começo do próximo custa pouco e evita perder justamente a frase que importava.
 */

/** ~800 tokens. Em português, 1 token ≈ 3,5 caracteres. */
export const MAX_CHARS = 2800
/** Sobreposição de ~15% entre trechos vizinhos. */
export const OVERLAP_CHARS = 420
/** Abaixo disso o trecho não tem contexto suficiente pra valer um embedding. */
export const MIN_CHARS = 180

export type Chunk = {
  content: string
  index: number
  /** Título da seção de onde o trecho saiu — vira prefixo no embedding. */
  heading?: string
}

/** Estimativa de tokens. Serve pra log e custo, não precisa ser exata. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/** Quebra em blocos de markdown por cabeçalho (##, ###...), preservando o título. */
function splitByHeading(text: string): Array<{ heading?: string; body: string }> {
  const lines = text.split('\n')
  const blocks: Array<{ heading?: string; body: string }> = []
  let heading: string | undefined
  let buffer: string[] = []

  const flush = () => {
    const body = buffer.join('\n').trim()
    if (body) blocks.push({ heading, body })
    buffer = []
  }

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m) {
      flush()
      heading = m[2].trim()
    } else {
      buffer.push(line)
    }
  }
  flush()

  return blocks.length ? blocks : [{ body: text.trim() }]
}

/** Último ponto final / quebra de parágrafo antes do limite — pra não cortar frase. */
function cutPoint(text: string, limit: number): number {
  if (text.length <= limit) return text.length
  const window = text.slice(0, limit)
  for (const sep of ['\n\n', '. ', '.\n', '; ', '\n']) {
    const i = window.lastIndexOf(sep)
    // só aceita se não cortar cedo demais (perderia metade do trecho)
    if (i > limit * 0.5) return i + sep.length
  }
  return limit
}

/** Fatia um bloco grande respeitando fronteira de frase, com sobreposição. */
function sliceWithOverlap(body: string, heading?: string): string[] {
  if (body.length <= MAX_CHARS) return [body]

  const out: string[] = []
  let start = 0

  while (start < body.length) {
    const rest = body.slice(start)
    const end = cutPoint(rest, MAX_CHARS)
    out.push(rest.slice(0, end).trim())

    if (start + end >= body.length) break
    // recua pra criar a sobreposição com o próximo trecho
    start += Math.max(end - OVERLAP_CHARS, 1)
  }

  return out.filter((c) => c.length >= MIN_CHARS)
}

/**
 * Fatia o conteúdo de um material em trechos prontos para embedding.
 * Retorna vazio se o material não tiver texto aproveitável.
 */
export function chunkMaterial(content: string | null | undefined): Chunk[] {
  if (!content) return []

  // Normaliza quebras e remove excesso de linhas em branco
  const clean = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length < MIN_CHARS) return []

  const chunks: Chunk[] = []
  let index = 0

  for (const block of splitByHeading(clean)) {
    for (const piece of sliceWithOverlap(block.body, block.heading)) {
      chunks.push({ content: piece, index: index++, heading: block.heading })
    }
  }

  return chunks
}

/**
 * Texto que de fato vai pro modelo de embedding.
 *
 * O título da seção entra como prefixo porque o trecho isolado muitas vezes não
 * diz do que está falando — "São 5 dias úteis contados da intimação" não informa
 * o assunto, mas "Prazos recursais — São 5 dias úteis..." informa.
 */
export function embeddingText(chunk: Chunk, materialTitle: string): string {
  const parts = [materialTitle]
  if (chunk.heading && chunk.heading !== materialTitle) parts.push(chunk.heading)
  parts.push(chunk.content)
  return parts.join('\n\n')
}
