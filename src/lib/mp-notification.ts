/**
 * Leitura da notificação do Mercado Pago.
 *
 * O MP não manda um formato só. Chegam pelo menos três coisas diferentes no
 * mesmo endpoint, e tratar todas como se fossem uma era a causa de pagamento
 * aprovado que nunca liberava acesso:
 *
 *   1. Webhook v2, evento de pagamento
 *      POST ?type=payment&data.id=123   body: { type, data: { id } }
 *      headers: x-signature, x-request-id          → assinado
 *
 *   2. Webhook v2, evento de merchant_order
 *      POST ?type=merchant_order&data.id=456       → assinado, mas não é pagamento
 *
 *   3. IPN legado
 *      POST ?topic=payment&id=123                  → SEM assinatura, outros nomes
 *
 * O caso 3 usa `topic`/`id` onde o caso 1 usa `type`/`data.id`. Ler só os nomes
 * do caso 1 faz a notificação legada chegar com tudo vazio — e a validação de
 * assinatura recusa por "faltou parâmetro", que parece ataque e é só formato
 * diferente.
 *
 * Esta função não valida nada e não acessa rede. Só diz o que chegou.
 */

export type MpNotificacao = {
  /** 'payment', 'merchant_order', 'test' … normalizado entre os formatos. */
  topico: string | null
  /** Id do recurso no Mercado Pago, qualquer que seja o formato. */
  recursoId: string | null
  /** true quando vieram os headers de assinatura (webhook v2). */
  assinada: boolean
  /** Formato reconhecido — serve pra log e pra decidir a política. */
  formato: 'webhook_v2' | 'ipn_legado' | 'desconhecido'
}

function primeiroTexto(...valores: Array<unknown>): string | null {
  for (const v of valores) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return null
}

export function lerNotificacaoMp(opts: {
  url: string
  body: any
  signatureHeader: string | null
  requestIdHeader: string | null
}): MpNotificacao {
  let params: URLSearchParams
  try {
    params = new URL(opts.url).searchParams
  } catch {
    params = new URLSearchParams()
  }

  const body = opts.body ?? {}

  // `type` é o webhook v2; `topic` é o IPN legado.
  const topico = primeiroTexto(params.get('type'), body.type, params.get('topic'), body.topic)

  // `data.id` é o v2; `id` solto na query é o IPN.
  const recursoId = primeiroTexto(
    params.get('data.id'),
    body?.data?.id,
    params.get('id'),
    body.id,
  )

  const assinada = !!(opts.signatureHeader && opts.requestIdHeader)

  const formato: MpNotificacao['formato'] = assinada
    ? 'webhook_v2'
    : params.get('topic') || body.topic
      ? 'ipn_legado'
      : 'desconhecido'

  return { topico, recursoId, assinada, formato }
}

/** Só evento de pagamento muda estado aqui. O resto é ruído conhecido. */
export function ehEventoDePagamento(n: MpNotificacao): boolean {
  if (!n.recursoId) return false
  return n.topico === 'payment' || n.topico === 'payment.updated' || n.topico === 'payment.created'
}
