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
// Aceita: "1. Texto", "1 Texto", "1) Texto", "1.1. Texto", "1.1 Texto".
// Lookbehind: precedido de início, ponto+espaço, ou espaço (não dígito).
// Lookahead: letra maiúscula ou acentuada (início do conteúdo do tópico).
const RE_INLINE_TOPIC =
  /(?:^|(?<=[.)\s]))(\d+(?:\.\d+)*)[.)]?\s+(?=[A-ZÀ-ÿ"'])/g

// Section markers que aparecem em editais mas NÃO são matérias.
// Quando encontrados, são ignorados (mas o texto depois deles continua sendo processado).
// Marcadores de seção que aparecem em editais e NÃO são matérias.
// Cuidado: "Conhecimentos Gerais" é matéria de verdade em muitos editais,
// então fica de fora. Aqui só os que NUNCA são matérias.
const SECTION_MARKERS = new Set([
  'CONHECIMENTOS BASICOS',
  'CONHECIMENTOS BÁSICOS',
  'CONHECIMENTOS ESPECIFICOS',
  'CONHECIMENTOS ESPECÍFICOS',
  'CONHECIMENTOS COMPLEMENTARES',
  'PROVA OBJETIVA',
  'PROVA DISCURSIVA',
  'CONTEUDO PROGRAMATICO',
  'CONTEÚDO PROGRAMÁTICO',
])

function normalizeForCompare(s: string): string {
  return s.trim().toUpperCase().replace(/[.:;,]/g, '').trim()
}

function isSectionMarker(name: string): boolean {
  return SECTION_MARKERS.has(normalizeForCompare(name))
}

/**
 * Pre-processa o texto pra quebrar matérias que vieram coladas numa linha só.
 *
 * Caso típico (cole direto do PDF de edital CESPE):
 *   LÍNGUA PORTUGUESA: 1 Compreensão. 2 Reescritura. INFORMÁTICA: 1 Conceitos.
 *   Lingua portuguesa: 1. Compreensão. ... 22. Redação Oficial. Realidade étnica, social: ...
 *
 * Vira:
 *   LÍNGUA PORTUGUESA: 1 Compreensão. 2 Reescritura.
 *   INFORMÁTICA: 1 Conceitos.
 *
 * Heurística atualizada (mais tolerante): depois de `. ` ou `; ` ou `) `, se vier
 * um header (3-80 chars, qualquer capitalização, sem dígitos no começo) seguido de `:`
 * e DEPOIS um número "1 " ou "1.", é matéria. Quebra inserindo \n antes dela.
 */
function preprocessSplitInlineMaterias(text: string): string {
  // Pattern: (fim-de-frase) + (HEADER 3-80 chars) + (: espaço) + lookahead "número texto"
  // Aceita qualquer capitalização — o que importa é o padrão "Algo: 1 ..."
  const pattern = /([.;)]\s+)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-/]{2,80}?)(:\s+)(?=\d+[.)\s])/g
  return text.replace(pattern, (match, before, header, after) => {
    const letters = header.match(/[A-Za-zÀ-ÿ]/g) ?? []
    if (letters.length < 3) return match
    // Rejeita se o header parece frase normal (muitos espaços, muito longo)
    const wordCount = header.trim().split(/\s+/).length
    if (wordCount > 8) return match
    return `${before.trimEnd()}\n${header}${after}`
  })
}

/**
 * Pre-processa: junta linhas quebradas pelo word-wrap do PDF.
 * Uma matéria longa pode aparecer assim quando colada:
 *
 *   Lingua portuguesa: 1. Compreensão e interpretação de texto. 2. Tipologia.
 *   3. Figuras de linguagem. 4. Significação de palavras e expressões.
 *   5. Relações de sinonimia...
 *
 * O parser velho via "4. Significação" como tópico solto, sem matéria.
 * Solução: juntar linhas que começam com número (1-99) num único parágrafo
 * com a linha anterior, até bater linha em branco OU header explícito.
 */
