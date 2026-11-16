/**
 * Correção de prova oficial, pelas regras da banca. Função pura: o teste cobre
 * cada regra sem banco.
 *
 * - Cebraspe (certo/errado): cada erro anula um acerto (`erradaAnulaCerta`).
 *   Em branco vale zero — por isso, na dúvida, deixar em branco é estratégia.
 * - Múltipla escolha (AOCP, IADES…): só os acertos contam.
 * - Item ANULADO pela banca: o ponto vai para todos, inclusive quem deixou em
 *   branco. É a regra dos editais: "a pontuação correspondente será atribuída
 *   a todos os candidatos".
 */

export type ItemParaCorrigir = {
  id: string
  /** Resposta oficial definitiva ("C", "E", "A"…"E"); null quando o item foi anulado. */
  gabarito: string | null
  anulada: boolean
  materia: string | null
}

export type Situacao = 'certo' | 'errado' | 'branco' | 'anulada'

export type DesempenhoMateria = {
  materia: string
  total: number
  acertos: number
  erros: number
  brancos: number
  anuladas: number
  pontos: number
  /** pontos ÷ total; pode ser negativo na Cebraspe. */
  percentual: number
}

export type ResultadoProva = {
  acertos: number
  erros: number
  brancos: number
  anuladas: number
  pontos: number
  pontosMax: number
  percentual: number
  porMateria: DesempenhoMateria[]
  itens: Array<{ id: string; resposta: string | null; gabarito: string | null; situacao: Situacao }>
}

const SEM_MATERIA = 'Sem matéria'
const VALIDAS = new Set(['C', 'E', 'A', 'B', 'D'])

/** "c " -> "C"; qualquer coisa fora de C/E/A–E vira resposta em branco. */
export function normalizarResposta(r: unknown): string | null {
  if (typeof r !== 'string') return null
  const v = r.trim().toUpperCase()
  return VALIDAS.has(v) ? v : null
}

const arred = (n: number) => Math.round(n * 1000) / 1000

export function corrigir(
  itens: ItemParaCorrigir[],
  respostas: Record<string, unknown>,
  erradaAnulaCerta: boolean,
): ResultadoProva {
  const porMateria = new Map<string, DesempenhoMateria>()
  const total = { acertos: 0, erros: 0, brancos: 0, anuladas: 0 }
  const detalhe: ResultadoProva['itens'] = []

  for (const item of itens) {
    const resposta = normalizarResposta(respostas[item.id])
    const situacao: Situacao = item.anulada
      ? 'anulada'
      : resposta == null
        ? 'branco'
        : resposta === normalizarResposta(item.gabarito)
          ? 'certo'
          : 'errado'
    detalhe.push({ id: item.id, resposta, gabarito: item.gabarito, situacao })

    const nome = item.materia || SEM_MATERIA
    const m = porMateria.get(nome) ?? { materia: nome, total: 0, acertos: 0, erros: 0, brancos: 0, anuladas: 0, pontos: 0, percentual: 0 }
    m.total++
    if (situacao === 'certo') { m.acertos++; total.acertos++ }
    else if (situacao === 'errado') { m.erros++; total.erros++ }
    else if (situacao === 'branco') { m.brancos++; total.brancos++ }
    else { m.anuladas++; total.anuladas++ }
    porMateria.set(nome, m)
  }

  const pontuar = (x: { acertos: number; erros: number; anuladas: number }) =>
    x.acertos + x.anuladas - (erradaAnulaCerta ? x.erros : 0)

  const materias = [...porMateria.values()].map((m) => {
    const pontos = pontuar(m)
    return { ...m, pontos, percentual: m.total ? arred(pontos / m.total) : 0 }
  })
  const pontos = pontuar(total)
  return {
    ...total,
    pontos,
    pontosMax: itens.length,
    percentual: itens.length ? arred(pontos / itens.length) : 0,
    porMateria: materias,
    itens: detalhe,
  }
}

/**
 * Onde revisar primeiro: matérias com pelo menos `minimo` itens e pelo menos
 * uma resposta, da pior para a melhor, só as abaixo de `corte`. Com poucos
 * itens a porcentagem engana (errar 1 de 2 não diz nada); e matéria que o aluno
 * nem tocou não é evidência de nada — vai para `materiasEmBranco`.
 */
export function prioridadesDeRevisao(porMateria: DesempenhoMateria[], minimo = 3, corte = 0.6): DesempenhoMateria[] {
  return porMateria
    .filter((m) => m.materia !== SEM_MATERIA && m.total - m.anuladas >= minimo && m.acertos + m.erros > 0 && m.percentual < corte)
    .sort((a, b) => a.percentual - b.percentual || b.total - a.total)
}

/** Matérias em que o aluno não respondeu nenhum item (só brancos e anulados). */
export function materiasEmBranco(porMateria: DesempenhoMateria[]): string[] {
  return porMateria.filter((m) => m.materia !== SEM_MATERIA && m.acertos + m.erros === 0 && m.brancos > 0).map((m) => m.materia)
}
