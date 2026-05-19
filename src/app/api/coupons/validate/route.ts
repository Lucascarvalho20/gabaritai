import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// POST /api/coupons/validate
// Body: { code, planSlug }
// Retorna desconto aplicável (se válido) sem aplicar ainda.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { code, planSlug } = await req.json()
  if (!code) return NextResponse.json({ message: 'code obrigatório' }, { status: 400 })

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  })

  if (!coupon || !coupon.active) {
    return NextResponse.json({ valid: false, message: 'Cupom inválido' }, { status: 404 })
  }

  const now = new Date()
  if (coupon.validFrom && now < coupon.validFrom) {
    return NextResponse.json({ valid: false, message: 'Cupom ainda não está ativo' }, { status: 400 })
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return NextResponse.json({ valid: false, message: 'Cupom expirou' }, { status: 400 })
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, message: 'Cupom esgotado' }, { status: 400 })
  }

  // Limite por user
  const usedByUser = await prisma.couponRedemption.count({
    where: { couponId: coupon.id, userId: user.id },
  })
  if (usedByUser >= coupon.maxPerUser) {
    return NextResponse.json({ valid: false, message: 'Você já usou este cupom o máximo permitido' }, { status: 400 })
  }

  // Verifica appliesToPlans
  if (planSlug && Array.isArray(coupon.appliesToPlans) && coupon.appliesToPlans.length > 0) {
    if (!(coupon.appliesToPlans as string[]).includes(planSlug)) {
      return NextResponse.json({ valid: false, message: 'Cupom não aplica a este plano' }, { status: 400 })
    }
  }

  // Verifica valor mínimo
  let planPrice = 0
  if (planSlug) {
    const plan = await prisma.pricingPlan.findUnique({ where: { slug: planSlug }, select: { priceCents: true } })
    planPrice = plan?.priceCents ?? 0
  }
  if (coupon.minAmountCents && planPrice < coupon.minAmountCents) {
    return NextResponse.json({
      valid: false,
      message: `Cupom requer plano de pelo menos R$ ${(coupon.minAmountCents / 100).toFixed(2)}`,
    }, { status: 400 })
  }

  // Calcula desconto
  let discountCents = 0
  if (coupon.type === 'PERCENT') {
    discountCents = Math.round((planPrice * coupon.value) / 100)
  } else {
    discountCents = Math.min(coupon.value, planPrice)
  }

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountCents,
    description: coupon.description,
    finalCents: Math.max(0, planPrice - discountCents),
  })
}