function preprocessJoinWrappedLines(text: string): string {
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    // Linha em branco → mantém quebra (separador de blocos)
    if (trimmed === '') {
      out.push(line)
      continue
    }
    // Linha começando com marcadores especiais → não junta
    if (
      /^(##|\*\*|CARGO\s+\d|mat[ée]ria\s*:|[-*•])/i.test(trimmed) ||
      /^\(CARGO\s+\d/i.test(trimmed)
    ) {
      out.push(line)
      continue
    }
    // Linha começando com "1. " ou "1." ou "1) " → é continuação de parágrafo
    // anterior (lista numerada wrapped)
    const isNumericContinuation = /^\d+(\.\d+)*[.)\s]/.test(trimmed)
    // OU continuação textual: começa com minúscula e anterior não termina em
    // sentinel que sugere fim de bloco (anterior não termina em `:` solto)
    const startsWithLowerOrParen = /^[a-zà-ÿ(]/.test(trimmed)
    let isTextContinuation = false
    if (startsWithLowerOrParen && out.length > 0) {
      const prev = out[out.length - 1].trim()
      // anterior precisa ter conteúdo e não terminar como header standalone
      if (prev !== '' && !/^(##|\*\*|CARGO\s+\d|mat[ée]ria\s*:)/i.test(prev)) {
        isTextContinuation = true
      }
    }
    if ((isNumericContinuation || isTextContinuation) && out.length > 0) {
      const prevIdx = out.length - 1
      const prev = out[prevIdx]
      if (prev.trim() !== '') {
        out[prevIdx] = prev.replace(/\s+$/, '') + ' ' + trimmed
        continue
      }
    }
    out.push(line)
  }
  return out.join('\n')
}

/**
 * Pre-processa: detecta matérias em UPPERCASE numa linha sozinha (sem `:`),
 * seguidas de uma linha numerada → trata como matéria.
 *
 * Ex:
 *   DIREITO ADMINISTRATIVO
 *   1 Introdução
 *   1.1 Princípios
 *
 * Vira marcado:
 *   ## Direito Administrativo
 *   1 Introdução
 *   1.1 Princípios
 */
function preprocessUppercaseTitles(text: string): string {
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Linha curta (3-80 chars) MAIÚSCULA dominante, sem `:` no final,
    // sem números no início, e próxima linha não-branca começa com número.
    const hasColon = trimmed.endsWith(':')
    const startsWithDigit = /^\d/.test(trimmed)
    const isPlainText = trimmed.length >= 3 && trimmed.length <= 80
    if (!isPlainText || hasColon || startsWithDigit) {
      out.push(line)
      continue
    }
    const letters = trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? []
    const upper = trimmed.match(/[A-ZÀÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇ]/g) ?? []
    const ratio = letters.length > 0 ? upper.length / letters.length : 0
    if (ratio < 0.7 || letters.length < 3) {
      out.push(line)
      continue
    }
    // Próxima linha não-branca tem que começar com número
    let nextIdx = i + 1
    while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++
    if (nextIdx >= lines.length) {
      out.push(line)
      continue
    }
    const nextTrim = lines[nextIdx].trim()
    if (!/^\d/.test(nextTrim) && !/^[-*•]/.test(nextTrim)) {
      out.push(line)
      continue
    }
    // É matéria — convert pra formato markdown `## Nome`
    out.push(`## ${titleCase(trimmed)}`)
  }
  return out.join('\n')
}

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
    // match[0] inclui número + opcional `.`/`)` + espaços (até a letra do conteúdo)
    const numeric = match[1]
    const markerStart = match.index + match[0].indexOf(numeric)
    // markerEnd vai até o FIM do match completo (depois do número + pontuação + espaço)
    const markerEnd = match.index + match[0].length
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
 * Tenta interpretar uma linha como header de matéria inline ("Algo: conteúdo").
 *
 * Aceita QUALQUER capitalização ("Lingua portuguesa:", "LÍNGUA PORTUGUESA:", "Direito Penal:")
 * desde que:
 *  - O head tem 3-120 chars e contém letras
 *  - O rest começa com um número de tópico ("1 ", "1.", "1)") OU é UPPERCASE-dominante
 *  - O head tem no máx 8 palavras (matérias de concurso raramente são frases longas)
 */
function tryParseInlineMateriaHeader(line: string): { nome: string; rest: string } | null {
  const t = line.trim()
  if (t.length === 0) return null
  const colonIdx = t.indexOf(':')
  if (colonIdx <= 0) return null
  const head = t.slice(0, colonIdx).trim()
  const rest = t.slice(colonIdx + 1).trim()
  if (/^\d/.test(head)) return null
  if (!/[A-Za-zÀ-ÿ]/.test(head)) return null
  if (head.length < 3 || head.length > 200) return null
  const wordCount = head.split(/\s+/).length

  // Critério 1: rest começa com tópico numerado ("1 ", "1.", "1)") — sinal FORTE
  // Aceita até 20 palavras no head (matérias longas tipo "Realidade étnica, social...")
  const startsWithNumberedTopic = /^\d+(\.\d+)*[.)\s]/.test(rest)
  if (startsWithNumberedTopic && wordCount <= 20) return { nome: cleanMateriaName(head), rest }

  // Headers maiores: rejeita (provavelmente é frase normal com `:` no meio)
  if (wordCount > 8) return null

  // Critério 2: head é UPPERCASE-dominante (>=60% maiúsculas)
  const letters = head.match(/[A-Za-zÀ-ÿ]/g) ?? []
  const upper = head.match(/[A-ZÀÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇ]/g) ?? []
  const ratio = letters.length > 0 ? upper.length / letters.length : 0
  if (ratio >= 0.6) return { nome: cleanMateriaName(head), rest }

  return null
}

