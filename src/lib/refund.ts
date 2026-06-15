/**
 * Política e processamento de reembolso (garantia de satisfação).
 *
 * Regras (definidas pelo João, 2026-06-15):
 *   - Janela base: 15 dias a partir do pagamento.
 *   - Se o aluno USOU o trial de 7 dias antes de pagar, descontam-se 7 dias
 *     (ele já teve tempo de avaliar) → janela efetiva = 8 dias.
 *   - TRAVA DE USO: o reembolso só vale pra quem realmente quase não usou.
 *     Se o consumo passar dos limites abaixo, não é elegível (anti-abuso:
 *     impede "estudar tudo 1 mês antes da prova e pedir o dinheiro de volta").
 *
 * Tudo configurável aqui em cima.
 */
import { prisma } from './prisma'
import { refundPayment } from './mercadopago'
import { audit } from './audit-log'

// ─── Configuração da política ────────────────────────────────────────────────
export const REFUND_POLICY = {
  baseWindowDays: 15,
  trialDiscountDays: 7,        // desconta se o aluno usou o trial
  caps: {
    questionsAnswered: 80,     // questões respondidas
    studySessions: 8,          // sessões de estudo concluídas
    mockExams: 2,              // simulados finalizados
    flashcardReviews: 120,     // revisões de flashcard
  },
} as const

export type RefundUsage = {
  questionsAnswered: number
  studySessions: number
  mockExams: number
  flashcardReviews: number
}

export type RefundEligibility = {
  eligible: boolean
  reason: string
  payment: { id: string; amount: number; paidAt: Date | null } | null
  windowDays: number
  daysSincePaid: number | null
  daysLeft: number | null
  usedTrial: boolean
  usage: RefundUsage
  caps: typeof REFUND_POLICY.caps
  capExceeded: string[]   // quais limites foram estourados
}

/** Conta o uso do aluno desde o pagamento (ou total, o que for mais justo). */
async function getUsageSince(userId: string, since: Date): Promise<RefundUsage> {
  const [questionsAnswered, studySessions, mockExams, flashcardReviews] = await Promise.all([
    prisma.questionAttempt.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.studySession.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.mockExamResult.count({ where: { userId, finishedAt: { gte: since } } }),
    prisma.flashcardReview.count({ where: { userId, createdAt: { gte: since } } }),
  ])
  return { questionsAnswered, studySessions, mockExams, flashcardReviews }
}

/**
 * Avalia se o pagamento mais recente APROVADO do aluno é elegível a reembolso.
 * Não estorna nada — só calcula. Use no front (banner/CTA) e no endpoint.
 */
