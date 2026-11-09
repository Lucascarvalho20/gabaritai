import { acertoSuavizado } from '../peso-adaptativo.ts'

/**
 * Onde o aluno perde mais pontos — a conta que o agente de diagnóstico usa.
 *
 * Fica fora do modelo de linguagem de propósito. LLM erra aritmética e não é
 * reprodutível; esta função é as duas coisas. O agente CHAMA esta conta como
 * ferramenta e explica o resultado — não a refaz.
 *
 *     fatiaDaProva  = peso da matéria / soma dos pesos
 *     perdaEstimada = fatiaDaProva × (1 − acerto suavizado)
 *
 * `perdaEstimada` responde: "que fração da prova inteira você está deixando
 * na mesa nesta matéria?". Uma matéria pesada com acerto médio pode render
 * mais que uma leve com acerto péssimo — e é isso que um "ponto fraco" por
 * acerto, sozinho, esconde.
 *
 * O acerto é o suavizado (peso-adaptativo.ts): duas questões erradas não
 * transformam uma matéria em prioridade máxima.
 */

export type MateriaDiagnostico = {
  id: string
  nome: string
  peso: number
  acertos: number
  tentativas: number
}

export type Situacao = 'sem_dados' | 'poucos_dados' | 'fraca' | 'regular' | 'forte'

export type Prioridade = {
  id: string
  nome: string
  peso: number
  tentativas: number
  /** Acerto real, para mostrar. null quando nunca respondeu. */
  acerto: number | null
  /** Fração da prova (0–1) que esta matéria representa. */
  fatiaDaProva: number
  /** Fração da prova inteira (0–1) estimada como perdida nesta matéria. */
  perdaEstimada: number
  situacao: Situacao
}

/** Abaixo disso o acerto ainda é mais ruído que sinal. */
export const MIN_TENTATIVAS_CONFIAVEL = 10

function situacao(acerto: number | null, tentativas: number): Situacao {
  if (tentativas === 0 || acerto === null) return 'sem_dados'
  if (tentativas < MIN_TENTATIVAS_CONFIAVEL) return 'poucos_dados'
  if (acerto < 0.6) return 'fraca'
  if (acerto < 0.8) return 'regular'
  return 'forte'
}

const r4 = (n: number) => Math.round(n * 10_000) / 10_000

export function priorizar(materias: MateriaDiagnostico[]): Prioridade[] {
  const pesoTotal = materias.reduce((s, m) => s + Math.max(0, m.peso), 0) || 1

  return materias
    .map((m) => {
      const tentativas = Math.max(0, m.tentativas)
      const acertos = Math.min(Math.max(0, m.acertos), tentativas)
      const acerto = tentativas > 0 ? acertos / tentativas : null
      const fatiaDaProva = Math.max(0, m.peso) / pesoTotal
      const perdaEstimada = fatiaDaProva * (1 - acertoSuavizado({ acertos, tentativas }))
      return {
        id: m.id,
        nome: m.nome,
        peso: m.peso,
        tentativas,
        acerto: acerto === null ? null : r4(acerto),
        fatiaDaProva: r4(fatiaDaProva),
        perdaEstimada: r4(perdaEstimada),
        situacao: situacao(acerto, tentativas),
      }
    })
    .sort((a, b) => b.perdaEstimada - a.perdaEstimada || b.peso - a.peso || a.nome.localeCompare(b.nome))
}
