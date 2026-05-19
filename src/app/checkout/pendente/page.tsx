'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Clock, Loader2 } from 'lucide-react'

function PendenteInner() {
  const sp = useSearchParams()
  const paymentId = sp.get('payment')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2">Pagamento em análise</h1>
          <p className="text-muted-foreground">
            Estamos esperando a confirmação do seu pagamento. Isso é normal pra <strong>boleto</strong> e algumas transações no cartão.
          </p>
        </div>
        <div className="card p-4 text-left text-sm space-y-2 text-muted-foreground">
          <p><strong className="text-foreground">Pix:</strong> liberação em segundos</p>
          <p><strong className="text-foreground">Cartão:</strong> geralmente em até 1h</p>
          <p><strong className="text-foreground">Boleto:</strong> liberação após 1-3 dias úteis</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Vamos te avisar por e-mail quando o acesso for liberado.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className="block w-full rounded-xl bg-brand-500 text-white py-3 font-bold hover:bg-brand-600">
            Ir pro dashboard
          </Link>
          <Link href="/" className="block w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold hover:bg-muted">
            Voltar ao início
          </Link>
        </div>
        {paymentId && (
          <p className="text-[10px] text-muted-foreground/60 font-mono">Pagamento #{paymentId.slice(0, 8)}</p>
        )}
      </div>
    </div>
  )
}

export default function PendentePage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}><PendenteInner /></Suspense>
}
