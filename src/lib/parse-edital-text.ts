/**
 * Parser PURO JS pra texto de edital de concurso.
 * Sem IA. Roda no browser. Testável.
 *
 * Suporta DOIS formatos misturáveis:
 *
 * ┌─ FORMATO MARKDOWN (estruturado) ─────────────────────────┐
 * │ ## Direito Constitucional                                │
 * │ 1. Princípios Fundamentais                                │
 * │ 2. Direitos                                               │
 * │ 2.1. Individuais                                          │
 * │ - bullet também vira tópico                               │
 * └──────────────────────────────────────────────────────────┘
 *
 * ┌─ FORMATO EDITAL CRU (cola direto do PDF) ────────────────┐
 * │ CARGO 1: DELEGADO DE POLÍCIA FEDERAL                      │
 * │ DIREITO ADMINISTRATIVO: 1 Introdução. 1.1 Princípios.     │
 * │ 1.2 Conceito. 2 Atos administrativos. 2.1 Tipos.          │
 * │ DIREITO CONSTITUCIONAL: 1 Conceito. 2 Estado.             │
 * │ CARGO 2: ESCRIVÃO                                          │
 * │ LÍNGUA PORTUGUESA: 1 Gramática. 2 Texto.                  │
 * └──────────────────────────────────────────────────────────┘
 *
 * Retorna lista de CARGOS — cada cargo tem suas matérias.
 * Se não houver marcador CARGO, retorna 1 cargo com nome=null
 * (compatibilidade com formato antigo).
 */

export type Subtopico = { nome: string; ordem: number; subtopicos?: Subtopico[] }
export type Topico = { nome: string; ordem: number; subtopicos?: Subtopico[] }
export type Materia = { nome: string; ordem: number; topicos: Topico[] }

export type CargoBlock = { nome: string | null; materias: Materia[] }
export type ParseError = { line: number; text: string; message: string }
export type ParseResult = { cargos: CargoBlock[]; warnings: ParseError[] }

const RE_MATERIA_HASH = /^##\s+(.+?)\s*$/
const RE_MATERIA_BOLD = /^\*\*([^*]+)\*\*\s*$/
const RE_MATERIA_LABEL = /^mat[ée]ria\s*:\s*(.+)$/i
const RE_TOPIC_NUMBER = /^(\d+(?:\.\d+)*)\.?\)?\s+(.+?)\s*$/
const RE_TOPIC_BULLET = /^[-*•]\s+(.+?)\s*$/

// CARGO N: NOME — separador de cargos no formato cru
const RE_CARGO = /^\s*\(?\s*CARGO\s+(\d+)\s*:\s*(.+?)\s*\)?\s*$/i

// MATÉRIA: ... (inline, formato cru) — nome em UPPERCASE com pontuações leves
// Aceita "DIREITO CIVIL:" e também variantes como "Direito Civil:" se a linha estiver isolada
const RE_INLINE_MATERIA_HEADER =
  /^([A-ZÀÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇA-Za-zÀ-ÿ][\s\-A-ZÀÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇA-Za-zÀ-ÿ\/]+):\s*(.*)$/

// Tokenizer pra extrair tópicos numerados de texto inline.
// Match: número (com ou sem subnúmeros), seguido de espaço e texto começando em maiúscula.
// Lookbehind: precedido de início, ponto+espaço, ou apenas espaço (não dígito).
const RE_INLINE_TOPIC =
  /(?:^|(?<=[.)\s]))(\d+(?:\.\d+)*)\s+(?=[A-ZÀ-ÿ])/g

function isBlank(line: string): boolean {
  return line.trim().length === 0
}

function isComment(line: string): boolean {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('#ignorar')
}

function tryParseMateriaMd(line: string): string | null {
  const t = line.trim()
  let m
  if ((m = t.match(RE_MATERIA_HASH))) return m[1].trim()
  if ((m = t.match(RE_MATERIA_BOLD))) return m[1].trim()
  if ((m = t.match(RE_MATERIA_LABEL))) return m[1].trim()
  return null
}

function tryParseTopicoMd(line: string): { nome: string; depth: number } | null {
  const t = line.trim()
  let m
  if ((m = t.match(RE_TOPIC_NUMBER))) {
    const numericPath = m[1]
    const depth = (numericPath.match(/\./g) ?? []).length
    return { nome: m[2].trim(), depth }
  }
  if ((m = t.match(RE_TOPIC_BULLET))) {
    const indentMatch = line.match(/^(\s*)/)
    const tabsCount = (indentMatch?.[1] ?? '').split('\t').length - 1
    const spaces = (indentMatch?.[1] ?? '').length - tabsCount
    const depth = Math.min(2, tabsCount + Math.floor(spaces / 2))
    return { nome: m[1].trim(), depth }
  }
  return null
}

