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
  const [problema, setProblema] = useState<string | null>(null)
  const [ultimaChecagem, setUltimaChecagem] = useState<Date | null>(null)
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

  /**
   * Consulta o status uma vez.
   *
   * Devolve o que aconteceu de verdade em vez de só `true/false`. Antes, uma
   * resposta 401 ou 500 era indistinguível de "o PIX ainda não caiu" — as duas
   * caíam no mesmo `d.paid` falso e a tela dizia a mesma coisa. Quem está
   * esperando o acesso precisa saber qual dos dois é.
   */
  async function consultarStatus(): Promise<
    | { tipo: 'pago' }
    | { tipo: 'falhou' }
    | { tipo: 'pendente'; diagnostico: string | null }
    | { tipo: 'erro'; detalhe: string }
  > {
    let r: Response
    try {
      r = await fetch(`/api/checkout/status?payment=${paymentId}`, { cache: 'no-store' })
    } catch {
      return { tipo: 'erro', detalhe: 'sem conexão com o servidor' }
    }

    if (r.status === 401) return { tipo: 'erro', detalhe: 'sua sessão expirou — faça login de novo' }
    if (!r.ok) return { tipo: 'erro', detalhe: `servidor respondeu ${r.status}` }

    let d: any
    try {
      d = await r.json()
    } catch {
      return { tipo: 'erro', detalhe: 'resposta inválida do servidor' }
    }

    if (d.paid) return { tipo: 'pago' }
    if (d.failed) return { tipo: 'falhou' }
    return { tipo: 'pendente', diagnostico: d.diagnostico ?? null }
  }

  // Polling de confirmação do pagamento (a cada 4s)
  useEffect(() => {
    if (expired) return
    let stopped = false

    const poll = async () => {
      if (stopped || paidRef.current) return
      const res = await consultarStatus()
      if (stopped || paidRef.current) return

      setUltimaChecagem(new Date())

      if (res.tipo === 'pago') {
        paidRef.current = true
        onPaid()
        return
      }
      if (res.tipo === 'falhou') {
        setProblema(null)
        toast.error('Pagamento não foi concluído.')
        return
      }
      if (res.tipo === 'erro') {
        setProblema(res.detalhe)
        return
      }
      // pendente: só mostra alerta se o servidor sinalizou algo anormal.
      // `sincronizado` significa que o MP respondeu e ainda não consta pago —
      // isso é o fluxo normal enquanto o PIX não compensa.
      setProblema(
        res.diagnostico && res.diagnostico !== 'sincronizado'
          ? `Verificação travada (${res.diagnostico})`
          : null,
      )
    }

    const id = setInterval(poll, 4000)
    poll()
    return () => { stopped = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await consultarStatus()
      setUltimaChecagem(new Date())

      if (res.tipo === 'pago') { paidRef.current = true; onPaid(); return }

      if (res.tipo === 'erro') {
        setProblema(res.detalhe)
        toast.error(`Não consegui verificar: ${res.detalhe}`)
        return
      }
      if (res.tipo === 'falhou') {
        setProblema(null)
        toast.error('Pagamento não foi concluído.')
        return
      }

      if (res.diagnostico && res.diagnostico !== 'sincronizado') {
        setProblema(`Verificação travada (${res.diagnostico})`)
        toast.error('O Mercado Pago não respondeu como esperado. Guarde o comprovante — já registramos.')
        return
      }

      setProblema(null)
      toast(
        'O Mercado Pago ainda não confirmou. Não pague de novo — assim que cair, libera sozinho.',
        { icon: '⏳', duration: 6000 },
      )
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
            Abra o app do seu banco, escolha <strong>Pix &rarr; Pagar com QR Code</strong> e
            escaneie. Pela câmera do celular não funciona — o código Pix não é um link.
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
            ) : null}

            {/* Página do Mercado Pago: no celular é o caminho que abre o app do banco. */}
            {ticketUrl && (
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer"
                 className="block text-center text-xs font-semibold text-brand-500 underline">
                Abrir no Mercado Pago (recomendado no celular)
              </a>
            )}

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
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-200">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Aguardando o pagamento… libera automaticamente quando cair.
                  {ultimaChecagem && (
                    <span className="block text-[10px] opacity-70">
                      Última verificação às{' '}
                      {ultimaChecagem.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </span>
              </div>

              {problema && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    <strong>{problema}</strong>
                    <span className="block mt-0.5">
                      Se você já pagou, <strong>não pague de novo</strong>. O valor está registrado e
                      será liberado — guarde o comprovante e fale com o suporte.
                    </span>
                  </span>
                </div>
              )}
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
