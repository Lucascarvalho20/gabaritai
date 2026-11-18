/**
 * As contas da calculadora do aluno (/dashboard/calculadora), em cima das
 * estimativas de tempo-estudo.ts. Funções puras: sem banco, sem relógio — o
 * teste cobre cada regra.
 *
 * PLANO PAGO: os cursos do aluno, com o conteúdo do site medido tópico a
 * tópico. Dois cursos PARECIDOS podem ser estudados juntos, e a matéria comum
 * conta uma vez só (o material é da matéria, não do curso: o Constitucional
 * da PF é o mesmo da PCDF). "Parecidos" quer dizer que o conteúdo em comum é
 * pelo menos metade do curso menor — PF Agente e PF Escrivão dividem quase
 * tudo; juntar PF Delegado com PMGO pouparia pouco e só confundiria o plano.
 *
 * GRATUITO: o edital em PDF que o aluno manda. Para aquele programa não há
 * material nosso medido, então a conta é uma suposição declarada: os tópicos
 * do programa do edital × o tempo que um tópico da mesma matéria leva aqui na
 * plataforma (mediana real). Sem a matéria no site, a mediana de todas; sem
 * dado nenhum, o tamanho padrão de um material.
 *
 * NOS DOIS: se não couber até a prova, quantas horas por dia seriam precisas
 * e, com as horas que o aluno tem, por onde começar — as matérias que dão mais
 * pontos por hora de estudo.
 */
import {
  cabeNoTempo, consolidar, mediana, PALAVRAS_POR_MINUTO, PALAVRAS_TOPICO_REFERENCIA, REVISAO_FRACAO,
  type Disponibilidade, type EstimativaEdital, type EstimativaMateria, type Veredito,
} from './tempo-estudo.ts'

/** Fração mínima de conteúdo em comum (sobre o curso menor) para dois cursos serem estudados juntos. */
export const SIMILARIDADE_MINIMA = 0.5
/** Quantos cursos dá para juntar num cálculo. */
export const MAX_CURSOS_JUNTOS = 2
/**
 * Um tópico de tamanho padrão, sem nenhum dado da plataforma: a leitura do
 * material padrão mais as revisões. Questões ficam de fora — sem banco não há
 * o que contar.
 */
export const MIN_TOPICO_REFERENCIA = (PALAVRAS_TOPICO_REFERENCIA / PALAVRAS_POR_MINUTO) * (1 + REVISAO_FRACAO)

const arred = (n: number) => Math.round(n * 10) / 10

/** Quanto a matéria vale na prova: as questões dela; sem esse dado, o peso do edital. */
export function pontosDaMateria(m: Pick<EstimativaMateria, 'peso' | 'questoesNaProva'>): number {
  const q = m.questoesNaProva
  return q != null && q > 0 ? q : Math.max(0, m.peso)
}

// ─── Dois cursos ─────────────────────────────────────────────────────────────

export type Similaridade = {
  /** Minutos de conteúdo que os dois cursos têm em comum. */
  comumMin: number
  /** comumMin ÷ o total do curso menor, de 0 a 1. */
  percentual: number
  materiasComuns: string[]
  parecidos: boolean
}

export function similaridade(a: EstimativaEdital, b: EstimativaEdital): Similaridade {
  const deB = new Map(b.materias.map((m) => [m.id, m]))
  const comuns = a.materias.filter((m) => deB.has(m.id))
  const comumMin = comuns.reduce((s, m) => s + Math.min(m.totalMin, deB.get(m.id)!.totalMin), 0)
  const menor = Math.min(a.totalMin, b.totalMin)
  const percentual = menor > 0 ? Math.min(1, comumMin / menor) : 0
  return {
    comumMin: arred(comumMin),
    percentual: Math.round(percentual * 1000) / 1000,
    materiasComuns: comuns.map((m) => m.nome),
    parecidos: percentual >= SIMILARIDADE_MINIMA,
  }
}

