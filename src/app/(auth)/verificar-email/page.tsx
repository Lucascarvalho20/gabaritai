'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailInner() {
  const sp = useSearchParams()
  const token = sp.get('token')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token ausente.')
      return
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json()
        if (r.ok) {
          setStatus('ok')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.message ?? 'Erro')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Não foi possível verificar agora. Tente novamente.')
      })
  }, [token])

  return (
    <div className="animate-fade-in text-center">
      {status === 'loading' && (
        <div className="py-12">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando seu e-mail…</p>
        </div>
      )}
      {status === 'ok' && (
        <div className="py-12">
          <CheckCircle2 className="w-14 h-14 text-success-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">E-mail verificado!</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Link href="/login" className="btn-primary inline-flex">Fazer login</Link>
        </div>
      )}
      {status === 'error' && (
        <div className="py-12">
          <XCircle className="w-14 h-14 text-danger-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Não foi possível verificar</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Link href="/login" className="btn-primary inline-flex">Voltar ao login</Link>
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" /></div>}>
      <VerifyEmailInner />
    </Suspense>
  )
}
