/**
 * Algoritmo determinístico de cronograma de estudos.
 *
 * Recebe matérias (com pesos) + janela de tempo + disponibilidade do aluno,
 * e produz um cronograma diário até a data da prova:
 *   - o dia rende os pomodoros que cabem nas horas declaradas (metodo-estudo.ts)
 *   - distribui o tempo proporcional ao peso de cada matéria
 *   - cada sessão de ESTUDO agenda as revisões espaçadas da matéria: 1, 7, 15 e
 *     30 dias depois, cada uma mais curta; as revisões vencidas abrem o dia
 *   - o resto do dia é ESTUDO e QUESTÕES, em blocos de 2 pomodoros (50 min)
 *   - intercala matérias (não repete a mesma em sequência)
 *   - adiciona SIMULADO quinzenal (semanal nos últimos 30 dias)
 *   - calcula se o tempo disponível é suficiente (deficit)
 *
 * NÃO usa IA. Pura matemática + round-robin.
 */
import { POMODORO, REVISOES, REVISAO_FRACAO, focoPorDia } from './metodo-estudo.ts'

export type ScheduleSubjectInput = {
  id: string
  name: string
  weight: number
  /** Horas para cobrir o conteúdo desta matéria, medidas no banco (tempo-estudo.ts). Sem ela, vale hoursPerSubjectRecommended. */
  hoursRecommended?: number
}

export type ScheduleInput = {
  startDate: Date
  endDate: Date
  hoursPerDay: number
  daysPerWeek: number[] // 0=dom, 1=seg, ..., 6=sab
  subjects: ScheduleSubjectInput[]
  sessionDurationMin?: number   // default 50
  includeMocks?: boolean        // default true
  mockEveryNDays?: number       // default 14
  hoursPerSubjectRecommended?: number // reserva para matéria sem hoursRecommended (default 60)
  // Modo "30 dias pra prova": dentro dos últimos 30 dias antes do endDate,
  // cronograma corta ESTUDO novo e foca em REVISAO + SIMULADO + QUESTOES.
  // Reduz ansiedade pré-prova e maximiza fixação.
  prePresenceMode?: boolean // default true
  prePresenceWindowDays?: number // default 30
}

export type ScheduledSessionType = 'ESTUDO' | 'REVISAO' | 'QUESTOES' | 'SIMULADO' | 'DESCANSO'

export type ScheduledSession = {
  date: Date
  subjectId: string | null
  subjectName: string | null
  durationMin: number
  type: ScheduledSessionType
  order: number
}

export type ScheduleResult = {
  totalDays: number
  studyDays: number
  totalMinAvailable: number
  totalMinRecommended: number
  deficit: number
  isFeasible: boolean
  perSubject: Record<string, { name: string; minutes: number; sessions: number; weight: number }>
  sessions: ScheduledSession[]
}

export const DEFAULT_SESSION_MIN = 50 // dois pomodoros
const DEFAULT_MOCK_INTERVAL = 14
const DEFAULT_RECOMMENDED_HOURS = 60
const DEFAULT_PRE_PRESENCE_WINDOW = 30
const DIA_MS = 86_400_000
/** Revisão que não coube (dia curto) e atrasou mais que isto sai: a próxima revisão da matéria já vem. */
const ATRASO_MAX_REVISAO_DIAS = 7

// Proporção do tempo no longo prazo. A revisão NÃO é sorteada na fila: nasce
// de cada sessão de estudo (revisões espaçadas), na fração do método — então
// REVISAO ÷ ESTUDO = REVISAO_FRACAO (0,42), e a estimativa do edital
// (tempo-estudo.ts) reserva revisão na mesma proporção. A conta da home e a do
// cronograma não podem discordar.
export const MIX = {
  ESTUDO: 0.6,
  REVISAO: Math.round(0.6 * REVISAO_FRACAO * 1000) / 1000,
  QUESTOES: Math.round((1 - 0.6 - 0.6 * REVISAO_FRACAO) * 1000) / 1000,
} as const

/**
 * Minutos de foco que cabem num dia: os pomodoros nas horas declaradas (as
 * pausas ficam fora). 3 h = 5 pomodoros = 125 min de foco.
 */