/**
 * O conteúdo dos dois cursos somado, com a matéria comum uma vez só. A mesma
 * matéria tem os mesmos tópicos nos dois; a diferença de tempo vem só da
 * reserva de cada edital (a mediana que cobre tópico sem material), e fica a
 * maior — para não prometer menos do que é. Os pontos somam: a matéria cai nas
 * duas provas.
 */
export function juntar(a: EstimativaEdital, b: EstimativaEdital): EstimativaEdital {
  const porId = new Map<string, EstimativaMateria>()
  for (const m of [...a.materias, ...b.materias]) {
    const ja = porId.get(m.id)
    if (!ja) {
      porId.set(m.id, m)
      continue
    }
    const maior = m.totalMin > ja.totalMin ? m : ja
    porId.set(m.id, { ...maior, peso: ja.peso + m.peso, questoesNaProva: pontosDaMateria(ja) + pontosDaMateria(m) })
  }
  return consolidar([...porId.values()])
}

// ─── Uma ou duas provas ──────────────────────────────────────────────────────

export type Etapa = {
  rotulo: string
  /** Conteúdo que precisa estar percorrido até `dataProva` (acumulado). */
  totalMin: number
  dataProva: Date | null
}

type Prova = { rotulo: string; totalMin: number; dataProva: Date | null }

/**
 * Duas provas em datas diferentes: o conteúdo da primeira tem de caber até a
 * data dela, e o dos dois cursos até a segunda — estudar primeiro o que cai
 * primeiro. Na mesma data (ou sem data), vale o conteúdo junto.
 */
export function etapasDeDuasProvas(a: Prova, b: Prova, juntosMin: number): Etapa[] {
  const juntos = (dataProva: Date | null): Etapa => ({ rotulo: `${a.rotulo} + ${b.rotulo}`, totalMin: juntosMin, dataProva })
  if (a.dataProva && b.dataProva) {
    if (a.dataProva.getTime() === b.dataProva.getTime()) return [juntos(a.dataProva)]
    const [primeira, segunda] = a.dataProva < b.dataProva ? [a, b] : [b, a]
    return [{ rotulo: primeira.rotulo, totalMin: primeira.totalMin, dataProva: primeira.dataProva }, juntos(segunda.dataProva)]
  }
  // Só uma tem data: ela é o prazo da parte dela; o conjunto fica sem prazo.
  const comData = a.dataProva ? a : b.dataProva ? b : null
  return comData ? [{ ...comData }, juntos(null)] : [juntos(null)]
}

export type ResultadoEtapas = {
  etapas: Array<Etapa & { veredito: Veredito }>
  /** undefined quando nenhuma etapa tem data de prova. */
  cabe?: boolean
  /** Horas por dia para TODAS as etapas caberem (a maior das necessidades). */
  horasPorDiaNecessarias?: number
}

export function avaliarEtapas(etapas: Etapa[], d: Omit<Disponibilidade, 'dataProva'>): ResultadoEtapas {
  const avaliadas = etapas.map((e) => ({ ...e, veredito: cabeNoTempo(e.totalMin, { ...d, dataProva: e.dataProva }) }))
  const comPrazo = avaliadas.filter((e) => e.veredito.cabe !== undefined)
  if (!comPrazo.length) return { etapas: avaliadas }
  return {
    etapas: avaliadas,
    cabe: comPrazo.every((e) => e.veredito.cabe),
    horasPorDiaNecessarias: Math.max(...comPrazo.map((e) => e.veredito.horasPorDiaNecessarias!)),
  }
}

// ─── Por onde começar quando não cabe ────────────────────────────────────────

export type MateriaComPontos = { id: string; nome: string; pontos: number; totalMin: number }
export type ItemPrioridade = MateriaComPontos & {
  /** Quanto da matéria cabe no tempo disponível: 1 inteira, 0 nada. */
  fracao: number
}
export type Prioridade = { itens: ItemPrioridade[]; pontosCobertos: number; pontosTotais: number; percentual: number }

