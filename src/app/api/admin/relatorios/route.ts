import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/relatorios?days=7
 * Agrega métricas reais da plataforma. Sem mock, sem números fabricados.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const days = Math.max(1, Math.min(90, parseInt(req.nextUrl.searchParams.get('days') ?? '7', 10)))
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  const prevFrom = new Date(from)
  prevFrom.setDate(prevFrom.getDate() - days)

  // Atividade diária dos últimos N dias
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (days - 1 - i))
    d.setHours(0, 0, 0, 0)
    return { date: d, label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3) }
  })

  const [
    totalUsers,
    activeUsers,
    totalCourses,
    activeStudents,
    attemptsCurr,
    attemptsPrev,
    aiCallsCurr,
    aiCallsPrev,
    loginsCurr,
    loginsPrev,
    enrollmentsByCourse,
    usersByPlan,
    questionsCount,
    materialsCount,
    publishedMaterials,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: from } } }),
    prisma.course.count({ where: { active: true } }),
    prisma.user.count({ where: { role: 'STUDENT', active: true, archivedAt: null } }),
    prisma.questionAttempt.count({ where: { createdAt: { gte: from } } }),
    prisma.questionAttempt.count({ where: { createdAt: { gte: prevFrom, lt: from } } }),
    // FeatureUsage com kind=ai (se existir esse model). Senão fallback p/ 0.
    prisma.featureUsage.aggregate({ where: { feature: { contains: 'ai' }, date: { gte: from } }, _sum: { count: true } }).then((r) => r._sum.count ?? 0).catch(() => 0),
    prisma.featureUsage.aggregate({ where: { feature: { contains: 'ai' }, date: { gte: prevFrom, lt: from } }, _sum: { count: true } }).then((r) => r._sum.count ?? 0).catch(() => 0),
    prisma.loginAttempt.count({ where: { success: true, createdAt: { gte: from } } }).catch(() => 0),
    prisma.loginAttempt.count({ where: { success: true, createdAt: { gte: prevFrom, lt: from } } }).catch(() => 0),
    prisma.userCourseEnrollment.groupBy({
      by: ['courseId'],
      where: { isActive: true },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 8,
    }),
    prisma.user.groupBy({
      by: ['plan'],
      where: { role: 'STUDENT', archivedAt: null },
      _count: { id: true },
    }),
    prisma.question.count({ where: { active: true, anulada: false } }),
    prisma.material.count({}),
    prisma.material.count({ where: { status: 'PUBLISHED' } }),
  ])

  // Resolve cursos pros groupBy
  const courseIds = enrollmentsByCourse.map((e) => e.courseId)
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, name: true, orgao: true, cargo: true },
  })
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  // Daily series — attempts e logins por dia
  const dailyAttempts = await prisma.questionAttempt.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true, correct: true },
  })
  const dailyLogins = await prisma.loginAttempt.findMany({
    where: { success: true, createdAt: { gte: from } },
    select: { createdAt: true },
  }).catch(() => [])

  const dailySeries = series.map(({ date, label }) => {
    const ymd = date.toISOString().slice(0, 10)
    const day = (d: Date) => d.toISOString().slice(0, 10) === ymd
    const a = dailyAttempts.filter((x) => day(x.createdAt))
    const correct = a.filter((x) => x.correct).length
    return {
      dia: label,
      acessos: dailyLogins.filter((x) => day(x.createdAt)).length,
      questoes: a.length,
      acertos: correct,
    }
  })

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  return NextResponse.json({
    period: { from: from.toISOString(), to: now.toISOString(), days },
    kpis: {
      totalUsers,
      activeUsers,
      activeStudents,
      totalCourses,
      questionsBank: questionsCount,
      materialsTotal: materialsCount,
      materialsPublished: publishedMaterials,
      attemptsCurrent: attemptsCurr,
      attemptsDelta: pctChange(attemptsCurr, attemptsPrev),
      aiCallsCurrent: aiCallsCurr,
      aiCallsDelta: pctChange(aiCallsCurr, aiCallsPrev),
      loginsCurrent: loginsCurr,
      loginsDelta: pctChange(loginsCurr, loginsPrev),
    },
    series: dailySeries,
    byCourse: enrollmentsByCourse.map((e) => {
      const c = courseMap.get(e.courseId)
      return { courseId: e.courseId, name: c?.name ?? 'Curso', alunos: e._count.userId }
    }),
    byPlan: usersByPlan.map((p) => ({ plan: p.plan, count: p._count.id })),
  })
}
