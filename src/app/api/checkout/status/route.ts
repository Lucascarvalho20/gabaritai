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
 *
 * SOBRE O CAMPO `diagnostico`: antes, qualquer falha aqui era engolida e a tela
 * dizia "ainda não identificamos o pagamento" — a mesma frase para "o PIX não
 * caiu" e para "a consulta ao Mercado Pago quebrou". São problemas opostos e a
 * pessoa não tinha como distinguir. Agora o motivo real sobe junto da resposta.
 * Não vaza nada: o endpoint já exige ser dono do pagamento, e a mensagem do MP
 * não contém credencial.
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
  let statusMp: string | null = null
  let diagnostico: string | null = null

  if (status !== 'PENDING') {
    diagnostico = 'ja_resolvido_localmente'
  } else if (!payment.providerPaymentId) {
    // Sem o id do MP não há o que consultar — só o webhook poderia resolver.
    diagnostico = 'sem_provider_payment_id'
  } else {
    // Pull instantâneo: se ainda não confirmou, pergunta direto ao MP.
    try {
      const mp = await fetchPayment(payment.providerPaymentId)
      statusMp = mp.status
      const result = await applyMpPaymentToLocal(mp)
      if (result.ok) {
        status = result.status
        diagnostico = 'sincronizado'
      } else {
        diagnostico = `sync_recusado:${result.reason}`
        console.error('[checkout/status] sync recusado', { paymentId, reason: result.reason })
      }
    } catch (err: any) {
      diagnostico = `erro_mp:${err?.message ?? 'desconhecido'}`
      console.error('[checkout/status] falha ao consultar MP:', err)
      // mantém status local
    }
  }

  return NextResponse.json({
    paymentId: payment.id,
    status,
    statusMp,
    diagnostico,
    paid: status === 'APPROVED',
    failed: status === 'REJECTED' || status === 'CANCELLED',
  })
}
