import { NextRequest, NextResponse } from 'next/server'
import { fetchPayment, verifyWebhookSignature } from '@/lib/mercadopago'
import { applyMpPaymentToLocal } from '@/lib/payment-sync'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

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
    const result = await applyMpPaymentToLocal(mpPayment)
    if (!result.ok) {
      // Casos esperados (sem external_ref, não encontrado) → 200 pra MP não reenviar.
      // Fraude de valor é logada dentro do helper.
      return NextResponse.json({ ok: true, ignored: result.reason !== 'amount_mismatch', reason: result.reason, flagged: result.flagged })
    }
    return NextResponse.json({ ok: true, paymentId: result.paymentId, status: result.status })
  } catch (err: any) {
    // Log completo no servidor, mas resposta genérica (webhook é público)
    console.error('[webhook-mp]', err)
    // 200 evita MP reenviar infinitamente; investigamos via log
    return NextResponse.json({ ok: false, message: 'Erro processando webhook' }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'gabaritai-mp-webhook' })
}
