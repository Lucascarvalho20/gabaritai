/**
 * Cliente Mercado Pago via REST API (sem SDK).
 *
 * Pra usar:
 * 1. Conta MP → Suas credenciais → Pegar ACCESS_TOKEN (TEST-... pra sandbox ou APP_USR-... pra prod)
 * 2. Defina MERCADOPAGO_ACCESS_TOKEN no .env
 * 3. Pra webhook funcionar em produção: cadastra URL pública em https://www.mercadopago.com.br/developers/panel/webhooks
 *    Eventos: payment
 */

const MP_BASE = 'https://api.mercadopago.com'

type CreatePreferenceInput = {
  items: Array<{
    title: string
    quantity: number
    unit_price: number // em REAIS (não centavos)
    currency_id?: 'BRL'
    description?: string
  }>
  payer?: {
    name?: string
    email?: string
    identification?: { type: 'CPF'; number: string }
  }
  external_reference: string // nosso Payment.id (assoc webhook ao registro)
  notification_url: string
  back_urls: { success: string; failure: string; pending: string }
  auto_return?: 'approved' | 'all'
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>
    installments?: number
  }
  metadata?: Record<string, unknown>
  statement_descriptor?: string // aparece na fatura do cartão
}

export type MpPreference = {
  id: string
  init_point: string         // URL produção
  sandbox_init_point: string // URL sandbox
  external_reference: string
}

export async function createPreference(input: CreatePreferenceInput): Promise<MpPreference> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado no .env')

  const res = await fetch(`${MP_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      items: input.items.map((it) => ({ ...it, currency_id: 'BRL' })),
      auto_return: input.auto_return ?? 'approved',
      statement_descriptor: input.statement_descriptor ?? 'GABARITAI',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[mp] createPreference error:', data)
    throw new Error(data.message ?? 'Erro ao criar preference no Mercado Pago')
  }
  return data as MpPreference
}

export type MpPayment = {
  id: number
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  status_detail: string
  external_reference: string
  payment_method_id: string
  payment_type_id: string
  transaction_amount: number
  installments?: number
  date_approved: string | null
  date_created: string
  payer: { email?: string; identification?: { type: string; number: string } }
  metadata?: Record<string, unknown>
}

export async function fetchPayment(paymentId: string | number): Promise<MpPayment> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')

  const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar payment')
  return data as MpPayment
}

export type MpRefund = {
  id: number
  payment_id: number
  amount: number
  status: string // 'approved' quando estornado com sucesso
  date_created: string
}

/**
 * Estorna um pagamento no Mercado Pago.
 * - Sem `amount` → reembolso TOTAL.
 * - Com `amount` → reembolso PARCIAL.
 *
 * O valor volta pro mesmo meio de pagamento do comprador (cartão estorna na
 * fatura; Pix cai na conta de origem). Usa chave de idempotência pra evitar
 * estorno duplicado se a chamada for repetida.
 */
export async function refundPayment(
  mpPaymentId: string | number,
  amount?: number,
): Promise<MpRefund> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')

  const res = await fetch(`${MP_BASE}/v1/payments/${mpPaymentId}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `refund-${mpPaymentId}-${amount ?? 'full'}`,
    },
    body: amount != null ? JSON.stringify({ amount: Number(amount.toFixed(2)) }) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('[mp] refund error:', data)
    throw new Error(data.message ?? 'Erro ao estornar pagamento no Mercado Pago')
  }
  return data as MpRefund
}

/** Modo sandbox = token TEST- OU env MERCADOPAGO_SANDBOX=true (override pra forçar com APP_USR-) */
export function isSandboxMode(): boolean {
  if ((process.env.MERCADOPAGO_SANDBOX ?? '').toLowerCase() === 'true') return true
  return (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').startsWith('TEST-')
}

/**
 * Valida assinatura HMAC do webhook do Mercado Pago.
 *
 * MP envia headers x-signature (formato: "ts=1234,v1=abcdef...") e x-request-id.
 * A assinatura é HMAC-SHA256 de: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 * com a chave secreta do webhook (Mercado Pago → Suas integrações → Webhooks → Configurar → Chave secreta).
 *
 * Se MERCADOPAGO_WEBHOOK_SECRET não estiver setado, ACEITA todas requisições (modo dev).
 * Em produção SEMPRE configure o secret.
 */
import crypto from 'crypto'

export function verifyWebhookSignature(opts: {
  signatureHeader: string | null
  requestId: string | null
  dataId: string | null
}): { valid: boolean; reason?: string } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    return { valid: true, reason: 'no_secret_configured_dev_mode' }
  }
  if (!opts.signatureHeader || !opts.requestId || !opts.dataId) {
    return { valid: false, reason: 'missing_required_params' }
  }

  // Parse "ts=1234,v1=abcdef..."
  const parts = opts.signatureHeader.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {} as Record<string, string>)

  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return { valid: false, reason: 'invalid_signature_format' }

  // Anti-replay: timestamp não pode ser mais antigo que 5 minutos
  const tsSec = parseInt(ts, 10)
  const ageSec = Math.floor(Date.now() / 1000) - tsSec
  if (Math.abs(ageSec) > 300) {
    return { valid: false, reason: `timestamp_too_old_${ageSec}s` }
  }

  const payload = `id:${opts.dataId};request-id:${opts.requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))
    return valid ? { valid: true } : { valid: false, reason: 'signature_mismatch' }
  } catch {
    return { valid: false, reason: 'signature_parse_error' }
  }
}
