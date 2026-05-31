/**
 * Algoritmo determinístico de cronograma de estudos.
 *
 * Recebe matérias (com pesos) + janela de tempo + disponibilidade do aluno,
 * e produz um cronograma diário até a data da prova:
 *   - distribui o tempo proporcional ao peso de cada matéria
 *   - divide entre ESTUDO / REVISÃO / QUESTÕES (Pomodoro de 50min)
 *   - intercala matérias dia a dia (não cansar)
 *   - adiciona SIMULADO quinzenal
 *   - calcula se o tempo disponível é suficiente (deficit)
 *
 * NÃO usa IA. Pura matemática + round-robin.
 */

export type ScheduleSubjectInput = {
  id: string
  name: string
  weight: number
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
  hoursPerSubjectRecommended?: number // baseline pra cálculo de "vai dar tempo" (default 60)
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

const DEFAULT_SESSION_MIN = 50
const DEFAULT_MOCK_INTERVAL = 14
const DEFAULT_RECOMMENDED_HOURS = 60
const DEFAULT_PRE_PRESENCE_WINDOW = 30

// Mix padrão durante o período normal
const MIX = { ESTUDO: 0.65, REVISAO: 0.2, QUESTOES: 0.15 } as const
// Mix dos últimos 30 dias (modo intensivo pré-prova): zero ESTUDO novo
const MIX_PRE_PROVA = { ESTUDO: 0, REVISAO: 0.55, QUESTOES: 0.45 } as const

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

/**
 * Gera a fila de sessões POR MATÉRIA, intercalando tipo (ESTUDO/REVISÃO/QUESTÕES).
 * Retorna mapa { subjectId -> sessions[] }.
 */
function buildPerSubjectQueue(
  subjects: ScheduleSubjectInput[],
  minutesPerSubject: Record<string, number>,
  sessionMin: number,
): Map<string, Array<{ subjectId: string; subjectName: string; type: ScheduledSessionType }>> {
  const map = new Map<string, Array<{ subjectId: string; subjectName: string; type: ScheduledSessionType }>>()

  for (const s of subjects) {
    const totalMin = minutesPerSubject[s.id] ?? 0
    const totalSessions = Math.floor(totalMin / sessionMin)
    if (totalSessions <= 0) {
      map.set(s.id, [])
      continue
    }

    const nEstudo = Math.max(1, Math.floor(totalSessions * MIX.ESTUDO))
    const nRevisao = Math.floor(totalSessions * MIX.REVISAO)
    const nQuestoes = Math.max(0, totalSessions - nEstudo - nRevisao)

    const queue: Array<{ subjectId: string; subjectName: string; type: ScheduledSessionType }> = []

    // Padrão de intercalação: ESTUDO, ESTUDO, REVISAO, ESTUDO, QUESTOES, ...
    // Primeiro 2 semanas só ESTUDO; depois mistura revisão e questões.
    let estudoLeft = nEstudo, revisaoLeft = nRevisao, questoesLeft = nQuestoes
    let i = 0
    while (estudoLeft + revisaoLeft + questoesLeft > 0) {
      const inWarmup = i < 6 // primeiras 6 sessões = puro estudo
      if (inWarmup && estudoLeft > 0) {
        queue.push({ subjectId: s.id, subjectName: s.name, type: 'ESTUDO' })
        estudoLeft--
      } else {
        // Rotação: 3x ESTUDO, 1x REVISAO, 1x QUESTOES
        const mod = i % 5
        if (mod < 3 && estudoLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'ESTUDO' })
          estudoLeft--
        } else if (mod === 3 && revisaoLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'REVISAO' })
          revisaoLeft--
        } else if (mod === 4 && questoesLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'QUESTOES' })
          questoesLeft--
        } else if (estudoLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'ESTUDO' })
          estudoLeft--
        } else if (revisaoLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'REVISAO' })
          revisaoLeft--
        } else if (questoesLeft > 0) {
          queue.push({ subjectId: s.id, subjectName: s.name, type: 'QUESTOES' })
          questoesLeft--
        }
      }
      i++
    }
    map.set(s.id, queue)
  }
  return map
}

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const sessionMin = input.sessionDurationMin ?? DEFAULT_SESSION_MIN
  const mockInterval = input.mockEveryNDays ?? DEFAULT_MOCK_INTERVAL
  const recommendedHoursPerSubject = input.hoursPerSubjectRecommended ?? DEFAULT_RECOMMENDED_HOURS

  // 1. Dias úteis (dias que o aluno realmente vai estudar)
  const studyDates = enumerateStudyDays(input.startDate, input.endDate, input.daysPerWeek)
  const studyDays = studyDates.length

  const sessionsPerDay = Math.max(1, Math.floor((input.hoursPerDay * 60) / sessionMin))
  const totalMinAvailable = studyDays * sessionsPerDay * sessionMin

  // 2. Tempo recomendado (baseline) — usado pra calcular "vai dar tempo?"
  const totalWeight = input.subjects.reduce((acc, s) => acc + s.weight, 0) || 1
  const recommendedHoursTotal = input.subjects.reduce(
    (acc, s) => acc + (s.weight / totalWeight) * input.subjects.length * recommendedHoursPerSubject,
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

  // 4. Fila de sessões por matéria
  const queues = buildPerSubjectQueue(input.subjects, minutesPerSubject, sessionMin)

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

  for (const date of studyDates) {
    const slots: ScheduledSession[] = []
    let lastPicked: string | null = null

    mockDayCounter++
    // Modo pré-prova: simulado mais frequente (a cada 7 dias em vez de 14)
    const isInPrePresence = (input.prePresenceMode ?? true) && (() => {
      const window = input.prePresenceWindowDays ?? DEFAULT_PRE_PRESENCE_WINDOW
      const msToEnd = startOfDay(input.endDate).getTime() - startOfDay(date).getTime()
      const daysToEnd = Math.floor(msToEnd / 86400000)
      return daysToEnd >= 0 && daysToEnd <= window
    })()
    const effectiveMockInterval = isInPrePresence ? Math.min(7, mockInterval) : mockInterval
    const isMockDay = (input.includeMocks ?? true) && mockDayCounter % effectiveMockInterval === 0
    const effectiveSlots = isMockDay ? Math.max(1, sessionsPerDay - 2) : sessionsPerDay

    // Detecta modo "30 dias pré-prova": substitui tipo ESTUDO por REVISAO/QUESTOES
    const usePrePresence = (input.prePresenceMode ?? true) && (() => {
      const window = input.prePresenceWindowDays ?? DEFAULT_PRE_PRESENCE_WINDOW
      const msToEnd = startOfDay(input.endDate).getTime() - startOfDay(date).getTime()
      const daysToEnd = Math.floor(msToEnd / 86400000)
      return daysToEnd >= 0 && daysToEnd <= window
    })()

    for (let slotIdx = 0; slotIdx < effectiveSlots; slotIdx++) {
      const sid = pickNextSubject(lastPicked)
      if (!sid) break
      const q = queues.get(sid)!
      const next = q[cursors[sid]++]
      lastPicked = sid

      // Pré-prova: força tipo REVISAO ou QUESTOES (alterna), mesmo se a fila pediu ESTUDO
      let effectiveType: ScheduledSessionType = next.type
      if (usePrePresence && next.type === 'ESTUDO') {
        effectiveType = slotIdx % 2 === 0 ? 'REVISAO' : 'QUESTOES'
      }

      slots.push({
        date,
        subjectId: next.subjectId,
        subjectName: next.subjectName,
        durationMin: sessionMin,
        type: effectiveType,
        order: slotIdx,
      })
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

  // 6. perSubject summary
  const perSubject: ScheduleResult['perSubject'] = {}
  for (const s of input.subjects) {
    const used = (cursors[s.id] ?? 0) * sessionMin
    perSubject[s.id] = {
      name: s.name,
      minutes: used,
      sessions: cursors[s.id] ?? 0,
      weight: s.weight,
    }
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