function titleCase(s: string): string {
  // "DIREITO ADMINISTRATIVO" → "Direito Administrativo"
  // Preserva palavras pequenas em minúsculas (E, DE, DA, DO, DOS, EM, COM)
  const lower = new Set(['e', 'de', 'da', 'do', 'dos', 'das', 'em', 'com', 'no', 'na', 'nos', 'nas', 'a', 'o', 'as', 'os'])
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      if (i > 0 && lower.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

/**
 * Parse texto inline tipo "1 Conceito. 1.1 Princípios. 2 Tipos. 2.1 X."
 * Retorna lista de tópicos com hierarquia preservada.
 */
function parseInlineTopics(body: string): Topico[] {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (!flat) return []

  // Encontra todas as posições onde um tópico começa
  const positions: Array<{ start: number; markerEnd: number; numeric: string }> = []
  let match: RegExpExecArray | null
  RE_INLINE_TOPIC.lastIndex = 0
  while ((match = RE_INLINE_TOPIC.exec(flat)) !== null) {
    // match[0] inclui o número; queremos saber onde o NÚMERO começa e termina
    const numeric = match[1]
    const markerStart = match.index + match[0].indexOf(numeric)
    const markerEnd = markerStart + numeric.length
    positions.push({ start: markerStart, markerEnd, numeric })
  }

  if (positions.length === 0) {
    // Sem números reconhecíveis — devolve o texto inteiro como 1 tópico
    return [{ nome: flat.replace(/\.$/, '').trim(), ordem: 0, subtopicos: [] }]
  }

  // Constrói array linear { numeric, text }
  const flat_topics: Array<{ numeric: string; text: string }> = []
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]
    const nextStart = i + 1 < positions.length ? positions[i + 1].start : flat.length
    const raw = flat.slice(p.markerEnd, nextStart).trim()
    // remove ponto final se for sentence-end
    const text = raw.replace(/\.\s*$/, '').trim()
    if (text) flat_topics.push({ numeric: p.numeric, text })
  }

  // Agora monta hierarquia pela contagem de pontos no numeric
  const topicos: Topico[] = []
  const stack: Array<Topico | Subtopico> = []
  for (const ft of flat_topics) {
    const depth = (ft.numeric.match(/\./g) ?? []).length
    const node: Subtopico = { nome: ft.text, ordem: 0, subtopicos: [] }
    if (depth === 0) {
      node.ordem = topicos.length
      topicos.push(node as Topico)
      stack[0] = node
      stack.length = 1
    } else {
      const parent = stack[depth - 1]
      if (!parent) {
        // pai não existe — promove pra raiz
        node.ordem = topicos.length
        topicos.push(node as Topico)
        stack[0] = node
        stack.length = 1
      } else {
        if (!parent.subtopicos) parent.subtopicos = []
        node.ordem = parent.subtopicos.length
        parent.subtopicos.push(node)
        stack[depth] = node
        stack.length = depth + 1
      }
    }
  }
  return topicos
}

/**
 * Tenta interpretar uma linha como header de matéria inline (UPPERCASE: conteúdo).
 * Não casa com nada que seja apenas "1. algo" ou contenha muitos números.
 */
function tryParseInlineMateriaHeader(line: string): { nome: string; rest: string } | null {
  const t = line.trim()
  if (t.length === 0) return null
  // Header tem que ter ":" e o que vem antes não pode começar com dígito
  const colonIdx = t.indexOf(':')
  if (colonIdx <= 0) return null
  const head = t.slice(0, colonIdx).trim()
  const rest = t.slice(colonIdx + 1).trim()
  if (/^\d/.test(head)) return null
  // head precisa ter palavras válidas (alguma letra)
  if (!/[A-Za-zÀ-ÿ]/.test(head)) return null
  // Rejeita se head é longo demais (provavelmente não é título de matéria)
  if (head.length > 120) return null
  // Heurística: é UPPERCASE-dominante? Se a maioria das letras é maiúscula, é matéria
  const letters = head.match(/[A-Za-zÀ-ÿ]/g) ?? []
  const upper = head.match(/[A-ZÀÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇ]/g) ?? []
  const ratio = letters.length > 0 ? upper.length / letters.length : 0
  // Aceita se >= 60% upper OU se a linha começa com palavra capitalizada e tem ":"
  // mas também — se vem direto seguido de "1 Texto" então provavelmente é header
  const looksLikeMateriaHeader = ratio >= 0.6 || /^\s*\d+\s+[A-ZÀ-ÿ]/.test(rest)
  if (!looksLikeMateriaHeader) return null
  return { nome: titleCase(head), rest }
}

