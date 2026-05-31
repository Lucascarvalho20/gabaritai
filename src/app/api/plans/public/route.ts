import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Sempre roda no servidor — não pré-renderizar (depende do banco)
export const dynamic = 'force-dynamic'

/**
 * Lista pública dos planos visíveis pro checkout.
 * Sem auth (qualquer um pode ver os preços).
 */
export async function GET() {
  const plans = await prisma.pricingPlan.findMany({
    where: { active: true, isVisible: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      interval: true,
      priceCents: true,
      pixDiscount: true,
      moneyBackDays: true,
      coverageType: true,
      coverageData: true,
      maxCourses: true,
      features: true,
      badge: true,
      limitTotal: true,
      soldCount: true,
    },
  })

  return NextResponse.json({
    plans: plans.map((p) => ({
      ...p,
      slotsLeft: p.limitTotal ? Math.max(0, p.limitTotal - p.soldCount) : null,
      soldOut: p.limitTotal ? p.soldCount >= p.limitTotal : false,
    })),
  })
}
