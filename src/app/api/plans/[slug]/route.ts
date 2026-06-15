import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/plans/[slug]
 * Retorna UM plano ativo por slug — INCLUSIVE planos ocultos (isVisible=false).
 * Usado pelo checkout pra planos de link-direto (ex.: planos de teste,
 * promoções privadas) que não aparecem na lista pública /api/plans/public.
 *
 * Só retorna planos active=true (não vende plano desativado).
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const p = await prisma.pricingPlan.findFirst({
    where: { slug: params.slug, active: true },
    select: {
      id: true, slug: true, name: true, description: true,
      type: true, interval: true, priceCents: true, pixDiscount: true,
      moneyBackDays: true, coverageType: true, coverageData: true,
      maxCourses: true, features: true, badge: true,
      limitTotal: true, soldCount: true,
    },
  })
  if (!p) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

  return NextResponse.json({
    plan: {
      ...p,
      slotsLeft: p.limitTotal ? Math.max(0, p.limitTotal - p.soldCount) : null,
      soldOut: p.limitTotal ? p.soldCount >= p.limitTotal : false,
    },
  })
}
