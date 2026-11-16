/**
 * Prompt da explicação de uma questão ("por que está certo / por que está
 * errado"). Função pura para dar para testar: o que entra no prompt decide se
 * a IA explica o item de verdade ou adivinha o contexto que faltou.
 */

type Alternativa = { letra: string; texto: string }

export type QuestaoParaExplicar = {
  enunciado: string
  alternativas: unknown
  gabarito: string
  bancaSlug?: string | null
  orgao?: string | null
  ano?: number | null
  materia?: string | null
  comando?: string | null
  textoBase?: { titulo: string; conteudo: string } | null
}

const LIMITE_TEXTO_BASE = 3500

function alternativasDe(bruto: unknown): Alternativa[] {
  if (!Array.isArray(bruto)) return []
  return bruto
    .filter((a): a is Alternativa => !!a && typeof a === 'object' && typeof (a as any).letra === 'string')
    .map((a) => ({ letra: a.letra.trim().toUpperCase(), texto: String(a.texto ?? '').trim() }))
}

/** Item de certo/errado: sem alternativas, ou só C e E. */
export function ehCertoErrado(q: Pick<QuestaoParaExplicar, 'alternativas' | 'gabarito'>): boolean {
  const alts = alternativasDe(q.alternativas)
  if (alts.length === 0) return ['C', 'E'].includes(q.gabarito.trim().toUpperCase())
  return alts.length === 2 && alts.every((a) => a.letra === 'C' || a.letra === 'E')
}

export function promptDeExplicacao(q: QuestaoParaExplicar): string {
  const gabarito = q.gabarito.trim().toUpperCase()
  const origem = [q.bancaSlug?.toUpperCase(), q.orgao, q.ano].filter(Boolean).join(' ')
  const partes: string[] = [
    `Você é professor de cursinho para concursos públicos${origem ? ` e está corrigindo uma questão (${origem})` : ''}${q.materia ? `, matéria ${q.materia}` : ''}.`,
  ]

  if (q.textoBase?.conteudo) {
    const conteudo = q.textoBase.conteudo.length > LIMITE_TEXTO_BASE
      ? `${q.textoBase.conteudo.slice(0, LIMITE_TEXTO_BASE)}\n[…texto cortado…]`
      : q.textoBase.conteudo
    partes.push(`Texto-base (${q.textoBase.titulo}):\n${conteudo}`)
  }
  if (q.comando) partes.push(`Comando da questão: ${q.comando}`)

  const regras = [
    'Responda em português do Brasil, em Markdown, com no máximo 220 palavras.',
    'O gabarito acima é o OFICIAL: explique por que ele é o correto e nunca o contradiga.',
    'Cite artigo de lei, súmula ou número de dispositivo só se tiver certeza; se não tiver, explique a regra sem inventar número.',
  ]

  if (ehCertoErrado(q)) {
    const veredito = gabarito === 'C' ? 'CERTO' : 'ERRADO'
    partes.push(
      `Item para julgar (certo ou errado): ${q.enunciado}`,
      `Gabarito oficial: ${veredito}.`,
      [
        'Estruture assim:',
        `1. **Por que está ${veredito.toLowerCase()}** — aponte o trecho exato do item que o torna ${veredito === 'CERTO' ? 'correto' : 'incorreto'}${veredito === 'ERRADO' ? ' e diga como ficaria a afirmação correta' : ''}.`,
        '2. **Fundamento** — a regra, o conceito ou o dispositivo que decide o item.',
        '3. **O que a banca testou** — a pegadinha, em uma frase.',
      ].join('\n'),
    )
  } else {
    const alts = alternativasDe(q.alternativas)
    partes.push(
      `Enunciado: ${q.enunciado}`,
      `Alternativas:\n${alts.map((a) => `${a.letra}) ${a.texto}`).join('\n')}`,
      `Gabarito oficial: letra ${gabarito}.`,
      [
        'Estruture assim:',
        `1. **Por que a ${gabarito} está certa** — o fundamento.`,
        '2. **Por que as outras estão erradas** — uma linha por alternativa, dizendo o erro de cada uma.',
        '3. **Dica para a prova** — uma frase.',
      ].join('\n'),
    )
  }

  partes.push(regras.join('\n'))
  return partes.join('\n\n')
}
