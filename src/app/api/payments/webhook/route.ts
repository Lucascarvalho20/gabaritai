import { NextRequest, NextResponse } from 'next/server'
import { fetchPayment, verifyWebhookSignature, MercadoPagoErro } from '@/lib/mercadopago'
import { applyMpPaymentToLocal } from '@/lib/payment-sync'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { lerNotificacaoMp, ehEventoDePagamento } from '@/lib/mp-notification'

/**
 * Webhook do Mercado Pago.
 *
 * ORDEM DAS CHECAGENS. A versão anterior validava a assinatura antes de olhar
 * que evento era. Como a validação exige `x-signature`, `x-request-id` e um id
 * de recurso, qualquer notificação sem os três — `merchant_order`, IPN legado,
 * ping de teste — era recusada com 401 e registrada como "assinatura inválida".
 * Parecia ataque; era só formato diferente. Agora o evento é identificado
 * primeiro e o que não é pagamento sai com 200 sem passar pela validação, que
 * não teria o que validar.
 *
 * QUEM TEM AUTORIDADE. A notificação não é a fonte da verdade — ela só diz
 * "o pagamento X mudou". O estado vem de `fetchPayment`, uma chamada nossa à
 * API do MP autenticada com o nosso token. Por isso uma notificação forjada
 * não consegue aprovar nada: no máximo nos faz reconsultar um pagamento que já
 * é nosso, que é exatamente o que o polling da tela de PIX já faz.
 *
 * É esse desenho que permite aceitar o IPN legado, que o MP manda sem
 * assinatura nenhuma. Quando a assinatura vem (webhook v2), ela é exigida:
 * rejeitar forjaria barata antes de gastar uma chamada de rede é defesa em
 * profundidade, não redundância.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit anti-spam (legítimo MP raramente excede)
  const rl = rateLimit({ key: `mp-webhook:${ip}`, windowMs: 60_000, max: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, throttled: true }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => ({}))

    const notificacao = lerNotificacaoMp({
      url: req.url,
      body,
      signatureHeader: req.headers.get('x-signature'),
      requestIdHeader: req.headers.get('x-request-id'),
    })

    // 1. Não é pagamento? Sai limpo, com 200, pra o MP não reenviar.
    if (!ehEventoDePagamento(notificacao)) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'not_payment_event',
        topico: notificacao.topico,
        formato: notificacao.formato,
      })
    }

    // 2. Veio assinado? Então a assinatura tem que bater.
    if (notificacao.assinada) {
      const sig = verifyWebhookSignature({
        signatureHeader: req.headers.get('x-signature'),
        requestId: req.headers.get('x-request-id'),
        dataId: notificacao.recursoId,
      })
      if (!sig.valid) {
        console.warn('[webhook] assinatura inválida:', sig.reason, { ip, formato: notificacao.formato })
        // 401 pra o MP não reenviar o mesmo payload assinado errado
        return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 })
      }
    } else {
      // IPN legado: não há o que verificar. Seguimos porque a autoridade é a
      // consulta ao MP logo abaixo, não este corpo de requisição.
      console.info('[webhook] notificação sem assinatura (IPN legado)', {
        ip, recursoId: notificacao.recursoId,
      })
    }

    // 3. A verdade vem do Mercado Pago, não da notificação.
    let mpPayment
    try {
      mpPayment = await fetchPayment(notificacao.recursoId!)
    } catch (err) {
      if (err instanceof MercadoPagoErro && err.status === 404) {
        // Pagamento que não existe na nossa conta: não adianta tentar de novo.
        return NextResponse.json({ ok: true, ignored: true, reason: 'payment_not_found' })
      }
      throw err // temporário: cai no catch de baixo, que pede reenvio
    }
    const result = await applyMpPaymentToLocal(mpPayment)

    if (!result.ok) {
      // Casos esperados (sem external_ref, não encontrado) → 200 pra MP não reenviar.
      // Fraude de valor é logada dentro do helper.
      return NextResponse.json({
        ok: true,
        ignored: result.reason !== 'amount_mismatch',
        reason: result.reason,
        flagged: result.flagged,
      })
    }
    return NextResponse.json({ ok: true, paymentId: result.paymentId, status: result.status })
  } catch (err: any) {
    // Chegar aqui = erro inesperado, quase sempre TEMPORÁRIO (API do Mercado
    // Pago ou banco fora do ar). Antes respondia 200 "para o MP não reenviar
    // infinitamente" — e o efeito real era o oposto do desejado: o MP entendia
    // "entregue", nunca reenviava, e se o aluno tivesse fechado a aba o
    // pagamento ficava PENDING para sempre. 5xx faz o MP tentar de novo com
    // espera crescente. Os casos PERMANENTES (não é pagamento, não existe,
    // transição ignorada) já saíram acima com 200 explícito.
    console.error('[webhook-mp] falha temporária, pedindo reenvio', err)
    return NextResponse.json({ ok: false, retry: true }, { status: 503 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'gabaritai-mp-webhook' })
}
