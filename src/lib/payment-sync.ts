import { prisma } from '@/lib/prisma'
import { fulfillPayment } from '@/lib/checkout-fulfillment'
import { PaymentStatus } from '@prisma/client'
import type { MpPayment } from '@/lib/mercadopago'
import { transicaoPermitida } from '@/lib/payment-status'

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
 * (pull/polling do frontend). Três garantias:
 *
 *  - Status só anda pra frente (`transicaoPermitida`). Notificação atrasada
 *    dizendo "pending" não desfaz um "approved" que já foi gravado.
 *  - Liberação roda uma vez só, reivindicada por `fulfilledAt` com UPDATE
 *    condicional — quem decide é o Postgres, não a ordem de chegada.
 *  - Valor aprovado tem que bater com o cobrado (anti-fraude).
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

  const statusConhecido = MP_STATUS_TO_LOCAL[mpPayment.status]
  if (!statusConhecido) {
    // Status que não está no mapa não pode virar PENDING silenciosamente: isso
    // rebaixaria um pagamento já aprovado. Melhor não mexer e registrar.
    console.error('[payment-sync] status desconhecido do MP — nada alterado', {
      local: localPaymentId, statusMp: mpPayment.status,
    })
    return { ok: false, reason: `status_mp_desconhecido:${mpPayment.status}` }
  }
  const newStatus = statusConhecido

  if (!transicaoPermitida(payment.status as any, newStatus as any)) {
    // Leitura velha chegando depois da nova. Não escreve NADA — nem o
    // rawWebhook, senão o registro de auditoria passa a mostrar o estado
    // antigo como se fosse o último.
    console.warn('[payment-sync] transição ignorada (notificação fora de ordem)', {
      local: localPaymentId, de: payment.status, para: newStatus, statusMp: mpPayment.status,
    })
    return { ok: false, reason: `transicao_ignorada:${payment.status}->${newStatus}` }
  }

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
  if (newStatus === 'APPROVED') {
    // Reivindica o direito de liberar com um UPDATE condicional. `updateMany`
    // devolve quantas linhas mudou, e o Postgres garante que só UMA chamada
    // concorrente encontra `fulfilledAt` nulo — quem recebe 1 libera, os outros
    // recebem 0 e saem. Ler-e-depois-decidir, como era antes, deixava uma
    // janela entre a leitura e a escrita por onde dois webhooks passavam.
    const reivindicado = await prisma.payment.updateMany({
      where: { id: localPaymentId, fulfilledAt: null },
      data: { fulfilledAt: new Date() },
    })

    if (reivindicado.count === 1) {
      try {
        await fulfillPayment(localPaymentId)
        fulfilled = true
      } catch (err: any) {
        // Devolve a reivindicação. Sem isto, uma falha transitória (banco
        // indisponível, timeout) prenderia o pagamento no mesmo beco sem saída
        // que esta mudança existe pra eliminar.
        await prisma.payment.updateMany({
          where: { id: localPaymentId },
          data: { fulfilledAt: null },
        })
        console.error('[payment-sync] fulfillment falhou, reivindicação devolvida:', err)
      }
    }
  }

  return { ok: true, status: newStatus, paymentId: localPaymentId, fulfilled }
}
