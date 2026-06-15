/**
 * Cria o cronograma de estudos de um aluno + curso — versão RICA, nível de tópico.
 *
 * O que ele faz (sem IA, pura matemática + round-robin ponderado):
 *   - Resolve as matérias do edital ativo (peso) e, dentro de cada uma, os
 *     TÓPICOS (não arquivados, ordenados).
 *   - Para cada tópico agenda: ESTUDO (ler material) → QUESTÕES (praticar).
 *   - Intercala REVISÃO espaçada de tópicos já estudados (fixação).
 *   - Encaixa SIMULADO semanal (domingo) — o aluno faz o simulado compartilhado
 *     da semana (gerado do banco de questões; custo ~zero).
 *   - Modo pré-prova: nos últimos 30 dias, corta ESTUDO novo e foca
 *     REVISÃO + QUESTÕES + SIMULADO.
 *   - Calcula se dá tempo até a data da prova (deficit / isFeasible).
 *
 * Mantém a MESMA assinatura da versão anterior (createDefaultStudyPlan), então
 * completar-cadastro, diagnóstico e recalculate-for-primary continuam funcionando.
 */

import { prisma } from '@/lib/prisma'

const DEFAULT_HOURS_PER_DAY = 3
const DEFAULT_DAYS_PER_WEEK = [1, 2, 3, 4, 5] // seg-sex
const FALLBACK_DAYS = 90
const SESSION_MIN = 50                  // pomodoro
const MAX_PERSISTED_SESSIONS = 180      // ~3 meses; resto recalcula depois
const PRE_PROVA_WINDOW_DAYS = 30
const REVISAO_EVERY = 5                 // a cada 5 sessões, 1 revisão
const SIMULADO_WEEKDAY = 0              // domingo

type SessType = 'ESTUDO' | 'REVISAO' | 'QUESTOES' | 'SIMULADO'
type QueueItem = { subjectId: string; topicId: string | null; type: SessType }

