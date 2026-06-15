'use client'

import { useEffect, useState } from 'react'
import { MailWarning, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Banner exibido no topo do dashboard quando o e-mail do aluno ainda não foi
 * verificado. Soft gate: não bloqueia o uso (pra não travar ninguém se o
 * e-mail atrasar/cair no spam), apenas insiste na verificação e oferece
 * reenvio. Usuários via Google já vêm verificados — banner não aparece.
 */
export function EmailVerificationBanner() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        if (data && data.emailVerified === false && data.email) {
          setEmail(data.email)
          setShow(true)
        }
      })
      .catch(() => {})
  }, [])

  if (!show) return null

  async function resend() {
    if (!email || sending) return
    setSending(true)
    try {
      await api.post('/auth/resend-verification', { email })
      setSent(true)
    } catch {
      // silencioso — endpoint é privacy-safe e sempre responde ok
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/15 p-4 flex items-center gap-3">
      <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">Confirme seu e-mail</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
          Verifique sua caixa de entrada (e o spam) para garantir o acesso completo à sua conta.
        </p>
      </div>
      {sent ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-success-600 dark:text-success-400 shrink-0">
          <CheckCircle2 className="w-4 h-4" /> Enviado
        </span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="rounded-xl bg-amber-500 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-600 disabled:opacity-60 shrink-0"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Reenviar link
        </button>
      )}
    </div>
  )
}
