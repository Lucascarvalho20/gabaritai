/**
 * Fulfillment: aplica o plano comprado ao usuário.
 * Chamado pelo webhook quando pagamento é APROVADO.
 *
 * Responsável por:
 *  - Atualizar User.plan (legado FREE/BASIC/PREMIUM/LIFETIME)
 *  - Criar UserCourseEnrollment baseado na coverage do PricingPlan
 *  - Setar expiresAt nas matrículas conforme o intervalo
 *  - Incrementar soldCount (pra vitalício promo limitado)
 *  - Audit log
 */
import { prisma } from './prisma'
import { audit } from './audit-log'
import { telegramPaymentReceived } from './telegram'
import { sendEmail, buildPaymentReceiptEmail } from './email'
import { Plan, PricingType, PricingInterval, CoverageType, ConcursoArea } from '@prisma/client'

const PRICING_TO_PLAN: Record<PricingType, Plan> = {
  TRIAL: Plan.FREE,
  SINGLE_COURSE: Plan.BASIC,
  COMBO: Plan.PREMIUM,
  FULL_ACCESS: Plan.PREMIUM,
  VITALICIO_PROMO: Plan.LIFETIME,
}

function calcExpiresAt(interval: PricingInterval): Date | null {
  const now = Date.now()
  switch (interval) {
    case 'TRIAL':    return new Date(now + 3 * 24 * 60 * 60 * 1000)
    case 'MONTH':    return new Date(now + 30 * 24 * 60 * 60 * 1000)
    case 'YEAR':     return new Date(now + 365 * 24 * 60 * 60 * 1000)
    case 'LIFETIME': return null
    default:         return null
  }
}

async function resolveCourseIds(opts: {
  coverageType: CoverageType
  coverageData: any
  courseSlug?: string | null
  maxCourses: number | null
  planType: PricingType
}): Promise<string[]> {
  if (opts.coverageType === 'SPECIFIC') {
    const coverageSlugs = Array.isArray(opts.coverageData) ? (opts.coverageData as string[]) : []
    const isCombo = opts.planType === 'COMBO' || opts.planType === 'FULL_ACCESS'

    // Combo/FullAccess SPECIFIC: matricula em TODOS os cursos da coverageData (ignora courseSlug)
    if (isCombo && coverageSlugs.length > 0) {
      const courses = await prisma.course.findMany({
        where: { slug: { in: coverageSlugs }, active: true },
        select: { id: true },
      })
      return courses.map((c) => c.id)
    }

    // Single course: se vier courseSlug usa ele (validado no checkout que tá na coverageData se houver restrição).
    // Se NÃO vier courseSlug mas coverageData tem 1 curso, usa esse.
    const finalSlug = opts.courseSlug ?? (coverageSlugs.length === 1 ? coverageSlugs[0] : null)
    if (!finalSlug) return []
    const course = await prisma.course.findUnique({ where: { slug: finalSlug }, select: { id: true } })
    return course ? [course.id] : []
  }
  if (opts.coverageType === 'AREA') {
    const areas = Array.isArray(opts.coverageData) ? opts.coverageData : []
    const courses = await prisma.course.findMany({
      where: { active: true, area: { in: areas as ConcursoArea[] } },
      select: { id: true },
    })
    return courses.map((c) => c.id)
  }
  if (opts.coverageType === 'ALL') {
    const courses = await prisma.course.findMany({ where: { active: true }, select: { id: true } })
    return courses.map((c) => c.id)
  }
  return []
}

export async function fulfillPayment(paymentId: string): Promise<{ ok: boolean; enrolled: number; plan?: Plan }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Payment não encontrado')
  if (payment.status !== 'APPROVED') {
    return { ok: false, enrolled: 0 }
  }
  if (!payment.pricingPlanId) {
    console.warn(`[fulfillment] payment ${paymentId} sem pricingPlanId, pulando`)
    return { ok: false, enrolled: 0 }
  }

  const plan = await prisma.pricingPlan.findUnique({ where: { id: payment.pricingPlanId } })
  if (!plan) throw new Error('PricingPlan não encontrado')

  const courseIds = await resolveCourseIds({
    coverageType: plan.coverageType,
    coverageData: plan.coverageData,
    courseSlug: payment.courseSlug,
    maxCourses: plan.maxCourses,
    planType: plan.type,
  })

  const expiresAt = calcExpiresAt(plan.interval)
  const userPlanLegacy = PRICING_TO_PLAN[plan.type]

  // Tudo numa transação atômica
  const result = await prisma.$transaction(async (tx) => {
    // 1. Atualiza User.plan e hasFullAccess se aplicável
    await tx.user.update({
      where: { id: payment.userId },
      data: {
        plan: userPlanLegacy,
        ...(plan.coverageType === 'ALL' && { hasFullAccess: true }),
      },
    })

    // 2. Cria/atualiza matrículas. Primeiro enrollment do user vira principal.
    let enrolledCount = 0
    const hasOtherPrimary = await tx.userCourseEnrollment.count({
      where: { userId: payment.userId, isPrimary: true },
    })
    let shouldMarkNextAsPrimary = hasOtherPrimary === 0
    for (const courseId of courseIds) {
      const willBePrimary = shouldMarkNextAsPrimary
      await tx.userCourseEnrollment.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId } },
        update: {
          isActive: true,
          expiresAt,
          source: 'PAID',
          enrolledAt: new Date(),
          ...(willBePrimary && { isPrimary: true }),
        },
        create: {
          userId: payment.userId,
          courseId,
          isActive: true,
          isPrimary: willBePrimary,
          expiresAt,
          source: 'PAID',
        },
      })
      shouldMarkNextAsPrimary = false // só o primeiro vira principal
      enrolledCount++
    }

    // 3. Incrementa soldCount do plano (pra limites de vitalício)
    await tx.pricingPlan.update({
      where: { id: plan.id },
      data: { soldCount: { increment: 1 } },
    })

    // 4. Atualiza expiresAt do Payment
    await tx.payment.update({
      where: { id: paymentId },
      data: { expiresAt },
    })

    // 5. Registra uso de cupom (se houver)
    const meta = payment.metadata as any
    const coupon = meta?.coupon
    if (coupon?.id) {
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: payment.userId,
          paymentId: paymentId,
          amountDiscountCents: coupon.discountCents ?? 0,
        },
      })
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      })
    }

    return { enrolledCount }
  })

  await audit({
    actorId: payment.userId,
    action: 'PAYMENT_RECEIVED',
    metadata: {
      paymentId,
      pricingPlanSlug: payment.pricingPlanSlug,
      amount: payment.amount,
      courseSlug: payment.courseSlug,
      enrolledCount: result.enrolledCount,
    },
  })

  // Notifica admin no Telegram (fire-and-forget) + envia recibo por email
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { name: true, email: true },
  })

  telegramPaymentReceived({
    amount: payment.amount,
    planName: plan.name,
    userName: user?.name ?? '—',
    userEmail: user?.email ?? null,
    method: payment.paymentMethod,
    paymentId,
  }).catch(() => {})

  if (user?.email) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const receipt = buildPaymentReceiptEmail({
      name: user.name,
      planName: plan.name,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt ?? new Date(),
      paymentId,
      enrolledCount: result.enrolledCount,
      expiresAt,
      dashboardUrl: `${baseUrl}/dashboard`,
    })
    sendEmail({ to: user.email, ...receipt }).catch((err) => {
      console.error('[fulfillment] email falhou:', err)
    })
  }

  return { ok: true, enrolled: result.enrolledCount, plan: userPlanLegacy }
}
