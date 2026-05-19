import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ── Contagens básicas ─────────────────────────────────────────────────
  const [
    totalUsers,
    activeUsers,
    students,
    admins,
    fullAccessUsers,
    betaTesters,
    totalCourses,
    totalSubjects,
    totalQuestions,
    totalFlashcards,
    activeStudyPlans,
    completedSessions7d,
    questionAttempts7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { hasFullAccess: true } }),
    prisma.user.count({ where: { isBetaTester: true } }),
    prisma.course.count({ where: { active: true } }),
    prisma.subject.count({ where: { active: true } }),
    prisma.question.count({ where: { active: true, anulada: false } }),
    prisma.flashcard.count({ where: { active: true } }),
    prisma.studyPlan.count({ where: { active: true } }),
    prisma.studyPlanSession.count({ where: { status: 'CONCLUIDO', completedAt: { gte: sevenDaysAgo } } }),
    prisma.questionAttempt.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ])

  // ── Distribuição por plano ────────────────────────────────────────────
  const byPlan = await prisma.user.groupBy({
    by: ['plan'],
    where: { role: 'STUDENT' },
    _count: { _all: true },
  })

  // ── Receita estimada (planos atuais — placeholder até webhook MP) ─────
  const PRICING: Record<string, number> = { FREE: 0, BASIC: 59, PREMIUM: 97, LIFETIME: 0 }
  const mrrEstimated = byPlan.reduce((acc, row) => acc + (PRICING[row.plan] ?? 0) * row._count._all, 0)

  // ── Receita real (do Payment model) ──────────────────────────────────
  const approvedPayments = await prisma.payment.aggregate({
    where: { status: 'APPROVED' },
    _sum: { amount: true },
    _count: { _all: true },
  })
  const revenue30d = await prisma.payment.aggregate({
    where: { status: 'APPROVED', paidAt: { gte: thirtyDaysAgo } },
    _sum: { amount: true },
  })

  // ── Cadastros últimos 30 dias (por dia) ──────────────────────────────
  const signupsRaw: Array<{ day: Date; count: bigint }> = await prisma.$queryRaw`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
    FROM users
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY day ORDER BY day ASC
  `
  const signups = signupsRaw.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }))

  // ── Alunos por curso (top 10) ────────────────────────────────────────
  const enrollByCourse = await prisma.userCourseEnrollment.groupBy({
    by: ['courseId'],
    where: { isActive: true },
    _count: { _all: true },
  })
  const courseIds = enrollByCourse.map((e) => e.courseId)
  const courseMap = courseIds.length
    ? await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, slug: true, name: true, area: true },
      })
    : []
  const courseLookup = new Map(courseMap.map((c) => [c.id, c]))
  const byCourse = enrollByCourse
    .map((e) => {
      const c = courseLookup.get(e.courseId)
      return { courseId: e.courseId, slug: c?.slug ?? '?', name: c?.name ?? '?', count: e._count._all }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Logins recentes (heurística: lastStudyAt no profile) ─────────────
  const activeStudents30d = await prisma.userProfile.count({
    where: { lastStudyAt: { gte: thirtyDaysAgo } },
  })

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      students,
      admins,
      fullAccess: fullAccessUsers,
      betaTesters,
      activeStudents30d,
    },
    content: {
      courses: totalCourses,
      subjects: totalSubjects,
      questions: totalQuestions,
      flashcards: totalFlashcards,
    },
    engagement: {
      activeStudyPlans,
      completedSessions7d,
      questionAttempts7d,
    },
    revenue: {
      mrrEstimated,
      totalRevenue: approvedPayments._sum.amount ?? 0,
      totalPayments: approvedPayments._count._all,
      revenue30d: revenue30d._sum.amount ?? 0,
    },
    byPlan: byPlan.map((row) => ({ plan: row.plan, count: row._count._all })),
    signups,
    byCourse,
  })
}
