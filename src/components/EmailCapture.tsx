'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react'

type Props = {
  source: string                  // ex: "hero-edital-pdf"
  courseSlug?: string
  parentSlug?: string
  placeholder?: string
  cta?: string
  successMessage?: string
  hint?: string
  variant?: 'inline' | 'stacked'  // inline = email + botão lado a lado; stacked = vertical
  className?: string
}

/**
 * Form de captura de email pra lead magnet.
 * Sem cadastro completo, sem cartão, sem onboarding — só email.
 * Concurseiro topa muito mais deixar email pra baixar edital em PDF
 * do que criar conta. Acumula audiência mesmo de quem não compra hoje.
 *
 * Idempotente no backend: spam de submit não polui o banco.
 */
export function EmailCapture({
  source,
  courseSlug,
  parentSlug,
  placeholder = 'seu@email.com',
  cta = 'Receber',
  successMessage = 'Pronto! Em alguns minutos você recebe no email.',
  hint,
  variant = 'inline',
  className = '',
}: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, courseSlug, parentSlug }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Falha ao enviar')
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-sm ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-emerald-700 dark:text-emerald-300 font-medium">{successMessage}</span>
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <form onSubmit={submit} className={`space-y-2 ${className}`}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> {cta}</>}
        </button>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        {error && <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>}
      </form>
    )
  }

  return (
    <form onSubmit={submit} className={`w-full ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{cta} <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-2">{hint}</p>}
      {error && <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">{error}</p>}
    </form>
  )
}
