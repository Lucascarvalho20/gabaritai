import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { processRefund } from '@/lib/refund'
import { getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/admin/payments/[id]/refund
 * Body opcional: { amount?: number, reason?: string }
 *
 * Estorno manual pelo ADMIN (override — não checa janela/uso; o admin decide).
 * Estorna no MercadoPago, marca REFUNDED e revoga acesso.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const ip = getClientIp(req)
  const body = await req.json().catch(() => ({}))
  const amount: number | undefined = body.amount != null ? Number(body.amount) : undefined
  const reason: string = typeof body.reason === 'string' ? body.reason : 'admin_manual'

  try {
    const result = await processRefund({
      paymentId: params.id,
      reason,
      byUserId: auth.user.id,
      bySelf: false,
      amount,
      ip,
    })
    return NextResponse.json({
      ok: true,
      refund: { id: result.refundId, amount: result.amount },
      accessRevoked: result.accessRevoked,
      enrollmentsRevogadas: result.enrollmentsRevoked,
    })
  } catch (err: any) {
    const msg = err?.message ?? 'Falha ao estornar'
    const status = msg.includes('não encontrado') ? 404 : msg.includes('APROVADOS') ? 400 : 502
    return NextResponse.json({ message: msg }, { status })
  }
}