/**
 * Com `disponivelMin` de estudo, quais matérias levam mais pontos. Ordena por
 * pontos por minuto e enche o tempo nessa ordem; a última que não cabe inteira
 * entra pela fração que cabe. É a solução ótima da "mochila fracionária": com
 * matérias divisíveis, nenhuma outra ordem cobre mais pontos no mesmo tempo.
 * A suposição — estudar metade da matéria rende metade dos pontos dela — é uma
 * simplificação, e a tela diz isso.
 */
export function prioridadePorPontos(materias: MateriaComPontos[], disponivelMin: number): Prioridade {
  const razao = (m: MateriaComPontos) => (m.totalMin > 0 ? m.pontos / m.totalMin : Infinity)
  const ordem = [...materias].sort((x, y) => razao(y) - razao(x) || y.pontos - x.pontos)
  let resta = Math.max(0, disponivelMin)
  const itens = ordem.map((m) => {
    const fracao = m.totalMin <= 0 ? 1 : Math.min(1, resta / m.totalMin)
    resta = Math.max(0, resta - m.totalMin * fracao)
    return { ...m, fracao: Math.round(fracao * 1000) / 1000 }
  })
  const pontosTotais = materias.reduce((s, m) => s + m.pontos, 0)
  const pontosCobertos = itens.reduce((s, m) => s + m.pontos * m.fracao, 0)
  return {
    itens,
    pontosCobertos: arred(pontosCobertos),
    pontosTotais: arred(pontosTotais),
    percentual: pontosTotais > 0 ? Math.round((pontosCobertos / pontosTotais) * 1000) / 1000 : 0,
  }
}

// ─── Edital em PDF (gratuito) ────────────────────────────────────────────────

export type TopicoPrograma = { nome: string; subtopicos: string[] }
export type MateriaPrograma = { nome: string; qtdQuestoes: number | null; peso: number | null; topicos: TopicoPrograma[] }
export type ReferenciaMateria = { id: string; nome: string; minPorTopico: number }
export type BaseDoTempo = 'materia' | 'plataforma' | 'referencia'

export type EstimativaProgramaMateria = {
  nome: string
  topicos: number
  /** O edital não listou o programa da matéria: recebe a mediana de tópicos das outras. */
  semPrograma: boolean
  pontos: number
  /** O edital disse quantas questões (ou o peso) a matéria tem. */
  pontosInformados: boolean
  minPorTopico: number
  totalMin: number
  base: BaseDoTempo
  /** A matéria do site que deu o tempo por tópico, quando houve correspondência. */
  materiaDoSite: string | null
}

export type EstimativaPrograma = {
  materias: EstimativaProgramaMateria[]
  totalMin: number
  topicos: number
  pontosTotais: number
  /** 0 a 1: quanto do total veio do tempo real de uma matéria do site. */
  percentualPelaMateria: number
}

/** Tópicos que contam: o subitem conta; o item que só agrupa subitens, não (a mesma regra da árvore do site). */
export function contarTopicos(topicos: TopicoPrograma[]): number {
  return topicos.reduce((s, t) => s + Math.max(1, t.subtopicos.length), 0)
}

const SINONIMOS: Record<string, string> = {
  portugues: 'lingua portuguesa',
  'lingua portuguesa portugues': 'lingua portuguesa',
  ingles: 'lingua inglesa',
  espanhol: 'lingua espanhola',
  'raciocinio logico matematico': 'raciocinio logico',
  'matematica raciocinio logico': 'raciocinio logico',
  informatica: 'informatica',
  'tecnologia informacao': 'informatica',
  'direitos humanos cidadania': 'direitos humanos',
}

/** Nome de matéria para comparar: sem acento, sem "Noções de", sem conectivos. */
export function normalizarMateria(nome: string): string {
  const base = nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/^\s*(?:no[cç](?:oes|ao)|conhecimentos?|elementos|fundamentos)(?:\s+(?:basicas?|gerais|elementares))?\s+(?:de|da|do|das|dos|em|sobre)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(de|da|do|das|dos|e|a|o|em|na|no)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return SINONIMOS[base] ?? base
}

