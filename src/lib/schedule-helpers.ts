import { prisma } from './prisma'
import { buildSchedule, ScheduleInput, ScheduleResult } from './schedule-algorithm'
import { aplicarDesempenho, type AjusteDesempenho, type Desempenho } from './peso-adaptativo'
import { StudySessionType, StudySessionStatus, Prisma } from '@prisma/client'

export type ScheduleDto = {
  courseId: string
  editalId?: string
  hoursPerDay: number
  daysPerWeek: number[]
  startDate: string
  endDate: string
  sessionDurationMin?: number
  includeMocks?: boolean
  // Modo turbo: cobre TODAS as matérias do edital (regra do produto), mas DOBRA
  // o tempo nas TOP N (mais pesadas, equivalente ao "verticalizado"). Aluno
  // escolhe ligar/desligar no /dashboard/cronograma.
  turbo?: boolean
  // Quantas matérias top vão receber peso 2x quando turbo=true (default 5).
  turboTopN?: number
  // Redistribui o tempo pelo acerto do aluno em cada matéria (peso-adaptativo.ts).
  // Opcional e desligado por padrão: a regra original do produto é cobrir o
  // edital pelo peso oficial, e o aluno escolhe se quer o ajuste.
  adaptarDesempenho?: boolean
}

export type ScheduleRun = ScheduleResult & { ajustesDesempenho?: AjusteDesempenho[] }

/** Acertos e tentativas do aluno por matéria, naquele curso. */
async function carregarDesempenho(userId: string, courseId: string): Promise<Map<string, Desempenho>> {
  const linhas = await prisma.userSubjectMastery.findMany({
    where: { userId, courseId },
    select: { subjectId: true, correctAttempts: true, totalAttempts: true },
  })
  return new Map(linhas.map((l) => [l.subjectId, { acertos: l.correctAttempts, tentativas: l.totalAttempts }]))
}

export async function resolveSubjects(dto: { courseId: string; editalId?: string; turbo?: boolean; turboTopN?: number }) {
  let subjects: Array<{ id: string; name: string; weight: number }>
  if (dto.editalId) {
    const editalSubjects = await prisma.editalSubject.findMany({
      where: { editalId: dto.editalId },
      include: { subject: true },
      orderBy: { order: 'asc' },
    })
    subjects = editalSubjects.map((es) => ({
      id: es.subjectId,
      name: es.subject.name,
      weight: es.weight,
    }))
  } else {
    const courseSubjects = await prisma.courseSubject.findMany({
      where: { courseId: dto.courseId },
      include: { subject: true },
      orderBy: { order: 'asc' },
    })
    subjects = courseSubjects.map((cs) => ({
      id: cs.subjectId,
      name: cs.subject.name,
      weight: cs.weight,
    }))
  }

  // Turbo mode: dobra peso das TOP N matérias (mais pesadas). Todas as
  // outras continuam aparecendo no cronograma — não pode pular nenhuma.
  if (dto.turbo && subjects.length > 0) {
    const topN = Math.max(1, Math.min(dto.turboTopN ?? 5, subjects.length))
    const sortedByWeight = [...subjects].sort((a, b) => b.weight - a.weight)
    const topIds = new Set(sortedByWeight.slice(0, topN).map((s) => s.id))
    subjects = subjects.map((s) => ({
      ...s,
      weight: topIds.has(s.id) ? s.weight * 2 : s.weight,
    }))
  }

  return subjects
}

/**
 * Como o desempenho ATUAL do aluno pesaria cada matéria deste plano.
 * Serve para a tela explicar o ajuste — sem isso a adaptação parece arbitrária.
 */
export async function ajustesDoPlano(plan: {
  userId: string; courseId: string; editalId: string | null; turbo: boolean
}): Promise<AjusteDesempenho[]> {
  const subjects = await resolveSubjects({
    courseId: plan.courseId,
    editalId: plan.editalId ?? undefined,
    turbo: plan.turbo,
  })
  return aplicarDesempenho(subjects, await carregarDesempenho(plan.userId, plan.courseId)).ajustes
}

export async function runSchedule(dto: ScheduleDto, userId?: string): Promise<ScheduleRun> {
  let subjects = await resolveSubjects({
    courseId: dto.courseId,
    editalId: dto.editalId,
    turbo: dto.turbo,
    turboTopN: dto.turboTopN,
  })
  if (subjects.length === 0) throw new Error('Curso/edital sem matérias cadastradas.')

  let ajustesDesempenho: AjusteDesempenho[] | undefined
  if (dto.adaptarDesempenho && userId) {
    const r = aplicarDesempenho(subjects, await carregarDesempenho(userId, dto.courseId))
    subjects = r.materias
    ajustesDesempenho = r.ajustes
  }

  const input: ScheduleInput = {
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    hoursPerDay: dto.hoursPerDay,
    daysPerWeek: dto.daysPerWeek,
    subjects,
    sessionDurationMin: dto.sessionDurationMin,
    includeMocks: dto.includeMocks ?? true,
  }
  return { ...buildSchedule(input), ajustesDesempenho }
}

export async function persistSchedule(userId: string, dto: ScheduleDto, result: ScheduleResult) {
  return prisma.$transaction(async (tx) => {
    await tx.studyPlan.updateMany({
      where: { userId, courseId: dto.courseId, active: true },
      data: { active: false },
    })

    const plan = await tx.studyPlan.create({
      data: {
        userId,
        courseId: dto.courseId,
        editalId: dto.editalId,
        hoursPerDay: dto.hoursPerDay,
        daysPerWeek: dto.daysPerWeek as unknown as Prisma.InputJsonValue,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalHoursNeeded: result.totalMinRecommended / 60,
        totalHoursAvailable: result.totalMinAvailable / 60,
        deficit: result.deficit / 60,
        isFeasible: result.isFeasible,
        turbo: Boolean(dto.turbo),
        adaptarDesempenho: Boolean(dto.adaptarDesempenho),
        active: true,
      },
    })

    if (result.sessions.length > 0) {
      await tx.studyPlanSession.createMany({
        data: result.sessions.map((s) => ({
          studyPlanId: plan.id,
          subjectId: s.subjectId,
          date: s.date,
          durationMin: s.durationMin,
          type: s.type as StudySessionType,
          status: StudySessionStatus.PENDENTE,
        })),
      })
    }

    return plan
  })
}

export function summarize(result: ScheduleRun) {
  return {
    ajustesDesempenho: result.ajustesDesempenho,
    studyDays: result.studyDays,
    totalDays: result.totalDays,
    totalHoursAvailable: +(result.totalMinAvailable / 60).toFixed(1),
    totalHoursRecommended: +(result.totalMinRecommended / 60).toFixed(1),
    deficitHours: +(result.deficit / 60).toFixed(1),
    isFeasible: result.isFeasible,
    sessionCount: result.sessions.length,
    perSubject: result.perSubject,
  }
}
