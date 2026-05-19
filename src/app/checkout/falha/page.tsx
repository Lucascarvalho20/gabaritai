'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'

function FalhaInner() {
  const sp = useSearchParams()
  const paymentId = sp.get('payment')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2">Pagamento não aprovado</h1>
          <p className="text-muted-foreground">
            O Mercado Pago não autorizou esta transação. Você não foi cobrado.
          </p>
        </div>
        <div className="card p-4 text-left text-sm space-y-1.5 text-muted-foreground">
          <p>Possíveis motivos:</p>
          <ul className="list-disc list-inside text-xs">
            <li>Limite insuficiente no cartão</li>
            <li>Dados incorretos</li>
            <li>Banco bloqueou a compra</li>
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/planos" className="block w-full rounded-xl bg-brand-500 text-white py-3 font-bold hover:bg-brand-600">
            Escolher outro plano
          </Link>
          <Link href="/" className="block w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold hover:bg-muted">
            Voltar ao início
          </Link>
        </div>
        {paymentId && (
          <p className="text-[10px] text-muted-foreground/60 font-mono">Tentativa #{paymentId.slice(0, 8)}</p>
        )}
      </div>
    </div>
  )
}

export default function FalhaPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}><FalhaInner /></Suspense>
}
