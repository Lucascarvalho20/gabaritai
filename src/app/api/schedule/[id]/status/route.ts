import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/schedule/[id]/status
// Retorna status do plano: % concluído, dias atraso, viabilidade, alerta de horas insuficientes.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const plan = await prisma.studyPlan.findFirst({
    where: { id: params.id, userId: user.id },
    include: { course: true, edital: true },
  })
  if (!plan) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sessões totais e concluídas
  const [totalSessions, completedSessions, pendingPast, completedThisWeek] = await Promise.all([
    prisma.studyPlanSession.count({ where: { studyPlanId: params.id } }),
    prisma.studyPlanSession.count({ where: { studyPlanId: params.id, status: 'CONCLUIDO' } }),
    prisma.studyPlanSession.findMany({
      where: { studyPlanId: params.id, status: 'PENDENTE', date: { lt: today } },
      orderBy: { date: 'asc' },
      take: 100,
    }),
    prisma.studyPlanSession.count({
      where: {
        studyPlanId: params.id,
        status: 'CONCLUIDO',
        date: {
          gte: (() => { const d = new Date(today); d.setDate(d.getDate() - 7); return d })(),
        },
      },
    }),
  ])

  // % do plano concluído
  const percentCompleted = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

  // % do edital concluído (baseado em UserSubjectMastery + TopicAttempt)
  let percentEdital = 0
  let masteryByMateria: Array<{ name: string; mastery: number; weight: number }> = []
  if (plan.editalId) {
    const editalSubjects = await prisma.editalSubject.findMany({
      where: { editalId: plan.editalId },
      include: { subject: true },
    })
    const masteries = await prisma.userSubjectMastery.findMany({
      where: { userId: user.id, courseId: plan.courseId },
    })
    const masteryById = new Map(masteries.map((m) => [m.subjectId, m.masteryScore]))

    const totalWeight = editalSubjects.reduce((s, es) => s + es.weight, 0) || 1
    let weightedSum = 0
    for (const es of editalSubjects) {
      const m = masteryById.get(es.subjectId) ?? 0
      weightedSum += m * es.weight
      masteryByMateria.push({ name: es.subject.name, mastery: Math.round(m), weight: es.weight })
    }
    percentEdital = Math.round(weightedSum / totalWeight)
  }

  // Dias atrasado: dia mais antigo de sessão PENDENTE
  let diasAtrasado = 0
  let primeiraPendente: Date | null = null
  if (pendingPast.length > 0) {
    primeiraPendente = pendingPast[0].date
    diasAtrasado = Math.floor((today.getTime() - new Date(pendingPast[0].date).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Última atividade do user
  const lastLogin = user.role === 'ADMIN' ? null : await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastLoginAt: true },
  })
  const lastStudyAt = await prisma.studyPlanSession.findFirst({
    where: { studyPlanId: params.id, status: 'CONCLUIDO' },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  })

  // Validação: horas disponíveis vs necessárias
  const sessoesRestantes = totalSessions - completedSessions
  const minutosRestantes = await prisma.studyPlanSession.aggregate({
    where: { studyPlanId: params.id, status: { not: 'CONCLUIDO' } },
    _sum: { durationMin: true },
  })
  const horasRestantes = Math.round((minutosRestantes._sum.durationMin ?? 0) / 60)

  const diasAtePrava = Math.max(0, Math.ceil((new Date(plan.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  // Dias ÚTEIS restantes (respeita os dias da semana que o aluno escolheu)
  const diasSemana = new Set<number>(Array.isArray(plan.daysPerWeek) ? (plan.daysPerWeek as number[]) : [1, 2, 3, 4, 5])
  let diasUteisRestantes = 0
  {
    const c = new Date(today)
    const fim = new Date(plan.endDate)
    while (c <= fim) {
      if (diasSemana.has(c.getDay())) diasUteisRestantes++
      c.setDate(c.getDate() + 1)
    }
  }

  const horasDisponiveisRestantes = diasUteisRestantes * plan.hoursPerDay
  const insuficiente = horasDisponiveisRestantes < horasRestantes
  // Horas/dia mínimas pra zerar o edital até a prova (nos dias úteis restantes)
  const horasMinimasPorDia = diasUteisRestantes > 0
    ? Math.ceil((horasRestantes / diasUteisRestantes) * 10) / 10
    : null
  // "Ideal" = mínimo + 20% de folga pra revisão/imprevisto
  const horasIdeaisPorDia = horasMinimasPorDia != null
    ? Math.ceil(horasMinimasPorDia * 1.2 * 10) / 10
    : null

  // Aviso final
  const warnings: Array<{ kind: 'atraso' | 'tempo' | 'inativo' | 'meta'; message: string }> = []
  if (diasAtrasado >= 3) {
    warnings.push({
      kind: 'atraso',
      message: `Você tem ${pendingPast.length} sessões em atraso (mais antiga há ${diasAtrasado} dias). Clique em "Recalcular cronograma" pra redistribuir.`,
    })
  } else if (diasAtrasado > 0) {
    warnings.push({
      kind: 'atraso',
      message: `${pendingPast.length} sessão(ões) em atraso. Continue de onde parou ou recalcule se rotina mudou.`,
    })
  }
  if (insuficiente && horasMinimasPorDia != null) {
    warnings.push({
      kind: 'tempo',
      message: `⚠️ Com ${plan.hoursPerDay}h/dia você NÃO termina o edital até a prova. Pra zerar a tempo, estude no mínimo ${horasMinimasPorDia}h/dia (ideal: ${horasIdeaisPorDia}h/dia pra dar folga de revisão).`,
    })
  }
  if (percentEdital >= 70 && completedThisWeek === 0) {
    warnings.push({
      kind: 'meta',
      message: 'Você está perto de fechar o edital! Mantenha a constância.',
    })
  }

  return NextResponse.json({
    plan: {
      id: plan.id,
      hoursPerDay: plan.hoursPerDay,
      endDate: plan.endDate,
      isFeasible: plan.isFeasible && !insuficiente,
    },
    diasAtePrava,
    diasAtrasado,
    pendingPastCount: pendingPast.length,
    primeiraPendente,
    percentCompleted,
    percentEdital,
    horasRestantes,
    horasDisponiveisRestantes: Math.round(horasDisponiveisRestantes),
    diasUteisRestantes,
    horasMinimasPorDia,
    horasIdeaisPorDia,
    insuficiente,
    masteryByMateria,
    lastStudyAt: lastStudyAt?.completedAt ?? null,
    warnings,
  })
}