export async function createDefaultStudyPlan(opts: {
  userId: string
  courseId: string
  priorityFraquezas?: string[]   // subjectIds fracos → peso dobrado
  forceReplace?: boolean
  hoursPerDay?: number
  daysPerWeek?: number[]
}): Promise<{ studyPlanId: string; sessionsCreated: number; isFeasible: boolean; deficitDays: number } | null> {
  const {
    userId, courseId, priorityFraquezas = [], forceReplace = false,
    hoursPerDay = DEFAULT_HOURS_PER_DAY, daysPerWeek = DEFAULT_DAYS_PER_WEEK,
  } = opts

  // Já tem plano ativo?
  const existing = await prisma.studyPlan.findFirst({
    where: { userId, courseId, active: true },
    select: { id: true },
  })
  if (existing) {
    if (!forceReplace) return { studyPlanId: existing.id, sessionsCreated: 0, isFeasible: true, deficitDays: 0 }
    await prisma.studyPlanSession.deleteMany({ where: { studyPlanId: existing.id, status: 'PENDENTE' } })
    await prisma.studyPlan.update({ where: { id: existing.id }, data: { active: false } })
  }

  const fraquezasSet = new Set(priorityFraquezas)

  // Curso + edital ativo + matérias
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      editais: {
        where: { isActive: true },
        include: { subjects: { include: { subject: true }, orderBy: { weight: 'desc' } } },
        take: 1,
      },
      courseSubjects: { include: { subject: true }, orderBy: { weight: 'desc' } },
    },
  })
  if (!course) return null

  const edital = course.editais[0] ?? null
  const subjectsRaw = edital
    ? edital.subjects.map((s) => ({ subjectId: s.subjectId, name: s.subject.name, weight: s.weight ?? 1 }))
    : course.courseSubjects.map((cs) => ({ subjectId: cs.subjectId, name: cs.subject.name, weight: cs.weight ?? 1 }))

  const subjects = subjectsRaw.map((s) => ({
    ...s, weight: fraquezasSet.has(s.subjectId) ? s.weight * 2 : s.weight,
  }))
  if (subjects.length === 0) return null

  // Tópicos por matéria (não arquivados, raiz, ordenados)
  const topicsBySubject = new Map<string, Array<{ id: string }>>()
  for (const s of subjects) {
    const topics = await prisma.topic.findMany({
      where: { subjectId: s.subjectId, archivedAt: null, parentId: null },
      orderBy: { order: 'asc' },
      select: { id: true },
    })
    topicsBySubject.set(s.subjectId, topics)
  }

  // Fila ESTUDO+QUESTÕES por tópico, intercalando matérias por peso
  const baseQueue: QueueItem[] = []
  const revisaoQueue: QueueItem[] = []
  const cursor: Record<string, number> = Object.fromEntries(subjects.map((s) => [s.subjectId, 0]))
  const usage: Record<string, number> = Object.fromEntries(subjects.map((s) => [s.subjectId, 0]))
  const totalWeight = subjects.reduce((a, s) => a + s.weight, 0) || 1

  let remaining = subjects.reduce((a, s) => a + (topicsBySubject.get(s.subjectId)?.length ?? 0), 0)
  while (remaining > 0) {
    let best: string | null = null
    let bestRatio = Infinity
    for (const s of subjects) {
      const topics = topicsBySubject.get(s.subjectId) ?? []
      if (cursor[s.subjectId] >= topics.length) continue
      const ratio = usage[s.subjectId] / s.weight
      if (ratio < bestRatio) { bestRatio = ratio; best = s.subjectId }
    }
    if (!best) break
    const topics = topicsBySubject.get(best)!
    const t = topics[cursor[best]++]
    baseQueue.push({ subjectId: best, topicId: t.id, type: 'ESTUDO' })
    baseQueue.push({ subjectId: best, topicId: t.id, type: 'QUESTOES' })
    revisaoQueue.push({ subjectId: best, topicId: t.id, type: 'REVISAO' })
    usage[best] += 1
    remaining--
  }

  // Sem tópicos cadastrados → cai pro nível de matéria
  if (baseQueue.length === 0) {
    for (const s of subjects) {
      const n = Math.max(1, Math.round((s.weight / totalWeight) * 40))
      for (let i = 0; i < n; i++) baseQueue.push({ subjectId: s.subjectId, topicId: null, type: 'ESTUDO' })
    }
  }

  // Intercala REVISÃO espaçada
  const finalQueue: QueueItem[] = []
  let revIdx = 0
  for (let i = 0; i < baseQueue.length; i++) {
    finalQueue.push(baseQueue[i])
    if ((i + 1) % REVISAO_EVERY === 0 && revIdx < revisaoQueue.length) {
      finalQueue.push(revisaoQueue[revIdx++])
    }
  }

  // Datas
  const startDate = new Date(); startDate.setHours(0, 0, 0, 0)
  let endDate: Date
  if (edital?.dataProva && edital.dataProva > startDate) {
    endDate = new Date(edital.dataProva)
  } else {
    endDate = new Date(startDate); endDate.setDate(endDate.getDate() + FALLBACK_DAYS)
  }
  const prePresenceStart = new Date(endDate); prePresenceStart.setDate(prePresenceStart.getDate() - PRE_PROVA_WINDOW_DAYS)

  // Dias úteis
  const studyDays: Date[] = []
  const allowed = new Set(daysPerWeek)
  const cur = new Date(startDate)
  while (cur <= endDate) {
    if (allowed.has(cur.getDay())) studyDays.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  if (studyDays.length === 0) return null

  const sessionsPerDay = Math.max(1, Math.floor((hoursPerDay * 60) / SESSION_MIN))
  const slotsAvailable = studyDays.length * sessionsPerDay

  // Deficit
  const simuladosEstimados = Math.ceil(studyDays.length / 5)
  const sessionsNeeded = finalQueue.length + simuladosEstimados
  const isFeasible = sessionsNeeded <= slotsAvailable
  const deficitSessions = Math.max(0, sessionsNeeded - slotsAvailable)
  const deficitDays = Math.ceil(deficitSessions / sessionsPerDay)

  const totalHoursAvailable = +((slotsAvailable * SESSION_MIN) / 60).toFixed(1)
  const totalHoursNeeded = +((sessionsNeeded * SESSION_MIN) / 60).toFixed(1)

  const plan = await prisma.studyPlan.create({
    data: {
      userId, courseId, editalId: edital?.id ?? null,
      hoursPerDay, daysPerWeek,
      startDate, endDate,
      totalHoursAvailable, totalHoursNeeded,
      isFeasible, deficit: Math.max(0, totalHoursNeeded - totalHoursAvailable),
      active: true,
    },
    select: { id: true },
  })

  // Distribui sessões nos dias (cap em MAX_PERSISTED_SESSIONS)
  const toCreate: Array<{
    studyPlanId: string; subjectId: string | null; topicId: string | null
    date: Date; durationMin: number; type: SessType; status: 'PENDENTE'
  }> = []

  let qi = 0
  for (const day of studyDays) {
    if (toCreate.length >= MAX_PERSISTED_SESSIONS) break
    const isPreProva = day >= prePresenceStart
    const isSimuladoDay = day.getDay() === SIMULADO_WEEKDAY
    let slots = sessionsPerDay

    if (isSimuladoDay) {
      toCreate.push({ studyPlanId: plan.id, subjectId: null, topicId: null, date: new Date(day), durationMin: 90, type: 'SIMULADO', status: 'PENDENTE' })
      slots--
    }

    while (slots > 0 && qi < finalQueue.length) {
      let item = finalQueue[qi]
      // Pré-prova: pula ESTUDO novo
      if (isPreProva && item.type === 'ESTUDO') {
        let j = qi
        while (j < finalQueue.length && finalQueue[j].type === 'ESTUDO') j++
        if (j >= finalQueue.length) {
          item = { ...item, type: 'QUESTOES' }
        } else {
          qi = j
          item = finalQueue[qi]
        }
      }
      toCreate.push({
        studyPlanId: plan.id, subjectId: item.subjectId, topicId: item.topicId,
        date: new Date(day), durationMin: SESSION_MIN, type: item.type, status: 'PENDENTE',
      })
      qi++
      slots--
      if (toCreate.length >= MAX_PERSISTED_SESSIONS) break
    }
  }

  if (toCreate.length > 0) {
    await prisma.studyPlanSession.createMany({ data: toCreate, skipDuplicates: true })
  }

  return { studyPlanId: plan.id, sessionsCreated: toCreate.length, isFeasible, deficitDays }
}
