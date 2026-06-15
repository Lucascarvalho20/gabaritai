import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { refundPayment } from '@/lib/mercadopago'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/admin/payments/[id]/refund
 * Body opcional: { amount?: number, reason?: string }
 *
 * Estorna um pagamento aprovado:
 *  1. Chama o Mercado Pago (refund total ou parcial)
 *  2. Marca o Payment local como REFUNDED
 *  3. REVOGA o acesso: desativa as matrículas do aluno (se ele não tiver
 *     outro pagamento aprovado vigente). Como o plan-access só concede acesso
 *     com Payment APPROVED, marcar REFUNDED já corta o acesso premium.
 *  4. Audita a operação.
 *
 * Só ADMIN. Idempotente no MP (chave de idempotência).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const ip = getClientIp(req)
  const body = await req.json().catch(() => ({}))
  const amount: number | undefined = body.amount != null ? Number(body.amount) : undefined
  const reason: string = typeof body.reason === 'string' ? body.reason : 'refund_admin'

  const payment = await prisma.payment.findUnique({ where: { id: params.id } })
  if (!payment) {
    return NextResponse.json({ message: 'Pagamento não encontrado' }, { status: 404 })
  }
  if (payment.status !== 'APPROVED') {
    return NextResponse.json(
      { message: `Só é possível estornar pagamentos APROVADOS (status atual: ${payment.status})` },
      { status: 400 },
    )
  }
  if (!payment.providerPaymentId) {
    return NextResponse.json(
      { message: 'Pagamento sem ID do provedor — não dá pra estornar automaticamente. Verifique no painel do Mercado Pago.' },
      { status: 400 },
    )
  }

  // Estorna no Mercado Pago (o dinheiro volta pro comprador)
  let refund
  try {
    refund = await refundPayment(payment.providerPaymentId, amount)
  } catch (err: any) {
    console.error('[refund] MP falhou:', err)
    return NextResponse.json({ message: err.message ?? 'Falha ao estornar no Mercado Pago' }, { status: 502 })
  }

  // Marca como REFUNDED localmente
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      metadata: {
        ...(typeof payment.metadata === 'object' && payment.metadata ? payment.metadata : {}),
        refund: { id: refund.id, amount: refund.amount, reason, at: new Date().toISOString(), by: auth.user.id },
      } as any,
    },
  })

  // Revoga acesso: se o aluno não tem OUTRO pagamento aprovado vigente,
  // desativa as matrículas (corta o acesso ao conteúdo pago).
  const outroAtivo = await prisma.payment.findFirst({
    where: {
      userId: payment.userId,
      status: 'APPROVED',
      id: { not: payment.id },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  })

  let enrollmentsRevogadas = 0
  if (!outroAtivo) {
    const upd = await prisma.userCourseEnrollment.updateMany({
      where: { userId: payment.userId, isActive: true },
      data: { isActive: false },
    })
    enrollmentsRevogadas = upd.count
    // Volta o plano legado pra FREE
    await prisma.user.update({
      where: { id: payment.userId },
      data: { plan: 'FREE' },
    }).catch(() => {})
  }

  // Nota: o enum AuditAction não tem PAYMENT_REFUNDED; usamos PAYMENT_RECEIVED
  // com metadata.type=REFUND. Relatórios de receita filtram por Payment.status
  // (REFUNDED), então isso não afeta números — é só a trilha de auditoria.
  await audit({
    actorId: auth.user.id,
    action: 'PAYMENT_RECEIVED',
    ip,
    metadata: {
      type: 'REFUND',
      paymentId: payment.id,
      userId: payment.userId,
      amount: refund.amount,
      reason,
      enrollmentsRevogadas,
      keptAccess: !!outroAtivo,
    },
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    refund: { id: refund.id, amount: refund.amount, status: refund.status },
    accessRevoked: !outroAtivo,
    enrollmentsRevogadas,
  })
}
