import { prisma } from '@/lib/prisma'
import { fulfillPayment } from '@/lib/checkout-fulfillment'
import { PaymentStatus } from '@prisma/client'
import type { MpPayment } from '@/lib/mercadopago'

const MP_STATUS_TO_LOCAL: Record<string, PaymentStatus> = {
  approved: 'APPROVED',
  authorized: 'APPROVED',
  pending: 'PENDING',
  in_process: 'PENDING',
  in_mediation: 'PENDING',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
  refunded: 'REFUNDED',
  charged_back: 'REFUNDED',
}

export type SyncResult =
  | { ok: true; status: PaymentStatus; paymentId: string; fulfilled?: boolean }
  | { ok: false; reason: string; flagged?: string }

/**
 * Aplica o estado de um pagamento do Mercado Pago no Payment local.
 *
 * Usado tanto pelo webhook (push do MP) quanto pelo endpoint de status
 * (pull/polling do frontend). Idempotente: o fulfillment só roda uma vez
 * (guardado por `paidAt`). Inclui a checagem anti-fraude de valor divergente.
 */
export async function applyMpPaymentToLocal(mpPayment: MpPayment): Promise<SyncResult> {
  const localPaymentId = mpPayment.external_reference
  if (!localPaymentId) return { ok: false, reason: 'no_external_ref' }

  const payment = await prisma.payment.findUnique({ where: { id: localPaymentId } })
  if (!payment) return { ok: false, reason: 'local_payment_not_found' }

  // Anti-fraude: o valor recebido bate com o que cobramos?
  const expectedAmount = Number(payment.amount.toFixed(2))
  const receivedAmount = Number(mpPayment.transaction_amount.toFixed(2))
  if (Math.abs(expectedAmount - receivedAmount) > 0.01 && mpPayment.status === 'approved') {
    console.error('[payment-sync] VALOR DIVERGENTE — possível fraude', {
      local: localPaymentId, expected: expectedAmount, received: receivedAmount,
    })
    await prisma.payment.update({
      where: { id: localPaymentId },
      data: {
        status: 'REJECTED',
        providerPaymentId: String(mpPayment.id),
        rawWebhook: { ...mpPayment, _fraudFlag: 'amount_mismatch' } as any,
      },
    })
    return { ok: false, reason: 'amount_mismatch', flagged: 'amount_mismatch' }
  }

  const newStatus = MP_STATUS_TO_LOCAL[mpPayment.status] ?? 'PENDING'
  const wasUnpaid = !payment.paidAt

  await prisma.payment.update({
    where: { id: localPaymentId },
    data: {
      providerPaymentId: String(mpPayment.id),
      status: newStatus,
      paymentMethod: mpPayment.payment_type_id,
      installments: mpPayment.installments ?? null,
      rawWebhook: mpPayment as any,
      paidAt: newStatus === 'APPROVED' ? new Date(mpPayment.date_approved ?? Date.now()) : payment.paidAt,
    },
  })

  let fulfilled = false
  if (newStatus === 'APPROVED' && wasUnpaid) {
    try {
      await fulfillPayment(localPaymentId)
      fulfilled = true
    } catch (err: any) {
      console.error('[payment-sync] fulfillment falhou:', err)
      // Admin pode reprocessar via /admin/pagamentos
    }
  }

  return { ok: true, status: newStatus, paymentId: localPaymentId, fulfilled }
}
