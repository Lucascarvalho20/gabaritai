import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { createPreference, isSandboxMode } from '@/lib/mercadopago'
import { Plan } from '@prisma/client'
import { apiError } from '@/lib/api-errors'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

const PRICING_TO_PLAN: Record<string, Plan> = {
  TRIAL: Plan.FREE,
  SINGLE_COURSE: Plan.BASIC,
  COMBO: Plan.PREMIUM,
  FULL_ACCESS: Plan.PREMIUM,
  VITALICIO_PROMO: Plan.LIFETIME,
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Faça login pra continuar' }, { status: 401 })

  // Rate limit: máx 10 checkouts/min por user, 30 por IP (anti-spam pagamento)
  const ip = getClientIp(req)
  const userRL = rateLimit({ key: `checkout:user:${user.id}`, windowMs: 60_000, max: 10 })
  const ipRL = rateLimit({ key: `checkout:ip:${ip}`, windowMs: 60_000, max: 30 })
  if (!userRL.allowed || !ipRL.allowed) {
    return NextResponse.json({
      message: 'Muitas tentativas — espera 1 minuto e tenta de novo.',
      retryAt: Math.max(userRL.resetAt, ipRL.resetAt),
    }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { planSlug, courseSlug, useDiscount, couponCode } = body
    if (!planSlug) return NextResponse.json({ message: 'planSlug obrigatório' }, { status: 400 })

    const plan = await prisma.pricingPlan.findUnique({ where: { slug: planSlug } })
    if (!plan || !plan.active) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    // Vitalício promo: verifica limite
    if (plan.limitTotal && plan.soldCount >= plan.limitTotal) {
      return NextResponse.json({ message: 'Plano esgotado — todos os lugares foram preenchidos.' }, { status: 410 })
    }

    // Planos SINGLE_COURSE/TRIAL exigem courseSlug
    if (plan.coverageType === 'SPECIFIC' && !courseSlug) {
      return NextResponse.json({ message: 'Escolha um curso pra este plano' }, { status: 400 })
    }
    if (courseSlug) {
      const c = await prisma.course.findUnique({ where: { slug: courseSlug } })
      if (!c) return NextResponse.json({ message: 'Curso inválido' }, { status: 400 })
    }

    // Calcula preço final (com desconto Pix se aplicável)
    const baseCents = plan.priceCents
    let finalCents = useDiscount && plan.pixDiscount > 0
      ? Math.round(baseCents * (1 - plan.pixDiscount / 100))
      : baseCents

    // Aplica cupom (se válido)
    let appliedCoupon: { id: string; code: string; discountCents: number } | null = null
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase().trim() } })
      if (coupon && coupon.active) {
        const now = new Date()
        const valid =
          (!coupon.validFrom || now >= coupon.validFrom) &&
          (!coupon.validUntil || now <= coupon.validUntil) &&
          (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
          (!Array.isArray(coupon.appliesToPlans) || (coupon.appliesToPlans as string[]).length === 0 || (coupon.appliesToPlans as string[]).includes(plan.slug)) &&
          (!coupon.minAmountCents || baseCents >= coupon.minAmountCents)

        const usedByUser = await prisma.couponRedemption.count({
          where: { couponId: coupon.id, userId: user.id },
        })

        if (valid && usedByUser < coupon.maxPerUser) {
          const discountCents = coupon.type === 'PERCENT'
            ? Math.round((finalCents * coupon.value) / 100)
            : Math.min(coupon.value, finalCents)
          finalCents = Math.max(0, finalCents - discountCents)
          appliedCoupon = { id: coupon.id, code: coupon.code, discountCents }
        }
      }
    }

    const finalAmount = +(finalCents / 100).toFixed(2)

    // 1. Cria registro de Payment (PENDING)
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        provider: 'mercadopago',
        pricingPlanId: plan.id,
        pricingPlanSlug: plan.slug,
        courseSlug: courseSlug ?? null,
        amount: finalAmount,
        plan: PRICING_TO_PLAN[plan.type],
        status: 'PENDING',
        metadata: { useDiscount: !!useDiscount, planType: plan.type, interval: plan.interval, coupon: appliedCoupon },
      },
    })

    // Trial é gratuito — pula MP e já marca como aprovado
    if (plan.priceCents === 0) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'APPROVED', paidAt: new Date() },
      })
      // Fulfillment direto (sem webhook)
      const { fulfillPayment } = await import('@/lib/checkout-fulfillment')
      await fulfillPayment(payment.id)
      return NextResponse.json({
        ok: true,
        free: true,
        paymentId: payment.id,
        redirect: '/checkout/sucesso?payment=' + payment.id,
      })
    }

    // 2. Cria preference no MP
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const pref = await createPreference({
      items: [{
        title: plan.name,
        description: plan.description ?? `Plano ${plan.name} — Gabaritai`,
        quantity: 1,
        unit_price: finalAmount,
      }],
      payer: {
        name: user.name,
        email: user.email ?? undefined,
      },
      external_reference: payment.id,
      notification_url: `${baseUrl}/api/payments/webhook`,
      back_urls: {
        success: `${baseUrl}/checkout/sucesso?payment=${payment.id}`,
        failure: `${baseUrl}/checkout/falha?payment=${payment.id}`,
        pending: `${baseUrl}/checkout/pendente?payment=${payment.id}`,
      },
      auto_return: 'approved',
      metadata: {
        userId: user.id,
        planSlug: plan.slug,
        paymentId: payment.id,
        courseSlug: courseSlug ?? null,
      },
      payment_methods: useDiscount && plan.pixDiscount > 0 ? {
        // Se aplicou desconto Pix, exclui cartão (pra evitar fraude do desconto)
        excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }],
      } : undefined,
    })

    // 3. Salva preference ID no Payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPreferenceId: pref.id, rawPreference: pref as any },
    })

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      preferenceId: pref.id,
      checkoutUrl: isSandboxMode() ? pref.sandbox_init_point : pref.init_point,
      sandbox: isSandboxMode(),
    })
  } catch (err: any) {
    return apiError(err, 'Erro ao criar checkout', 'checkout-create')
  }
}
