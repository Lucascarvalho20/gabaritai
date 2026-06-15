import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { checkRefundEligibility, processRefund } from '@/lib/refund'
import { getClientIp, checkRateLimit } from '@/lib/rate-limit'
import { telegramSecurityAlert } from '@/lib/telegram'

/**
 * POST /api/me/refund-request
 * Body opcional: { reason?: string }
 *
 * Auto-serviço de reembolso (garantia de satisfação). O aluno solicita; o
 * sistema valida a janela (15 dias, -7 se usou trial) E a trava de uso. Se
 * elegível, estorna automaticamente e revoga o acesso. Se não, explica o motivo.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const ip = getClientIp(req)

  // Rate limit: evita spam de tentativas
  const rl = checkRateLimit(`refund-request:${auth.user.id}`, ip)
  if (!rl.ok) {
    return NextResponse.json({ message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const reason: string = typeof body.reason === 'string' ? body.reason.slice(0, 500) : 'self_service'

  const elig = await checkRefundEligibility(auth.user.id)
  if (!elig.eligible || !elig.payment) {
    return NextResponse.json(
      { ok: false, eligible: false, message: elig.reason, eligibility: elig },
      { status: 422 },
    )
  }

  try {
    const result = await processRefund({
      paymentId: elig.payment.id,
      reason: `self:${reason}`,
      byUserId: auth.user.id,
      bySelf: true,
      ip,
    })

    // Alerta o admin (transparência operacional)
    telegramSecurityAlert({
      kind: 'BRUTE_FORCE',
      details: `♻️ Reembolso AUTO-SERVIÇO: ${auth.user.email ?? auth.user.id} estornou R$ ${result.amount.toFixed(2)}. Motivo: ${reason}`,
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      refundedAmount: result.amount,
      message: 'Reembolso processado. O valor volta pelo mesmo meio de pagamento (Pix em horas; cartão na fatura). Seu acesso premium foi encerrado.',
    })
  } catch (err: any) {
    return NextResponse.json({ message: err?.message ?? 'Falha ao processar reembolso' }, { status: 502 })
  }
}
