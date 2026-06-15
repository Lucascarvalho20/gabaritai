import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { fetchPayment } from '@/lib/mercadopago'
import { applyMpPaymentToLocal } from '@/lib/payment-sync'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/status?payment=ID
 *
 * Usado pela tela de PIX pra fazer polling enquanto o usuário paga.
 * - Lê o Payment local (o webhook mantém atualizado).
 * - Se ainda PENDING e tiver providerPaymentId, re-consulta o MP na hora
 *   (não espera o webhook) e aplica o resultado — assim a liberação é
 *   praticamente instantânea quando o PIX cai.
 *
 * Só o dono do pagamento (ou admin) pode consultar.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const paymentId = new URL(req.url).searchParams.get('payment')
  if (!paymentId) return NextResponse.json({ message: 'payment obrigatório' }, { status: 400 })

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, providerPaymentId: true },
  })
  if (!payment) return NextResponse.json({ message: 'Pagamento não encontrado' }, { status: 404 })
  if (payment.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
  }

  let status = payment.status

  // Pull instantâneo: se ainda não confirmou, pergunta direto ao MP.
  if (status === 'PENDING' && payment.providerPaymentId) {
    try {
      const mp = await fetchPayment(payment.providerPaymentId)
      const result = await applyMpPaymentToLocal(mp)
      if (result.ok) status = result.status
    } catch (err) {
      console.error('[checkout/status] falha ao consultar MP:', err)
      // mantém status local
    }
  }

  return NextResponse.json({
    paymentId: payment.id,
    status,
    paid: status === 'APPROVED',
    failed: status === 'REJECTED' || status === 'CANCELLED',
  })
}