export function minutosEfetivosPorDia(hoursPerDay: number): number {
  return focoPorDia(hoursPerDay)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function enumerateStudyDays(start: Date, end: Date, daysPerWeek: number[]): Date[] {
  const days: Date[] = []
  const allowed = new Set(daysPerWeek)
  const cursor = startOfDay(start)
  const stop = startOfDay(end)
  while (cursor.getTime() <= stop.getTime()) {
    if (allowed.has(cursor.getDay())) days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

type ItemFila = { subjectId: string; subjectName: string; type: ScheduledSessionType }

/**
 * A fila de cada matéria, em blocos de um pomodoro: ESTUDO e QUESTÕES. Começa
 * com estudo (3 sessões de aquecimento); depois, a cada 4 sessões de estudo,
 * uma de questões — a proporção do MIX. Revisão não entra aqui: nasce de cada
 * sessão de estudo, com data (revisão espaçada).
 */
function buildPerSubjectQueue(
  subjects: ScheduleSubjectInput[],
  minutesPerSubject: Record<string, number>,
): Map<string, ItemFila[]> {
  const bloco = POMODORO.focoMin
  const map = new Map<string, ItemFila[]>()
  for (const s of subjects) {
    const totalMin = minutesPerSubject[s.id] ?? 0
    if (totalMin < bloco) {
      map.set(s.id, [])
      continue
    }
    let estudo = Math.max(1, Math.floor((totalMin * MIX.ESTUDO) / bloco))
    let questoes = Math.floor((totalMin * MIX.QUESTOES) / bloco)
    const fila: ItemFila[] = []
    for (let i = 0; estudo + questoes > 0; i++) {
      // 6 blocos de aquecimento; depois ciclos de 8 blocos de estudo + 2 de questões
      const vezDeQuestao = i >= 6 && (i - 6) % 10 >= 8
      const tipo: ScheduledSessionType = (vezDeQuestao && questoes > 0) || estudo === 0 ? 'QUESTOES' : 'ESTUDO'
      fila.push({ subjectId: s.id, subjectName: s.name, type: tipo })
      if (tipo === 'ESTUDO') estudo--
      else questoes--
    }
    map.set(s.id, fila)
  }
  return map
}

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const sessionMin = input.sessionDurationMin ?? DEFAULT_SESSION_MIN
  const bloco = POMODORO.focoMin
  const blocosPorSessao = Math.max(1, Math.floor(sessionMin / bloco))
  const mockInterval = input.mockEveryNDays ?? DEFAULT_MOCK_INTERVAL
  const recommendedHoursPerSubject = input.hoursPerSubjectRecommended ?? DEFAULT_RECOMMENDED_HOURS

  // 1. Dias úteis (dias que o aluno realmente vai estudar) e o foco de cada um
  const studyDates = enumerateStudyDays(input.startDate, input.endDate, input.daysPerWeek)
  const studyDays = studyDates.length
  const focoDia = focoPorDia(input.hoursPerDay)
  const totalMinAvailable = studyDays * focoDia

  // 2. Tempo necessário — usado pra calcular "vai dar tempo?". Cada matéria
  //    traz o tempo medido do seu conteúdo; a de fora usa a reserva fixa.
  const totalWeight = input.subjects.reduce((acc, s) => acc + s.weight, 0) || 1
  const recommendedHoursTotal = input.subjects.reduce(
    (acc, s) => acc + (s.hoursRecommended ?? recommendedHoursPerSubject),
    0,
  )
  const totalMinRecommended = recommendedHoursTotal * 60
  const deficit = Math.max(0, totalMinRecommended - totalMinAvailable)
  const isFeasible = deficit === 0

  // 3. Distribuir tempo disponível proporcional ao peso (mesmo se não der tempo total)
  const minutesPerSubject: Record<string, number> = {}
  for (const s of input.subjects) {
    minutesPerSubject[s.id] = Math.floor((s.weight / totalWeight) * totalMinAvailable)
  }

  // 4. Fila de blocos por matéria (estudo e questões)
  const queues = buildPerSubjectQueue(input.subjects, minutesPerSubject)

  // 5. Distribuir entre dias usando WEIGHTED ROUND-ROBIN.
  //    Cada slot escolhe a matéria com menor "uso / peso" — garante intercalação
  //    proporcional ao peso e nenhuma matéria fica para depois.
  const subjectIds = input.subjects.map((s) => s.id)
  const subjectWeight = new Map(input.subjects.map((s) => [s.id, s.weight]))
  const cursors: Record<string, number> = Object.fromEntries(subjectIds.map((id) => [id, 0]))
  const allSessions: ScheduledSession[] = []
  let mockDayCounter = 0

  function pickNextSubject(lastPicked: string | null): string | null {
    let bestId: string | null = null
    let bestRatio = Infinity
    for (const sid of subjectIds) {
      const queue = queues.get(sid)!
      const used = cursors[sid]
      if (used >= queue.length) continue
      // Evita pegar a mesma matéria duas vezes seguidas se houver alternativa
      if (sid === lastPicked && subjectIds.some((other) => {
        const q = queues.get(other)!
        return other !== sid && cursors[other] < q.length
      })) continue
      const w = subjectWeight.get(sid) ?? 1
      const ratio = used / w
      if (ratio < bestRatio) {
        bestRatio = ratio
        bestId = sid
      }
    }
    return bestId
  }

  // Revisões espaçadas a fazer: geradas por cada sessão de estudo, vencem num dia.
  type Revisao = { subjectId: string; subjectName: string; minutos: number; vence: number }
  let revisoes: Revisao[] = []
  const fimMs = startOfDay(input.endDate).getTime()

  for (const date of studyDates) {
    const hojeMs = startOfDay(date).getTime()
    const slots: ScheduledSession[] = []
    mockDayCounter++

    // Modo "30 dias pré-prova": sem estudo novo, e simulado semanal
    const diasAteProva = Math.floor((fimMs - hojeMs) / DIA_MS)
    const usePrePresence = (input.prePresenceMode ?? true) && diasAteProva >= 0 &&
      diasAteProva <= (input.prePresenceWindowDays ?? DEFAULT_PRE_PRESENCE_WINDOW)
    const effectiveMockInterval = usePrePresence ? Math.min(7, mockInterval) : mockInterval
    const isMockDay = (input.includeMocks ?? true) && mockDayCounter % effectiveMockInterval === 0
    let livre = isMockDay ? Math.max(bloco, focoDia - sessionMin * 2) : focoDia

    // 5a. As revisões vencidas abrem o dia (as que caíram em dia sem estudo vêm
    //     para o próximo), usando no máximo metade do tempo; o que não couber
    //     tenta de novo amanhã, até 7 dias de atraso.
    const vencidas = revisoes.filter((r) => r.vence <= hojeMs && hojeMs - r.vence <= ATRASO_MAX_REVISAO_DIAS * DIA_MS)
    revisoes = revisoes.filter((r) => r.vence > hojeMs)
    const porMateria = new Map<string, Revisao>()
    for (const r of vencidas) {
      const acumulada = porMateria.get(r.subjectId)
      if (acumulada) acumulada.minutos += r.minutos
      else porMateria.set(r.subjectId, { ...r })
    }
    const tetoRevisao = Math.floor(livre / 2)
    let emRevisao = 0
    for (const r of porMateria.values()) {
      const minutos = Math.max(5, Math.ceil(r.minutos / 5 - 1e-9) * 5)
      if (emRevisao + minutos > tetoRevisao) {
        revisoes.push(r)
        continue
      }
      slots.push({ date, subjectId: r.subjectId, subjectName: r.subjectName, durationMin: minutos, type: 'REVISAO', order: slots.length })
      emRevisao += minutos
    }
    livre -= emRevisao

    // 5b. O resto do dia: estudo e questões, em sessões de até 2 pomodoros.
    let lastPicked = slots.length ? slots[slots.length - 1].subjectId : null
    while (livre >= bloco) {
      const sid = pickNextSubject(lastPicked)
      if (!sid) break
      const q = queues.get(sid)!
      const primeiro = q[cursors[sid]++]
      let blocos = 1
      while (blocos < blocosPorSessao && livre >= (blocos + 1) * bloco && cursors[sid] < q.length && q[cursors[sid]].type === primeiro.type) {
        cursors[sid]++
        blocos++
      }
      const duracao = blocos * bloco
      // Pré-prova: o estudo novo vira revisão geral ou questões (alterna)
      let tipo: ScheduledSessionType = primeiro.type
      if (usePrePresence && tipo === 'ESTUDO') tipo = slots.length % 2 === 0 ? 'REVISAO' : 'QUESTOES'

      slots.push({ date, subjectId: primeiro.subjectId, subjectName: primeiro.subjectName, durationMin: duracao, type: tipo, order: slots.length })
      livre -= duracao
      lastPicked = sid

      if (tipo === 'ESTUDO') {
        for (const r of REVISOES) {
          const vence = startOfDay(addDays(date, r.diasDepois)).getTime()
          if (vence <= fimMs) revisoes.push({ subjectId: sid, subjectName: primeiro.subjectName, minutos: duracao * r.fracao, vence })
        }
      }
    }

    if (isMockDay) {
      slots.push({
        date,
        subjectId: null,
        subjectName: null,
        durationMin: sessionMin * 2,
        type: 'SIMULADO',
        order: slots.length,
      })
    }

    allSessions.push(...slots)
  }

  // 6. perSubject summary: o tempo que cada matéria recebeu (estudo, questões e revisões)
  const perSubject: ScheduleResult['perSubject'] = {}
  for (const s of input.subjects) {
    perSubject[s.id] = { name: s.name, minutes: 0, sessions: 0, weight: s.weight }
  }
  for (const sessao of allSessions) {
    if (!sessao.subjectId || !perSubject[sessao.subjectId]) continue
    perSubject[sessao.subjectId].minutes += sessao.durationMin
    perSubject[sessao.subjectId].sessions++
  }

  return {
    totalDays: Math.floor((startOfDay(input.endDate).getTime() - startOfDay(input.startDate).getTime()) / 86400000) + 1,
    studyDays,
    totalMinAvailable,
    totalMinRecommended,
    deficit,
    isFeasible,
    perSubject,
    sessions: allSessions,
  }
}
