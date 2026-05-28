/**
 * Cria um plano de estudo padrão pra um aluno + curso recém-escolhido.
 *
 * Estratégia template (sem IA):
 *   - 3h/dia, seg a sex (5 dias/semana)
 *   - Duração: até a dataProva do edital ativo, OU 90 dias se não tiver
 *   - Matérias distribuídas proporcionalmente ao peso (CourseSubject.weight)
 *   - Sessões agendadas em dias úteis sequenciais
 *
 * Usado depois do cadastro inicial pra o aluno já abrir o dashboard
 * com cronograma pronto, sem precisar configurar nada.
 */

import { prisma } from '@/lib/prisma'

const DEFAULT_HOURS_PER_DAY = 3
const DEFAULT_DAYS_PER_WEEK = [1, 2, 3, 4, 5] // seg-sex
const FALLBACK_DAYS = 90

export async function createDefaultStudyPlan(opts: {
  userId: string
  courseId: string
}): Promise<{ studyPlanId: string; sessionsCreated: number } | null> {
  const { userId, courseId } = opts

  // Já tem plano ativo pra esse curso? Pula.
  const existing = await prisma.studyPlan.findFirst({
    where: { userId, courseId, active: true },
    select: { id: true },
  })
  if (existing) return { studyPlanId: existing.id, sessionsCreated: 0 }

  // Busca edital ativo + matérias
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      editais: {
        where: { isActive: true },
        include: {
          subjects: { include: { subject: true }, orderBy: { weight: 'desc' } },
        },
        take: 1,
      },
      courseSubjects: {
        include: { subject: true },
        orderBy: { weight: 'desc' },
      },
    },
  })
  if (!course) return null

  const edital = course.editais[0] ?? null
  // Prefere matérias do edital (com pesos atualizados); fallback CourseSubject
  const subjects = edital
    ? edital.subjects.map((s) => ({
        subjectId: s.subjectId,
        name: s.subject.name,
        weight: s.weight ?? 1,
      }))
    : course.courseSubjects.map((cs) => ({
        subjectId: cs.subjectId,
        name: cs.subject.name,
        weight: cs.weight ?? 1,
      }))

  if (subjects.length === 0) return null

  // Datas do plano
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  let endDate: Date
  if (edital?.dataProva && edital.dataProva > startDate) {
    endDate = new Date(edital.dataProva)
  } else {
    endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + FALLBACK_DAYS)
  }

  // Conta dias úteis no período
  const studyDays: Date[] = []
  const cur = new Date(startDate)
  while (cur <= endDate) {
    if (DEFAULT_DAYS_PER_WEEK.includes(cur.getDay())) {
      studyDays.push(new Date(cur))
    }
    cur.setDate(cur.getDate() + 1)
  }
  const totalSessions = studyDays.length
  if (totalSessions === 0) return null

  const totalHoursAvailable = totalSessions * DEFAULT_HOURS_PER_DAY
  const totalWeight = subjects.reduce((s, m) => s + m.weight, 0)

  // Cria plano
  const plan = await prisma.studyPlan.create({
    data: {
      userId,
      courseId,
      editalId: edital?.id ?? null,
      hoursPerDay: DEFAULT_HOURS_PER_DAY,
      daysPerWeek: DEFAULT_DAYS_PER_WEEK,
      startDate,
      endDate,
      totalHoursAvailable,
      totalHoursNeeded: totalHoursAvailable, // simplificação — template não calcula deficit
      isFeasible: true,
      deficit: 0,
      active: true,
    },
    select: { id: true },
  })

  // Distribui sessões: pra cada dia útil, escolhe uma matéria proporcionalmente ao peso
  // Estratégia round-robin ponderada — gera lista de subjectIds proporcional aos pesos
  const subjectQueue: string[] = []
  for (const s of subjects) {
    const count = Math.max(1, Math.round((s.weight / totalWeight) * totalSessions))
    for (let i = 0; i < count; i++) subjectQueue.push(s.subjectId)
  }

  // Embaralha um pouco pra não ficar todas as sessões da mesma matéria juntas
  // (mas mantém ordem geral por peso)
  const sessions = studyDays.map((date, i) => {
    const subjectId = subjectQueue[i % subjectQueue.length]
    return {
      studyPlanId: plan.id,
      subjectId,
      date,
      durationMin: DEFAULT_HOURS_PER_DAY * 60,
      type: 'ESTUDO' as const,
      status: 'PENDENTE' as const,
    }
  })

  // Limita a 60 sessões iniciais pra não estourar (~ 12 semanas).
  // Resto pode ser gerado depois quando o aluno avançar.
  const sessionsToCreate = sessions.slice(0, 60)
  if (sessionsToCreate.length > 0) {
    await prisma.studyPlanSession.createMany({
      data: sessionsToCreate,
      skipDuplicates: true,
    })
  }

  return { studyPlanId: plan.id, sessionsCreated: sessionsToCreate.length }
}
