/**
 * Parser PURO JS pra texto estruturado de matérias+tópicos.
 * Sem IA. Roda no browser. Testável.
 *
 * Aceita várias variantes — seja generoso na entrada, estrito na saída.
 *
 * Marcadores de MATÉRIA (case-insensitive):
 *   ## Nome
 *   # Nome
 *   **Nome**            ← negrito markdown
 *   MATÉRIA: Nome
 *   1. Nome             ← se for ROOT-level numerado, pode ser matéria
 *                          (heurística: linha não-indentada com numeração simples e poucas palavras)
 *
 * Marcadores de TÓPICO (dentro de matéria):
 *   1. Nome / 1) Nome
 *   - Nome / * Nome / • Nome
 *   1.1. Nome           ← subtópico (1 nível abaixo)
 *   1.1.1. Nome         ← subsubtópico
 *
 * Comentários:
 *   //   ou   #ignorar  ← ignorados
 *
 * Retorna:
 *   Materia[] com hierarquia subtopicos preservada
 */

export type Subtopico = { nome: string; ordem: number; subtopicos?: Subtopico[] }
export type Topico = { nome: string; ordem: number; subtopicos?: Subtopico[] }
export type Materia = { nome: string; ordem: number; topicos: Topico[] }

export type ParseError = { line: number; text: string; message: string }
export type ParseResult = { materias: Materia[]; warnings: ParseError[] }

const RE_MATERIA_HASH = /^##\s+(.+?)\s*$/                  // ## Nome
const RE_MATERIA_BOLD = /^\*\*([^*]+)\*\*\s*$/             // **Nome**
const RE_MATERIA_LABEL = /^mat[ée]ria\s*:\s*(.+)$/i        // MATÉRIA: Nome
const RE_TOPIC_NUMBER = /^(\d+(?:\.\d+)*)\.?\)?\s+(.+?)\s*$/  // 1. ou 1) ou 1.1. ou 1.1.1.
const RE_TOPIC_BULLET = /^[-*•]\s+(.+?)\s*$/               // - Nome  /  * Nome  / • Nome

function isBlank(line: string): boolean {
  return line.trim().length === 0
}

function isComment(line: string): boolean {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('#ignorar')
}

/**
 * Tenta detectar matéria de várias formas.
 * Retorna o nome limpo ou null se a linha não for matéria.
 */
function tryParseMateria(line: string): string | null {
  const t = line.trim()
  let m
  if ((m = t.match(RE_MATERIA_HASH))) return m[1].trim()
  if ((m = t.match(RE_MATERIA_BOLD))) return m[1].trim()
  if ((m = t.match(RE_MATERIA_LABEL))) return m[1].trim()
  return null
}

/**
 * Detecta tópico: numerado ou com bullet.
 * Retorna { nome, depth, isHierarchical } onde:
 *  - depth = profundidade (0=tópico raiz, 1=subtópico, 2=subsubtópico)
 *    Para "1." → 0, para "1.1." → 1, para "1.1.1." → 2
 *  - isHierarchical = true se vier de "1.1." (informa que dotted path foi usado)
 */
function tryParseTopico(line: string): { nome: string; depth: number; isHierarchical: boolean } | null {
  const t = line.trim()
  let m
  if ((m = t.match(RE_TOPIC_NUMBER))) {
    const numericPath = m[1] // ex "1" ou "1.1" ou "1.1.1"
    const depth = (numericPath.match(/\./g) ?? []).length
    return { nome: m[2].trim(), depth, isHierarchical: depth > 0 }
  }
  if ((m = t.match(RE_TOPIC_BULLET))) {
    // Bullet com indentação? Conta espaços/tabs no início
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0
    // a cada 2 espaços ou 1 tab → 1 nível
    const tabsCount = (indentMatch?.[1] ?? '').split('\t').length - 1
    const spaces = (indentMatch?.[1] ?? '').length - tabsCount
    const depth = Math.min(2, tabsCount + Math.floor(spaces / 2))
    return { nome: m[1].trim(), depth, isHierarchical: depth > 0 }
  }
  return null
}

export function parseEditalText(text: string): ParseResult {
  const lines = text.split(/\r?\n/)
  const materias: Materia[] = []
  const warnings: ParseError[] = []
  let currentMateria: Materia | null = null
  let topicoOrder = 0
  // Pilha de tópicos por profundidade (índice = depth)
  // stack[0] = último tópico raiz; stack[1] = último subtópico do stack[0]; etc.
  let stack: Array<Topico | Subtopico> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isBlank(line) || isComment(line)) continue

    // 1. Matéria?
    const materiaNome = tryParseMateria(line)
    if (materiaNome) {
      currentMateria = {
        nome: materiaNome,
        ordem: materias.length,
        topicos: [],
      }
      materias.push(currentMateria)
      topicoOrder = 0
      stack = []
      continue
    }

    // 2. Tópico?
    const topico = tryParseTopico(line)
    if (topico) {
      if (!currentMateria) {
        warnings.push({
          line: i + 1,
          text: line,
          message: 'Tópico antes de qualquer matéria — ignorado. Use ## Nome pra abrir uma matéria.',
        })
        continue
      }

      const novoTopico: Subtopico = {
        nome: topico.nome,
        ordem: 0,
        subtopicos: [],
      }

      if (topico.depth === 0) {
        // tópico raiz
        novoTopico.ordem = topicoOrder++
        currentMateria.topicos.push(novoTopico as Topico)
        stack = [novoTopico]
      } else {
        // subtópico — anexar ao pai correto na pilha
        const parentDepth = topico.depth - 1
        const parent = stack[parentDepth]
        if (!parent) {
          // sem pai → trata como tópico raiz
          warnings.push({
            line: i + 1,
            text: line,
            message: `Subtópico nível ${topico.depth + 1} sem pai. Movido pra raiz.`,
          })
          novoTopico.ordem = topicoOrder++
          currentMateria.topicos.push(novoTopico as Topico)
          stack = [novoTopico]
        } else {
          if (!parent.subtopicos) parent.subtopicos = []
          novoTopico.ordem = parent.subtopicos.length
          parent.subtopicos.push(novoTopico)
          // atualiza pilha
          stack = stack.slice(0, topico.depth)
          stack.push(novoTopico)
        }
      }
      continue
    }

    // 3. Linha não-reconhecida — warning
    warnings.push({
      line: i + 1,
      text: line.slice(0, 80),
      message: 'Linha não reconhecida (não é matéria nem tópico). Ignorada.',
    })
  }

  return { materias, warnings }
}

/**
 * Re-serializa de volta pra texto (round-trip). Útil pra preview.
 */
export function serializeEditalText(materias: Materia[]): string {
  const out: string[] = []
  for (const m of materias) {
    out.push(`## ${m.nome}`)
    let counter = 1
    for (const t of m.topicos) {
      out.push(`${counter}. ${t.nome}`)
      if (t.subtopicos) {
        let sub = 1
        for (const s of t.subtopicos) {
          out.push(`${counter}.${sub}. ${s.nome}`)
          sub++
        }
      }
      counter++
    }
    out.push('')
  }
  return out.join('\n')
}