/** A matéria do site com o mesmo nome (normalizado). Sem igualdade, nenhuma: chute de nome erra a conta. */
export function casarMateria<T extends { nome: string }>(nome: string, candidatas: T[]): T | null {
  const alvo = normalizarMateria(nome)
  if (!alvo) return null
  return candidatas.find((c) => normalizarMateria(c.nome) === alvo) ?? null
}

export function estimarPrograma(
  materias: MateriaPrograma[],
  referencias: ReferenciaMateria[],
  refGeral: number | null,
): EstimativaPrograma {
  const contagens = materias.map((m) => contarTopicos(m.topicos))
  const tipica = mediana(contagens.filter((n) => n > 0)) ?? 1
  const calculadas = materias.map((m, i) => {
    const semPrograma = contagens[i] === 0
    const topicos = semPrograma ? Math.round(tipica) : contagens[i]
    const ref = casarMateria(m.nome, referencias)
    const base: BaseDoTempo = ref ? 'materia' : refGeral != null && refGeral > 0 ? 'plataforma' : 'referencia'
    const minPorTopico = ref ? ref.minPorTopico : base === 'plataforma' ? refGeral! : MIN_TOPICO_REFERENCIA
    const pontosInformados = (m.qtdQuestoes != null && m.qtdQuestoes > 0) || (m.peso != null && m.peso > 0)
    const pontos = m.qtdQuestoes != null && m.qtdQuestoes > 0 ? m.qtdQuestoes * (m.peso != null && m.peso > 0 ? m.peso : 1) : m.peso != null && m.peso > 0 ? m.peso : 1
    return {
      nome: m.nome, topicos, semPrograma, pontos, pontosInformados,
      minPorTopico: arred(minPorTopico), totalMin: arred(topicos * minPorTopico), base,
      materiaDoSite: ref?.nome ?? null,
    }
  })
  const totalMin = calculadas.reduce((s, m) => s + m.totalMin, 0)
  const pelaMateria = calculadas.filter((m) => m.base === 'materia').reduce((s, m) => s + m.totalMin, 0)
  return {
    materias: [...calculadas].sort((a, b) => b.totalMin - a.totalMin),
    totalMin: arred(totalMin),
    topicos: calculadas.reduce((s, m) => s + m.topicos, 0),
    pontosTotais: arred(calculadas.reduce((s, m) => s + m.pontos, 0)),
    percentualPelaMateria: totalMin > 0 ? Math.round((pelaMateria / totalMin) * 1000) / 1000 : 0,
  }
}

/**
 * O tempo de um tópico em cada matéria do site, para a conta do PDF: o total
 * da matéria (teoria + questões + revisão) dividido pelos tópicos que somam
 * tempo. Só entra matéria com algum tópico medido — sem medida, não é dado.
 * A mesma matéria em vários editais dá a mediana.
 */
export function referenciasPorTopico(estimativas: EstimativaEdital[]): { porMateria: ReferenciaMateria[]; geral: number | null } {
  const porId = new Map<string, { nome: string; valores: number[] }>()
  for (const e of estimativas) {
    for (const m of e.materias) {
      const contam = m.topicosMedidos + m.topicosEstimados
      if (m.topicosMedidos === 0 || contam === 0) continue
      const item = porId.get(m.id) ?? { nome: m.nome, valores: [] }
      item.valores.push(m.totalMin / contam)
      porId.set(m.id, item)
    }
  }
  const porMateria = [...porId].map(([id, { nome, valores }]) => ({ id, nome, minPorTopico: arred(mediana(valores)!) }))
  return { porMateria, geral: mediana(porMateria.map((r) => r.minPorTopico)) }
}

// ─── Do formulário para o cronograma ─────────────────────────────────────────

/** "5 dias por semana" para os dias do cronograma (0 = domingo): de segunda em diante, domingo por último. */
export function diasDaSemana(quantos: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(quantos) || 1))
  return [1, 2, 3, 4, 5, 6, 0].slice(0, n).sort((a, b) => a - b)
}
