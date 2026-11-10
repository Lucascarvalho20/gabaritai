/**
 * Quanto tempo leva para estudar o conteúdo de um edital — calculado a partir
 * do conteúdo que existe no banco, não de um número fixo.
 *
 * O PROBLEMA QUE ISTO SUBSTITUI. A calculadora da home usava 600 horas para
 * qualquer concurso, e o cronograma assumia 60 horas por matéria, iguais para
 * Direito Penal e para Arquivologia. Nenhum dos dois olhava o conteúdo.
 *
 * O QUE CONTA COMO "PERCORRER O CONTEÚDO", por matéria do edital:
 *
 *   teoria   = ler o material de cada tópico
 *              palavras ÷ velocidade de leitura de estudo
 *   questões = resolver as questões ativas da matéria no banco
 *              nº de questões × tempo mediano REAL por questão
 *   revisão  = a fração da teoria que o cronograma reserva para revisão
 *
 * MEDIDO × ESTIMADO. Cada parte diz de onde veio:
 *  - tópico COM material escrito tem a teoria medida (contamos as palavras);
 *    tópico sem material herda a mediana dos tópicos medidos da mesma matéria;
 *    sem nenhum na matéria, a mediana do edital; sem nenhum no edital, o
 *    tamanho padrão de um material da plataforma;
 *  - o tempo por questão vem das tentativas dos alunos (mediana: uma questão
 *    esquecida aberta por 14 minutos não distorce); com poucas tentativas na
 *    matéria, vale a mediana da plataforma; sem nenhuma, uma referência;
 *  - matéria do edital SEM NENHUM tópico cadastrado recebe a mediana das
 *    outras matérias e vai para `materiasSemConteudo`: deixá-la de fora faria
 *    o total parecer menor do que o edital é.
 *
 * `percentualMedido` diz quanto do total saiu de dado real. É o número que
 * impede a estimativa de parecer mais certa do que é.
 *
 * Função pura: sem banco, sem relógio. Os dados chegam por parâmetro
 * (tempo-estudo-dados.ts os carrega), por isso o teste cobre cada caso.
 */
import { MIX, DEFAULT_SESSION_MIN, minutosEfetivosPorDia } from './schedule-algorithm.ts'

/**
 * Leitura de estudo, para memorizar: ~120 palavras por minuto. Pesquisas de
 * leitura medem cerca de 140 quando o objetivo é memorizar e cerca de 240 na
 * leitura corrida; texto de lei é denso, então arredondamos para baixo.
 */
export const PALAVRAS_POR_MINUTO = 120
/** Revisão: a mesma proporção que o cronograma dá a ela em relação ao estudo novo. */
export const REVISAO_FRACAO = MIX.REVISAO / MIX.ESTUDO
/** Tentativas com tempo necessárias para confiar na mediana de uma matéria (ou da plataforma). */
export const MIN_AMOSTRAS = 20
/** Sem nenhuma tentativa com tempo: referência por questão de múltipla escolha. */
export const MIN_POR_QUESTAO_REFERENCIA = 2.5
/** Sem nenhum tópico medido no edital: o tamanho padrão de um material da plataforma. */
export const PALAVRAS_TOPICO_REFERENCIA = 2000

export type TopicoConteudo = {
  id: string
  /** Palavras do material escrito do tópico; null quando ainda não há material. */
  palavras: number | null
  /** O texto do tópico já está liberado para o aluno (PUBLISHED e com palavras). */
  publicado: boolean
}

export type TempoQuestao = { medianaMs: number; amostras: number }

export type MateriaConteudo = {
  id: string
  nome: string
  peso: number
  topicos: TopicoConteudo[]
  questoes: number
  /** Mediana real do tempo por questão nesta matéria. */
  tempoQuestao: TempoQuestao | null
}

export type Fonte = 'medido' | 'medido_geral' | 'referencia'

export type EstimativaMateria = {
  id: string
  nome: string
  peso: number
  teoriaMin: number
  questoesMin: number
  revisaoMin: number
  totalMin: number
  topicos: number
  topicosMedidos: number
  topicosPublicados: number
  palavras: number
  questoes: number
  minPorQuestao: number
  fonteTempoQuestao: Fonte
  /** Matéria sem nenhum tópico cadastrado: a teoria é a mediana das outras. */
  semConteudo: boolean
  /** Minutos desta matéria que vieram de dado real. */
  medidoMin: number
}

