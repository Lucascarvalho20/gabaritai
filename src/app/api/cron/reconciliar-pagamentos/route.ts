import { NextRequest, NextResponse } from 'next/server'
import { exigirTokenCron } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'
import { fetchPayment } from '@/lib/mercadopago'
import { applyMpPaymentToLocal } from '@/lib/payment-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/reconciliar-pagamentos — a rede de segurança do pagamento.
 *
 * A confirmação tem dois caminhos: o webhook (o MP avisa) e o polling da tela
 * de PIX (a tela pergunta). Os dois podem falhar juntos: notificação perdida
 * E aluno que fechou a aba. Sem um terceiro caminho, esse pagamento ficaria
 * PENDING para sempre — dinheiro recebido, acesso não liberado.
 *
 * Uma vez por dia, este cron pergunta ao Mercado Pago o estado de todo
 * pagamento ainda pendente dos últimos 3 dias e aplica pela MESMA função dos
 * outros dois caminhos. Três entradas, uma regra: status só anda para frente
 * e a liberação é reivindicada uma vez só (payment-sync.ts), então rodar isto
 * em cima de um pagamento já resolvido não faz nada.
 */
const JANELA_DIAS = 3
const ORCAMENTO_MS = 45_000

export async function GET(req: NextRequest) {
  const negado = exigirTokenCron(req)
  if (negado) return negado

  const pendentes = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      provider: 'mercadopago',
      providerPaymentId: { not: null },
      createdAt: { gte: new Date(Date.now() - JANELA_DIAS * 86_400_000) },
    },
    select: { id: true, providerPaymentId: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  const inicio = Date.now()
  const resultado = { verificados: 0, aprovados: 0, liberados: 0, falhas: 0, semTempo: 0 }

  for (const p of pendentes) {
    if (Date.now() - inicio > ORCAMENTO_MS) { resultado.semTempo++; continue }
    try {
      const r = await applyMpPaymentToLocal(await fetchPayment(p.providerPaymentId!))
      resultado.verificados++
      if (r.ok && r.status === 'APPROVED') resultado.aprovados++
      if (r.ok && r.fulfilled) resultado.liberados++
    } catch (err) {
      resultado.falhas++
      console.error('[reconciliar] falhou', { paymentId: p.id, err })
    }
  }

  return NextResponse.json({ pendentes: pendentes.length, ...resultado })
}
