import { prisma } from './prisma'
import { buildSchedule, ScheduleInput, ScheduleResult } from './schedule-algorithm'
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
}

export async function resolveSubjects(dto: { courseId: string; editalId?: string }) {
  if (dto.editalId) {
    const editalSubjects = await prisma.editalSubject.findMany({
      where: { editalId: dto.editalId },
      include: { subject: true },
      orderBy: { order: 'asc' },
    })
    return editalSubjects.map((es) => ({
      id: es.subjectId,
      name: es.subject.name,
      weight: es.weight,
    }))
  }
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId: dto.courseId },
    include: { subject: true },
    orderBy: { order: 'asc' },
  })
  return courseSubjects.map((cs) => ({
    id: cs.subjectId,
    name: cs.subject.name,
    weight: cs.weight,
  }))
}

export async function runSchedule(dto: ScheduleDto): Promise<ScheduleResult> {
  const subjects = await resolveSubjects(dto)
  if (subjects.length === 0) throw new Error('Curso/edital sem matérias cadastradas.')

  const input: ScheduleInput = {
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    hoursPerDay: dto.hoursPerDay,
    daysPerWeek: dto.daysPerWeek,
    subjects,
    sessionDurationMin: dto.sessionDurationMin,
    includeMocks: dto.includeMocks ?? true,
  }
  return buildSchedule(input)
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

export function summarize(result: ScheduleResult) {
  return {
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
