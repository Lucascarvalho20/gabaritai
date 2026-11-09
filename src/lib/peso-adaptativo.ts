/**
 * Ajuste do peso das matérias pelo desempenho do aluno.
 *
 * O algoritmo de cronograma (schedule-algorithm.ts) distribui o tempo
 * proporcional ao peso de cada matéria. Ele não é alterado: esta função só
 * calcula um PESO EFETIVO antes de ele entrar lá. Uma parte decide quanto cada
 * matéria merece; a outra decide quando estudá-la.
 *
 *     pesoEfetivo = pesoDoEdital × fator
 *
 * O FATOR. Compara o acerto do aluno na matéria com um alvo (70%, faixa comum
 * de corte em prova policial). Abaixo do alvo, a matéria ganha tempo; acima,
 * cede. Limitado a [0,6 ; 1,6]: nenhuma matéria some do cronograma (cobrir o
 * edital inteiro é regra do produto) e nenhuma engole as outras.
 *
 * O PROBLEMA DA AMOSTRA PEQUENA. Errar 2 de 2 questões não diz que o aluno é
 * fraco na matéria — diz quase nada. Usar o acerto cru faria o cronograma dar
 * saltos com cada questão respondida. A solução é suavização bayesiana: somar
 * ao histórico real algumas "tentativas imaginárias" no alvo.
 *
 *     acertoSuavizado = (acertos + ALVO × M) / (tentativas + M)
 *
 * Com poucas tentativas, o valor fica perto do alvo (fator perto de 1, nada
 * muda). Conforme o aluno responde mais, os dados reais dominam. É o mesmo
 * raciocínio de ranking de produto com poucas avaliações: um item com uma nota
 * 5 não deve ficar acima de outro com mil notas 4,8. Sem limiar arbitrário
 * tipo "só ajusta depois de 10 questões" — a transição é contínua.
 */

/** Acerto de referência. Abaixo dele a matéria ganha tempo. */
export const ALVO_ACERTO = 0.7
/** Tentativas imaginárias no alvo, somadas ao histórico real. */
export const PSEUDO_TENTATIVAS = 10
/** Quanto o fator reage à distância do alvo. */
export const SENSIBILIDADE = 2
export const FATOR_MIN = 0.6
export const FATOR_MAX = 1.6

export type Desempenho = { acertos: number; tentativas: number }

export type AjusteDesempenho = {
  id: string
  name: string
  pesoEdital: number
  pesoEfetivo: number
  fator: number
  /** Acerto real (sem suavização), para mostrar ao aluno. null se nunca respondeu. */
  acerto: number | null
  tentativas: number
}

export function acertoSuavizado({ acertos, tentativas }: Desempenho): number {
  const t = Math.max(0, tentativas)
  const a = Math.min(Math.max(0, acertos), t)
  return (a + ALVO_ACERTO * PSEUDO_TENTATIVAS) / (t + PSEUDO_TENTATIVAS)
}

export function fatorDesempenho(d: Desempenho): number {
  const bruto = 1 + SENSIBILIDADE * (ALVO_ACERTO - acertoSuavizado(d))
  const limitado = Math.min(FATOR_MAX, Math.max(FATOR_MIN, bruto))
  return Math.round(limitado * 1000) / 1000
}

/**
 * Aplica o fator a cada matéria. Matéria sem histórico fica com fator 1.
 * Devolve também o detalhamento — o aluno precisa ver POR QUE o cronograma
 * mudou, senão a adaptação parece arbitrária.
 */
export function aplicarDesempenho<T extends { id: string; name: string; weight: number }>(
  materias: T[],
  desempenho: Map<string, Desempenho>,
): { materias: T[]; ajustes: AjusteDesempenho[] } {
  const ajustes: AjusteDesempenho[] = []
  const resultado = materias.map((m) => {
    const d = desempenho.get(m.id) ?? { acertos: 0, tentativas: 0 }
    const fator = d.tentativas > 0 ? fatorDesempenho(d) : 1
    const pesoEfetivo = Math.round(m.weight * fator * 1000) / 1000
    ajustes.push({
      id: m.id,
      name: m.name,
      pesoEdital: m.weight,
      pesoEfetivo,
      fator,
      acerto: d.tentativas > 0 ? Math.round((d.acertos / d.tentativas) * 1000) / 1000 : null,
      tentativas: d.tentativas,
    })
    return { ...m, weight: pesoEfetivo }
  })
  return { materias: resultado, ajustes }
}