export async function checkRefundEligibility(userId: string): Promise<RefundEligibility> {
  const payment = await prisma.payment.findFirst({
    where: { userId, status: 'APPROVED' },
    orderBy: { paidAt: 'desc' },
    select: { id: true, amount: true, paidAt: true, pricingPlanSlug: true },
  })

  const usedTrial = !!(await prisma.trialPeriod.findFirst({ where: { userId }, select: { id: true } }))
  const windowDays = REFUND_POLICY.baseWindowDays - (usedTrial ? REFUND_POLICY.trialDiscountDays : 0)

  const emptyUsage: RefundUsage = { questionsAnswered: 0, studySessions: 0, mockExams: 0, flashcardReviews: 0 }

  if (!payment || !payment.paidAt) {
    return {
      eligible: false, reason: 'Nenhum pagamento aprovado encontrado.',
      payment: null, windowDays, daysSincePaid: null, daysLeft: null,
      usedTrial, usage: emptyUsage, caps: REFUND_POLICY.caps, capExceeded: [],
    }
  }

  // Planos vitalícios em promoção e trials gratuitos não entram na garantia
  if (payment.pricingPlanSlug?.startsWith('trial-')) {
    return {
      eligible: false, reason: 'Trial gratuito não é reembolsável.',
      payment: { id: payment.id, amount: payment.amount, paidAt: payment.paidAt },
      windowDays, daysSincePaid: 0, daysLeft: 0, usedTrial,
      usage: emptyUsage, caps: REFUND_POLICY.caps, capExceeded: [],
    }
  }

  const daysSincePaid = Math.floor((Date.now() - payment.paidAt.getTime()) / 86400000)
  const daysLeft = Math.max(0, windowDays - daysSincePaid)
  const usage = await getUsageSince(userId, payment.paidAt)

  const capExceeded: string[] = []
  if (usage.questionsAnswered > REFUND_POLICY.caps.questionsAnswered) capExceeded.push('questões')
  if (usage.studySessions > REFUND_POLICY.caps.studySessions) capExceeded.push('sessões de estudo')
  if (usage.mockExams > REFUND_POLICY.caps.mockExams) capExceeded.push('simulados')
  if (usage.flashcardReviews > REFUND_POLICY.caps.flashcardReviews) capExceeded.push('flashcards')

  let eligible = true
  let reason = 'Elegível para reembolso integral.'
  if (daysSincePaid > windowDays) {
    eligible = false
    reason = `Fora da janela de garantia (${windowDays} dias). Já se passaram ${daysSincePaid} dias.`
  } else if (capExceeded.length > 0) {
    eligible = false
    reason = `Uso acima do limite da garantia (${capExceeded.join(', ')}). A garantia é pra quem testou pouco e não se adaptou.`
  }

  return {
    eligible, reason,
    payment: { id: payment.id, amount: payment.amount, paidAt: payment.paidAt },
    windowDays, daysSincePaid, daysLeft, usedTrial,
    usage, caps: REFUND_POLICY.caps, capExceeded,
  }
}

/**
 * Processa o reembolso de um Payment: estorna no MercadoPago, marca REFUNDED,
 * revoga acesso (desativa matrículas + plano FREE) se não houver outro
 * pagamento aprovado vigente, e audita. Usado pelo admin e pelo auto-serviço.
 */
export async function processRefund(opts: {
  paymentId: string
  reason: string
  byUserId: string        // quem disparou (admin ou o próprio aluno)
  bySelf: boolean
  amount?: number
  ip?: string
}): Promise<{ refundId: number; amount: number; accessRevoked: boolean; enrollmentsRevoked: number }> {
  const payment = await prisma.payment.findUnique({ where: { id: opts.paymentId } })
  if (!payment) throw new Error('Pagamento não encontrado')
  if (payment.status !== 'APPROVED') throw new Error(`Só pagamentos APROVADOS podem ser estornados (atual: ${payment.status})`)
  if (!payment.providerPaymentId) throw new Error('Pagamento sem ID do provedor — estorne manualmente no painel do Mercado Pago')

  const refund = await refundPayment(payment.providerPaymentId, opts.amount)

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      metadata: {
        ...(typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {}),
        refund: {
          id: refund.id, amount: refund.amount, reason: opts.reason,
          at: new Date().toISOString(), by: opts.byUserId, bySelf: opts.bySelf,
        },
      } as any,
    },
  })

  // Revoga acesso se não houver outro pagamento vigente
  const outroAtivo = await prisma.payment.findFirst({
    where: {
      userId: payment.userId, status: 'APPROVED', id: { not: payment.id },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  })

  let enrollmentsRevoked = 0
  if (!outroAtivo) {
    const upd = await prisma.userCourseEnrollment.updateMany({
      where: { userId: payment.userId, isActive: true },
      data: { isActive: false },
    })
    enrollmentsRevoked = upd.count
    await prisma.user.update({ where: { id: payment.userId }, data: { plan: 'FREE' } }).catch(() => {})
  }

  await audit({
    actorId: opts.byUserId,
    action: 'PAYMENT_RECEIVED',
    ip: opts.ip,
    metadata: {
      type: 'REFUND', paymentId: payment.id, userId: payment.userId,
      amount: refund.amount, reason: opts.reason, bySelf: opts.bySelf,
      enrollmentsRevoked, keptAccess: !!outroAtivo,
    },
  }).catch(() => {})

  return { refundId: refund.id, amount: refund.amount, accessRevoked: !outroAtivo, enrollmentsRevoked }
}