export type EstimativaEdital = {
  materias: EstimativaMateria[]
  totalMin: number
  /** 0 a 1: quanto do total saiu de dado real. */
  percentualMedido: number
  topicos: number
  topicosMedidos: number
  topicosPublicados: number
  questoes: number
  materiasSemConteudo: string[]
  materiasSemQuestoes: string[]
}

export function mediana(valores: number[]): number | null {
  const v = valores.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

const arred = (n: number) => Math.round(n * 10) / 10
const temTexto = (t: TopicoConteudo) => t.palavras != null && t.palavras > 0
const minLeitura = (palavras: number) => palavras / PALAVRAS_POR_MINUTO

export function estimarEdital(
  materias: MateriaConteudo[],
  tempoQuestaoGeral: TempoQuestao | null = null,
): EstimativaEdital {
  const referenciaEdital =
    mediana(materias.flatMap((m) => m.topicos.filter(temTexto).map((t) => minLeitura(t.palavras!)))) ??
    minLeitura(PALAVRAS_TOPICO_REFERENCIA)
  const geralConfiavel = tempoQuestaoGeral && tempoQuestaoGeral.amostras >= MIN_AMOSTRAS && tempoQuestaoGeral.medianaMs > 0

  // 1ª passada: matérias com tópicos.
  const calculadas = materias.map((m) => {
    const medidos = m.topicos.filter(temTexto)
    const teoriaMedida = medidos.reduce((s, t) => s + minLeitura(t.palavras!), 0)
    const porTopico = mediana(medidos.map((t) => minLeitura(t.palavras!))) ?? referenciaEdital
    const teoria = teoriaMedida + (m.topicos.length - medidos.length) * porTopico

    let minPorQuestao = MIN_POR_QUESTAO_REFERENCIA
    let fonte: Fonte = 'referencia'
    if (m.tempoQuestao && m.tempoQuestao.amostras >= MIN_AMOSTRAS && m.tempoQuestao.medianaMs > 0) {
      minPorQuestao = m.tempoQuestao.medianaMs / 60_000
      fonte = 'medido'
    } else if (geralConfiavel) {
      minPorQuestao = tempoQuestaoGeral!.medianaMs / 60_000
      fonte = 'medido_geral'
    }
    const questoes = Number.isFinite(m.questoes) ? Math.max(0, Math.floor(m.questoes)) : 0
    return { m, medidos, teoriaMedida, teoria, questoes, minPorQuestao, fonte }
  })

  // 2ª passada: matéria sem tópico nenhum herda a mediana da teoria das outras.
  const teoriaTipica = mediana(calculadas.filter((c) => c.m.topicos.length > 0).map((c) => c.teoria)) ?? 0

  const estimadas: EstimativaMateria[] = calculadas.map((c) => {
    const semConteudo = c.m.topicos.length === 0
    const teoria = semConteudo ? teoriaTipica : c.teoria
    const questoesMin = c.questoes * c.minPorQuestao
    const revisao = teoria * REVISAO_FRACAO
    return {
      id: c.m.id,
      nome: c.m.nome,
      peso: c.m.peso,
      teoriaMin: arred(teoria),
      questoesMin: arred(questoesMin),
      revisaoMin: arred(revisao),
      totalMin: arred(teoria + questoesMin + revisao),
      topicos: c.m.topicos.length,
      topicosMedidos: c.medidos.length,
      topicosPublicados: c.m.topicos.filter((t) => t.publicado).length,
      palavras: c.medidos.reduce((s, t) => s + t.palavras!, 0),
      questoes: c.questoes,
      minPorQuestao: Math.round(c.minPorQuestao * 100) / 100,
      fonteTempoQuestao: c.fonte,
      semConteudo,
      // Medido = teoria contada palavra por palavra + questões no tempo real
      // dos alunos. A revisão segue a teoria, mas é regra do método, não medida.
      medidoMin: arred(c.teoriaMedida + (c.fonte === 'referencia' ? 0 : questoesMin)),
    }
  })

  const soma = (f: (m: EstimativaMateria) => number) => estimadas.reduce((s, m) => s + f(m), 0)
  const totalMin = soma((m) => m.totalMin)
  return {
    materias: [...estimadas].sort((a, b) => b.totalMin - a.totalMin),
    totalMin: arred(totalMin),
    percentualMedido: totalMin > 0 ? Math.round((soma((m) => m.medidoMin) / totalMin) * 1000) / 1000 : 0,
    topicos: soma((m) => m.topicos),
    topicosMedidos: soma((m) => m.topicosMedidos),
    topicosPublicados: soma((m) => m.topicosPublicados),
    questoes: soma((m) => m.questoes),
    materiasSemConteudo: estimadas.filter((m) => m.semConteudo).map((m) => m.nome),
    materiasSemQuestoes: estimadas.filter((m) => m.questoes === 0).map((m) => m.nome),
  }
}

export type Disponibilidade = {
  horasPorDia: number
  diasPorSemana: number
  hoje: Date
  /** Opcional: sem data de prova, responde só "em quanto tempo termina". */
  dataProva?: Date | null
}

export type Veredito = {
  /** Minutos de estudo por dia que o cronograma consegue usar (sessões inteiras de 50 min). */
  minutosPorDia: number
  /** Dias corridos até percorrer todo o conteúdo, no ritmo informado. */
  diasParaTerminar: number
  terminaEm: Date
  /** Os campos abaixo só existem com data de prova. */
  diasAteProva?: number
  disponivelMin?: number
  cabe?: boolean
  /** Quantas vezes dá para percorrer o conteúdo inteiro até a prova. */
  voltas?: number
  /** Horas por dia que precisariam ser declaradas para caber (múltiplo de 0,5); Infinity se a prova já passou. */
  horasPorDiaNecessarias?: number
}

const DIA_MS = 86_400_000

/** Horas a declarar para o cronograma render `minutos` por dia, no passo de 0,5 h do formulário. */
export function horasParaRender(minutos: number): number {
  const sessoes = Math.max(1, Math.ceil(minutos / DEFAULT_SESSION_MIN - 1e-9))
  return Math.ceil(((sessoes * DEFAULT_SESSION_MIN) / 60) * 2 - 1e-9) / 2
}

/**
 * Cabe até a prova? Usa a mesma régua do cronograma: só sessões inteiras de
 * 50 minutos contam, e a semana tem `diasPorSemana` dias de estudo.
 */
export function cabeNoTempo(totalMin: number, d: Disponibilidade): Veredito {
  const dias = Math.min(7, Math.max(1, Math.round(d.diasPorSemana) || 1))
  const minutosPorDia = d.horasPorDia > 0 ? minutosEfetivosPorDia(d.horasPorDia) : 0
  const minPorDiaCorrido = (minutosPorDia * dias) / 7
  const total = Math.max(0, totalMin)

  const diasParaTerminar = total === 0 ? 0 : minPorDiaCorrido > 0 ? Math.ceil(total / minPorDiaCorrido) : Infinity
  const v: Veredito = {
    minutosPorDia,
    diasParaTerminar,
    terminaEm: new Date(d.hoje.getTime() + (Number.isFinite(diasParaTerminar) ? diasParaTerminar : 0) * DIA_MS),
  }

  if (d.dataProva) {
    const diasAteProva = Math.max(0, Math.floor((d.dataProva.getTime() - d.hoje.getTime()) / DIA_MS))
    // Compara sem arredondar: arredondar antes faria 1234,4 "não caber" em 1234,5.
    const disponivel = diasAteProva * minPorDiaCorrido
    v.diasAteProva = diasAteProva
    v.disponivelMin = Math.round(disponivel)
    v.cabe = disponivel >= total - 1e-6
    v.voltas = total > 0 ? Math.floor((disponivel / total) * 10 + 1e-9) / 10 : 0
    v.horasPorDiaNecessarias =
      total === 0 ? 0 : diasAteProva > 0 ? horasParaRender(total / ((diasAteProva * dias) / 7)) : Infinity
  }
  return v
}
