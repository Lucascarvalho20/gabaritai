/**
 * O método de estudo da plataforma, num lugar só. A calculadora da home, o
 * "Meu tempo", o cronograma e o cronômetro da sessão usam estas regras — as
 * contas não podem discordar entre si.
 *
 * POMODORO (Francesco Cirillo, fim dos anos 1980). Blocos de 25 minutos de
 * foco com 5 de pausa; a cada 4 blocos, uma pausa longa — 15 minutos aqui
 * (Cirillo fala em 15 a 30). O próprio Cirillo conta que chegou aos 25
 * minutos testando, não por um estudo: o que a técnica garante é foco sem
 * interrupção e pausa planejada. As horas que o aluno declara são o tempo
 * TOTAL do dia; o foco é o que cabe de pomodoros nelas (3 h = 5 pomodoros =
 * 2 h 05 de foco). Pomodoro® é marca registrada de Francesco Cirillo.
 *
 * REVISÃO ESPAÇADA. Cada sessão de estudo novo ganha quatro revisões da mesma
 * matéria: 1, 7, 15 e 30 dias depois. Dois resultados sustentam a escolha:
 *  - a curva do esquecimento (Ebbinghaus, 1885): a maior perda acontece nas
 *    primeiras horas e dias — por isso a primeira revisão é no dia seguinte;
 *  - o efeito de espaçamento (Cepeda e colegas, 2008, Psychological Science,
 *    mais de 1.350 pessoas): o intervalo ideal entre revisões cresce com o
 *    tempo que é preciso lembrar — por isso os intervalos crescem.
 * Cada revisão é mais curta que a anterior, porque reaprender é mais rápido
 * que aprender (a "economia" que Ebbinghaus mediu): 20%, 10%, 7% e 5% do
 * tempo do estudo original — somadas, 42% do tempo de teoria.
 */

export const POMODORO = { focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, blocosAtePausaLonga: 4 } as const

/**
 * Quantos pomodoros cabem em `minutos` de tempo total. A pausa depois do
 * último não precisa caber. Com algum tempo, ao menos um.
 */
export function pomodorosNoTempo(minutos: number): number {
  if (!(minutos > 0)) return 0
  minutos = Math.min(minutos, 24 * 60) // o dia acaba: "infinitas horas" não trava a conta
  let t = 0
  let n = 0
  while (t + POMODORO.focoMin <= minutos + 1e-9) {
    n++
    t += POMODORO.focoMin + (n % POMODORO.blocosAtePausaLonga === 0 ? POMODORO.pausaLongaMin : POMODORO.pausaCurtaMin)
  }
  return Math.max(1, n)
}

/** Minutos de foco num dia em que o aluno declarou `horas` de estudo. */
export function focoPorDia(horas: number): number {
  return pomodorosNoTempo(horas * 60) * POMODORO.focoMin
}

/** Horas a declarar, no passo de 0,5 h do formulário, para render `minutosFoco` de foco por dia. */
export function horasParaFoco(minutosFoco: number): number {
  if (!(minutosFoco > 0)) return 0
  for (let meiasHoras = 1; meiasHoras <= 48; meiasHoras++) {
    if (focoPorDia(meiasHoras / 2) >= minutosFoco - 1e-9) return meiasHoras / 2
  }
  return Infinity
}

export const REVISOES = [
  { diasDepois: 1, fracao: 0.2, nome: '24 horas' },
  { diasDepois: 7, fracao: 0.1, nome: '7 dias' },
  { diasDepois: 15, fracao: 0.07, nome: '15 dias' },
  { diasDepois: 30, fracao: 0.05, nome: '30 dias' },
] as const

/** Tempo das quatro revisões, em fração do tempo do estudo novo: 0,42. */
export const REVISAO_FRACAO = Math.round(REVISOES.reduce((s, r) => s + r.fracao, 0) * 100) / 100

/** As revisões de uma sessão de estudo: em que dia cada uma vence e quantos minutos ela pede. */
export function revisoesDoEstudo(dia: Date, minutosEstudo: number): Array<{ vence: Date; minutos: number; nome: string }> {
  return REVISOES.map((r) => {
    const vence = new Date(dia)
    vence.setDate(vence.getDate() + r.diasDepois)
    return { vence, minutos: minutosEstudo * r.fracao, nome: r.nome }
  })
}
