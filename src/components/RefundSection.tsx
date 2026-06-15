'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Eligibility = {
  eligible: boolean
  reason: string
  payment: { id: string; amount: number; paidAt: string | null } | null
  windowDays: number
  daysLeft: number | null
  usedTrial: boolean
  capExceeded: string[]
}

/**
 * Seção de Garantia/Reembolso na página de Configurações.
 * Mostra o status de elegibilidade e, se elegível, permite solicitar o
 * reembolso (auto-serviço). Só aparece pra quem tem pagamento aprovado.
 */
export function RefundSection() {
  const [elig, setElig] = useState<Eligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get('/me/refund-eligibility')
      .then(({ data }) => setElig(data))
      .catch(() => setElig(null))
      .finally(() => setLoading(false))
  }, [])

  // Não tem pagamento → não mostra a seção (nada a reembolsar)
  if (loading) return null
  if (!elig || !elig.payment) return null

  async function handleRequest() {
    if (!elig?.eligible || requesting) return
    const ok = window.confirm(
      'Confirmar pedido de reembolso?\n\n' +
      'Você receberá 100% do valor de volta pelo mesmo meio de pagamento e ' +
      'seu acesso premium será encerrado. Esta ação não pode ser desfeita.',
    )
    if (!ok) return
    setRequesting(true)
    try {
      const { data } = await api.post('/me/refund-request', { reason: 'solicitado pela conta' })
      toast.success(`Reembolso de R$ ${data.refundedAmount?.toFixed?.(2) ?? ''} processado.`)
      setDone(true)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível processar agora.')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-500" />
        <h2 className="font-bold">Garantia de satisfação</h2>
      </div>

      {done ? (
        <p className="text-sm text-success-600 dark:text-success-400">
          Reembolso processado. O valor volta pelo mesmo meio de pagamento (Pix em alguns dias úteis;
          cartão conforme prazo da operadora). Obrigado por testar o Gabaritai!
        </p>
      ) : elig.eligible ? (
        <>
          <p className="text-sm text-muted-foreground">
            Você está dentro da garantia. Se sentir que a plataforma não é pra você, pode pedir
            o reembolso integral de <strong className="text-foreground">R$ {elig.payment.amount.toFixed(2)}</strong>.
            {elig.daysLeft != null && (
              <> Restam <strong className="text-foreground">{elig.daysLeft} dia(s)</strong> de garantia.</>
            )}
          </p>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="rounded-xl border border-danger-300 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/10 px-4 py-2 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Solicitar reembolso integral
          </button>
        </>
      ) : (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>{elig.reason} Em caso de dúvida, fale com o suporte em contato@gabaritai.com.br.</p>
        </div>
      )}
    </div>
  )
}