export function parseEditalText(text: string): ParseResult {
  const warnings: ParseError[] = []
  const lines = text.split(/\r?\n/)

  // ── 1. Detecta blocos de CARGO ──────────────────────────────────────
  type Block = { cargoNome: string | null; lineStart: number; lineEnd: number }
  const cargoBlocks: Block[] = []
  let currentBlock: Block | null = null

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(RE_CARGO)
    if (m) {
      if (currentBlock) {
        currentBlock.lineEnd = i
        cargoBlocks.push(currentBlock)
      }
      currentBlock = { cargoNome: titleCase(m[2].trim()), lineStart: i + 1, lineEnd: lines.length }
    }
  }
  if (currentBlock) {
    cargoBlocks.push(currentBlock)
  }
  if (cargoBlocks.length === 0) {
    cargoBlocks.push({ cargoNome: null, lineStart: 0, lineEnd: lines.length })
  }

  // ── 2. Pra cada bloco, identifica matérias ───────────────────────────
  const cargos: CargoBlock[] = []
  for (const block of cargoBlocks) {
    const materias: Materia[] = []
    let currentMateria: Materia | null = null
    let inlineMateriaContent: string[] = []
    let inlineMateriaActive = false
    let topicoOrder = 0
    let stack: Array<Topico | Subtopico> = []

    const flushInlineMateria = () => {
      if (currentMateria && inlineMateriaActive && inlineMateriaContent.length > 0) {
        const body = inlineMateriaContent.join(' ')
        const topicos = parseInlineTopics(body)
        // Se já tem tópicos via formato MD, anexa; senão usa os inline
        if (currentMateria.topicos.length === 0) {
          currentMateria.topicos = topicos
        } else {
          // adiciona após os existentes
          for (const t of topicos) {
            t.ordem = currentMateria.topicos.length
            currentMateria.topicos.push(t)
          }
        }
        inlineMateriaContent = []
        inlineMateriaActive = false
      }
    }

    for (let i = block.lineStart; i < block.lineEnd; i++) {
      const line = lines[i]
      if (isBlank(line) || isComment(line)) continue
      // Pula linha de cargo (se houver dentro do range — não deveria)
      if (line.match(RE_CARGO)) continue

      // Tenta como matéria markdown (## Nome / **Nome** / Matéria: Nome)
      const mdMateria = tryParseMateriaMd(line)
      if (mdMateria) {
        flushInlineMateria()
        currentMateria = { nome: mdMateria, ordem: materias.length, topicos: [] }
        materias.push(currentMateria)
        topicoOrder = 0
        stack = []
        continue
      }

      // Tenta como header inline (DIREITO ADMINISTRATIVO: 1 ...)
      const inlineHeader = tryParseInlineMateriaHeader(line)
      if (inlineHeader) {
        flushInlineMateria()
        currentMateria = { nome: inlineHeader.nome, ordem: materias.length, topicos: [] }
        materias.push(currentMateria)
        topicoOrder = 0
        stack = []
        inlineMateriaActive = true
        if (inlineHeader.rest) inlineMateriaContent.push(inlineHeader.rest)
        continue
      }

      // Se estamos no meio de matéria inline, acumula a linha
      if (inlineMateriaActive && currentMateria) {
        inlineMateriaContent.push(line.trim())
        continue
      }

      // Tenta como tópico markdown
      const mdTopico = tryParseTopicoMd(line)
      if (mdTopico) {
        if (!currentMateria) {
          warnings.push({
            line: i + 1,
            text: line.slice(0, 80),
            message: 'Tópico antes de qualquer matéria — ignorado.',
          })
          continue
        }
        const node: Subtopico = { nome: mdTopico.nome, ordem: 0, subtopicos: [] }
        if (mdTopico.depth === 0) {
          node.ordem = topicoOrder++
          currentMateria.topicos.push(node as Topico)
          stack = [node]
        } else {
          const parent = stack[mdTopico.depth - 1]
          if (!parent) {
            warnings.push({
              line: i + 1,
              text: line.slice(0, 80),
              message: `Subtópico nível ${mdTopico.depth + 1} sem pai. Promovido pra raiz.`,
            })
            node.ordem = topicoOrder++
            currentMateria.topicos.push(node as Topico)
            stack = [node]
          } else {
            if (!parent.subtopicos) parent.subtopicos = []
            node.ordem = parent.subtopicos.length
            parent.subtopicos.push(node)
            stack = stack.slice(0, mdTopico.depth)
            stack.push(node)
          }
        }
        continue
      }

      // Linha não-reconhecida
      warnings.push({
        line: i + 1,
        text: line.slice(0, 80),
        message: 'Linha não reconhecida — ignorada.',
      })
    }

    // Flush no final do bloco
    flushInlineMateria()

    cargos.push({ nome: block.cargoNome, materias })
  }

  return { cargos, warnings }
}

/**
 * Re-serializa um único cargo de volta pra texto (round-trip). Útil pra preview.
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
