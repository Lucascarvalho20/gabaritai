import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const plans = await prisma.pricingPlan.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const plan = await prisma.pricingPlan.create({
    data: {
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      type: body.type,
      interval: body.interval,
      priceCents: parseInt(body.priceCents, 10),
      coverageType: body.coverageType,
      coverageData: body.coverageData ?? null,
      maxCourses: body.maxCourses ?? null,
      features: body.features ?? [],
      pixDiscount: body.pixDiscount ?? 10,
      moneyBackDays: body.moneyBackDays ?? 7,
      badge: body.badge ?? null,
      limitTotal: body.limitTotal ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(plan, { status: 201 })
}
