import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getCacheStats } from '@/lib/ai-cache'

// GET /api/admin/insights
// Métricas avançadas:
//  - cursos mais comprados (pagamentos APPROVED por courseSlug)
//  - cursos mais estudados (sessões CONCLUIDO por courseId)
//  - matérias mais estudadas (sessões por subjectId)
//  - tópicos mais estudados (sessões por topicId)
//  - ferramentas mais usadas (FeatureUsage)
//  - estatísticas cache IA
//  - top alunos (mais XP)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const last7 = new Date(Date.now() - 7 * 24 * 3600 * 1000)

  // Top cursos comprados (últimos 30 dias)
  const paymentsByPlan = await prisma.payment.groupBy({
    by: ['pricingPlanSlug', 'courseSlug'],
    where: { status: 'APPROVED', paidAt: { gte: last30 } },
    _count: { _all: true },
    _sum: { amount: true },
  })

  // Cursos mais estudados (sessões CONCLUIDO últimos 30d)
  const studyByCourse = await prisma.studyPlanSession.groupBy({
    by: ['studyPlanId'],
    where: { status: 'CONCLUIDO', completedAt: { gte: last30 } },
    _count: { _all: true },
    _sum: { durationMin: true },
  })
  const planIds = studyByCourse.map((s) => s.studyPlanId)
  const plans = planIds.length ? await prisma.studyPlan.findMany({
    where: { id: { in: planIds } },
    include: { course: { select: { id: true, name: true, slug: true, cargo: true } } },
  }) : []
  const cursosEstudadosMap = new Map<string, { name: string; cargo: string | null; sessions: number; minutes: number }>()
  for (const s of studyByCourse) {
    const plan = plans.find((p) => p.id === s.studyPlanId)
    if (!plan) continue
    const key = plan.course.slug
    const existing = cursosEstudadosMap.get(key) ?? { name: plan.course.name, cargo: plan.course.cargo, sessions: 0, minutes: 0 }
    existing.sessions += s._count._all
    existing.minutes += s._sum.durationMin ?? 0
    cursosEstudadosMap.set(key, existing)
  }
  const cursosMaisEstudados = Array.from(cursosEstudadosMap.entries())
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10)

  // Matérias mais estudadas
  const studyBySubject = await prisma.studyPlanSession.groupBy({
    by: ['subjectId'],
    where: { status: 'CONCLUIDO', completedAt: { gte: last30 }, subjectId: { not: null } },
    _count: { _all: true },
    _sum: { durationMin: true },
  })
  const subjectIds = studyBySubject.map((s) => s.subjectId!).filter(Boolean)
  const subjects = subjectIds.length ? await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true, slug: true },
  }) : []
  const subjectMap = new Map(subjects.map((s) => [s.id, s]))
  const materiasMaisEstudadas = studyBySubject
    .map((s) => ({
      subjectId: s.subjectId!,
      name: subjectMap.get(s.subjectId!)?.name ?? '?',
      slug: subjectMap.get(s.subjectId!)?.slug ?? '?',
      sessions: s._count._all,
      minutes: s._sum.durationMin ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15)

  // Tópicos mais estudados (granular)
  const studyByTopic = await prisma.studyPlanSession.groupBy({
    by: ['topicId'],
    where: { status: 'CONCLUIDO', completedAt: { gte: last30 }, topicId: { not: null } },
    _count: { _all: true },
  })
  const topicIds = studyByTopic.map((t) => t.topicId!).filter(Boolean).slice(0, 15)
  const topics = topicIds.length ? await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    include: { subject: { select: { name: true } } },
  }) : []
  const topicMap = new Map(topics.map((t) => [t.id, t]))
  const topicosMaisEstudados = studyByTopic
    .filter((t) => topicMap.has(t.topicId!))
    .map((t) => ({
      topicId: t.topicId!,
      name: topicMap.get(t.topicId!)?.name ?? '?',
      subjectName: topicMap.get(t.topicId!)?.subject.name ?? '?',
      sessions: t._count._all,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15)

  // Ferramentas mais usadas (últimos 7 dias)
  const features = await prisma.featureUsage.groupBy({
    by: ['feature'],
    where: { date: { gte: last7 } },
    _sum: { count: true },
  })
  const ferramentasUsadas = features
    .map((f) => ({ feature: f.feature, count: f._sum.count ?? 0 }))
    .sort((a, b) => b.count - a.count)

  // Top alunos por estudos completados (gamification)
  const topStudentsRaw = await prisma.studyPlanSession.groupBy({
    by: ['studyPlanId'],
    where: { status: 'CONCLUIDO' },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })
  const topPlanIds = topStudentsRaw.map((s) => s.studyPlanId)
  const topPlans = topPlanIds.length ? await prisma.studyPlan.findMany({
    where: { id: { in: topPlanIds } },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } }, course: { select: { name: true, cargo: true } } },
  }) : []
  const topAlunos = topStudentsRaw.map((s) => {
    const plan = topPlans.find((p) => p.id === s.studyPlanId)
    return {
      userId: plan?.userId ?? '?',
      name: plan?.user.name ?? '?',
      avatar: plan?.user.avatar,
      course: plan?.course.name ?? '?',
      sessions: s._count._all,
    }
  })

  // Cache IA stats
  const cacheStats = await getCacheStats().catch(() => ({ totalEntries: 0, byKind: [] }))

  // Quota: top usuários gastando mais IA
  const topQuotaUsers = await prisma.dailyAIQuota.groupBy({
    by: ['userId'],
    where: { date: { gte: last30 } },
    _sum: { count: true },
    orderBy: { _sum: { count: 'desc' } },
    take: 10,
  })
  const quotaUserIds = topQuotaUsers.map((q) => q.userId)
  const quotaUsers = quotaUserIds.length ? await prisma.user.findMany({
    where: { id: { in: quotaUserIds } },
    select: { id: true, name: true, email: true },
  }) : []
  const topConsumidoresIA = topQuotaUsers.map((q) => {
    const u = quotaUsers.find((x) => x.id === q.userId)
    return {
      userId: q.userId,
      name: u?.name ?? '?',
      email: u?.email ?? '?',
      totalRequests: q._sum.count ?? 0,
    }
  })

  return NextResponse.json({
    period: 'últimos 30 dias',
    paymentsByPlan: paymentsByPlan.map((p) => ({
      planSlug: p.pricingPlanSlug,
      courseSlug: p.courseSlug,
      sales: p._count._all,
      revenue: p._sum.amount ?? 0,
    })).sort((a, b) => b.sales - a.sales).slice(0, 10),
    cursosMaisEstudados,
    materiasMaisEstudadas,
    topicosMaisEstudados,
    ferramentasUsadas,
    topAlunos,
    cacheStats,
    topConsumidoresIA,
  })
}
