import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { PaymentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const planSlug = searchParams.get('plan') ?? undefined
  const days = parseInt(searchParams.get('days') ?? '30', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '50', 10), 200)

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const where = {
    createdAt: { gte: since },
    ...(status && { status: status as PaymentStatus }),
    ...(planSlug && { pricingPlanSlug: planSlug }),
  }

  const [payments, total, statsApproved, statsAll] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, status: 'APPROVED' },
      _sum: { amount: true },
      _count: { _all: true },
      _avg: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
  ])

  const stats = {
    revenue: statsApproved._sum.amount ?? 0,
    approvedCount: statsApproved._count._all,
    avgTicket: statsApproved._avg.amount ?? 0,
    approvalRate: total > 0 ? (statsApproved._count._all / total) * 100 : 0,
    byStatus: statsAll.reduce((acc, row) => ({ ...acc, [row.status]: row._count._all }), {} as Record<string, number>),
  }

  return NextResponse.json({
    payments,
    stats,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}