/**
 * Limpa nome de matéria: remove numeração inicial, conserta acentuação básica
 * comum em PDFs ("Lingua" → "Língua", "Dominio" → "Domínio") e aplica title case.
 */
function cleanMateriaName(raw: string): string {
  let s = raw.trim()
  // Remove numeração inicial tipo "1.", "1.1.", "I.", "II - "
  s = s.replace(/^[\dIVX]+(\.[\dIVX]+)*\.?\s*[-—:)]?\s*/i, '')
  // Title case
  s = titleCase(s)
  // Conserta acentuações comuns que somem em PDFs antigos
  s = s
    .replace(/\bLingua\b/g, 'Língua')
    .replace(/\bDominio\b/g, 'Domínio')
    .replace(/\bConteudo\b/g, 'Conteúdo')
    .replace(/\bMatematica\b/g, 'Matemática')
    .replace(/\bLogica\b/g, 'Lógica')
    .replace(/\bInformatica\b/g, 'Informática')
    .replace(/\bAdministracao\b/g, 'Administração')
    .replace(/\bConstitucional\b/g, 'Constitucional')
    .replace(/\bEtnica\b/g, 'Étnica')
    .replace(/\bGeografica\b/g, 'Geográfica')
    .replace(/\bPolitica\b/g, 'Política')
    .replace(/\bEconomica\b/g, 'Econômica')
    .replace(/\bRealidade Etnica\b/gi, 'Realidade Étnica')
  return s
}

export function parseEditalText(text: string): ParseResult {
  const warnings: ParseError[] = []

  // Pré-processa pra suportar formatos comuns de edital CESPE/FGV:
  // 1. Junta linhas quebradas por word-wrap do PDF (a partir de continuação numérica)
  // 2. Quebra matérias que vieram coladas numa linha só
  // 3. Detecta títulos UPPERCASE sem `:` seguidos de tópicos numerados
  const preprocessed0 = preprocessJoinWrappedLines(text)
  const preprocessed1 = preprocessSplitInlineMaterias(preprocessed0)
  const preprocessed = preprocessUppercaseTitles(preprocessed1)
  const lines = preprocessed.split(/\r?\n/)

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
        // Section markers (CONHECIMENTOS BÁSICOS, etc.) não viram matéria
        if (isSectionMarker(mdMateria)) continue
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
        // Section markers no início (ex: "CONHECIMENTOS BÁSICOS: LÍNGUA PORTUGUESA: ...")
        // ignora o marker e continua processando o resto (pode ter outra matéria embutida)
        if (isSectionMarker(inlineHeader.nome)) {
          if (inlineHeader.rest) {
            // Volta o resto na fila pra ser re-parseado
            lines[i] = inlineHeader.rest
            i--
          }
          continue
        }
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
