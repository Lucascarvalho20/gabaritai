import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchPayment, verifyWebhookSignature } from '@/lib/mercadopago'
import { fulfillPayment } from '@/lib/checkout-fulfillment'
import { PaymentStatus } from '@prisma/client'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit anti-spam (legítimo MP raramente excede)
  const rl = rateLimit({ key: `mp-webhook:${ip}`, windowMs: 60_000, max: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, throttled: true }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)

    const type = searchParams.get('type') ?? body.type
    const paymentIdMp = searchParams.get('data.id') ?? body.data?.id ?? body.id
    const requestId = req.headers.get('x-request-id')
    const signature = req.headers.get('x-signature')

    // Valida assinatura HMAC (silencioso em dev se MERCADOPAGO_WEBHOOK_SECRET não setado)
    const sig = verifyWebhookSignature({
      signatureHeader: signature,
      requestId,
      dataId: paymentIdMp ? String(paymentIdMp) : null,
    })
    if (!sig.valid) {
      console.warn('[webhook] assinatura inválida:', sig.reason, { ip, requestId })
      // Retorna 401 pra MP NÃO tentar de novo com mesmo payload assinado errado
      return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 })
    }

    if (type !== 'payment' || !paymentIdMp) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'not_payment_event' })
    }

    const mpPayment = await fetchPayment(paymentIdMp)
    const localPaymentId = mpPayment.external_reference
    if (!localPaymentId) {
      console.warn('[webhook] payment sem external_reference', mpPayment.id)
      return NextResponse.json({ ok: true, ignored: true, reason: 'no_external_ref' })
    }

    const payment = await prisma.payment.findUnique({ where: { id: localPaymentId } })
    if (!payment) {
      console.warn(`[webhook] Payment local ${localPaymentId} não encontrado`)
      return NextResponse.json({ ok: true, ignored: true, reason: 'local_payment_not_found' })
    }

    // Anti-fraude: o valor recebido bate com o que cobramos?
    const expectedAmount = Number(payment.amount.toFixed(2))
    const receivedAmount = Number(mpPayment.transaction_amount.toFixed(2))
    if (Math.abs(expectedAmount - receivedAmount) > 0.01 && mpPayment.status === 'approved') {
      console.error('[webhook] VALOR DIVERGENTE — possível fraude', {
        local: localPaymentId,
        expected: expectedAmount,
        received: receivedAmount,
      })
      // Marca como rejected e NÃO fulfill — admin investiga
      await prisma.payment.update({
        where: { id: localPaymentId },
        data: {
          status: 'REJECTED',
          providerPaymentId: String(mpPayment.id),
          rawWebhook: { ...mpPayment, _fraudFlag: 'amount_mismatch' } as any,
        },
      })
      return NextResponse.json({ ok: true, flagged: 'amount_mismatch' })
    }

    const newStatus = MP_STATUS_TO_LOCAL[mpPayment.status] ?? 'PENDING'
    const updated = await prisma.payment.update({
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

    if (newStatus === 'APPROVED' && !payment.paidAt) {
      try {
        await fulfillPayment(localPaymentId)
      } catch (err: any) {
        console.error('[webhook] fulfillment falhou:', err)
        // Admin pode reprocessar via /admin/pagamentos/{id}/refulfill
      }
    }

    return NextResponse.json({ ok: true, paymentId: updated.id, status: newStatus })
  } catch (err: any) {
    console.error('[webhook] error:', err.message)
    // 200 evita MP reenviar infinitamente; investigamos via log
    return NextResponse.json({ ok: false, message: err.message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'gabaritai-mp-webhook' })
}
