'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Loader2, Clock, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = {
  paymentId: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
  expiresAt: string | null
  amount: number
  onPaid: () => void
  onClose: () => void
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PixCheckoutPanel({
  paymentId, qrCode, qrCodeBase64, ticketUrl, expiresAt, amount, onPaid, onClose,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)
  const [checking, setChecking] = useState(false)
  const paidRef = useRef(false)

  // Contagem regressiva até expirar
  useEffect(() => {
    if (!expiresAt) return
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const diff = Math.floor((target - Date.now()) / 1000)
      setSecondsLeft(diff)
      if (diff <= 0) setExpired(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  // Polling de confirmação do pagamento (a cada 4s)
  useEffect(() => {
    if (expired) return
    let stopped = false

    const poll = async () => {
      if (stopped || paidRef.current) return
      try {
        const r = await fetch(`/api/checkout/status?payment=${paymentId}`, { cache: 'no-store' })
        const d = await r.json()
        if (d.paid) {
          paidRef.current = true
          onPaid()
          return
        }
        if (d.failed) {
          toast.error('Pagamento não foi concluído.')
        }
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    const id = setInterval(poll, 4000)
    poll()
    return () => { stopped = true; clearInterval(id) }
  }, [paymentId, expired, onPaid])

  async function copy() {
    if (!qrCode) return
    try {
      await navigator.clipboard.writeText(qrCode)
      setCopied(true)
      toast.success('Código Pix copiado!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Não consegui copiar — selecione e copie manualmente.')
    }
  }

  async function checkNow() {
    setChecking(true)
    try {
      const r = await fetch(`/api/checkout/status?payment=${paymentId}`, { cache: 'no-store' })
      const d = await r.json()
      if (d.paid) { paidRef.current = true; onPaid(); return }
      toast('Ainda não identificamos o pagamento. Assim que cair, libera sozinho.', { icon: '⏳' })
    } finally {
      setChecking(false)
    }
  }

  const mm = secondsLeft != null ? String(Math.max(0, Math.floor(secondsLeft / 60))).padStart(2, '0') : '--'
  const ss = secondsLeft != null ? String(Math.max(0, secondsLeft % 60)).padStart(2, '0') : '--'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6 space-y-4 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="font-bold text-lg">Pague {fmtBRL(amount)} no Pix</h2>
          <p className="text-xs text-muted-foreground">
            Escaneie o QR Code ou copie o código no app do seu banco.
          </p>
        </div>

        {expired ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Este código Pix expirou.</p>
            <button onClick={onClose} className="text-xs font-bold text-brand-500 hover:underline">
              Gerar um novo
            </button>
          </div>
        ) : (
          <>
            {/* QR Code */}
            {qrCodeBase64 ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-56 h-56 rounded-lg border border-border bg-white p-2"
                />
              </div>
            ) : ticketUrl ? (
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer"
                 className="block text-center text-sm font-semibold text-brand-500 underline">
                Abrir QR Code do Pix
              </a>
            ) : null}

            {/* Copia e cola */}
            {qrCode && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Pix copia e cola</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={qrCode}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono truncate"
                  />
                  <button
                    onClick={copy}
                    className="rounded-lg bg-brand-500 text-white px-3 py-2 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600 whitespace-nowrap"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* Countdown */}
            {secondsLeft != null && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Expira em <span className="font-mono font-bold text-foreground">{mm}:{ss}</span>
              </div>
            )}

            {/* Status / aguardando */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando o pagamento… libera automaticamente quando cair.
            </div>

            <button
              onClick={checkNow}
              disabled={checking}
              className="w-full rounded-xl border-2 border-brand-500 text-brand-500 py-2.5 text-sm font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Já paguei
            </button>

            <p className="text-[10px] text-muted-foreground text-center">
              🔒 Pagamento processado pelo Mercado Pago · cai direto na conta do Gabaritai
            </p>
          </>
        )}
      </div>
    </div>
  )
}
