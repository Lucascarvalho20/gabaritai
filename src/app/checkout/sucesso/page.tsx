'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'

function SucessoInner() {
  const sp = useSearchParams()
  const paymentId = sp.get('payment')
  const [stage, setStage] = useState<'celebrating' | 'ready'>('celebrating')

  useEffect(() => {
    const t = setTimeout(() => setStage('ready'), 1800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-success-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-success-500 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black mb-2">Pagamento aprovado! 🎉</h1>
          <p className="text-muted-foreground">
            Seu acesso já foi liberado. Bora estudar?
          </p>
        </div>

        <div className="card p-4 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border-brand-200 text-left text-sm space-y-2">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4 text-brand-500" /> Próximos passos:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Criar seu primeiro cronograma</li>
            <li>Fazer um mini-simulado pra calibrar nível</li>
            <li>Conversar com o Mentor IA</li>
          </ol>
        </div>

        {stage === 'celebrating' ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Liberando seus cursos…
          </div>
        ) : (
          <Link href="/dashboard" className="block w-full rounded-xl bg-brand-500 text-white py-3 font-bold hover:bg-brand-600">
            Ir pro dashboard
          </Link>
        )}

        {paymentId && (
          <p className="text-[10px] text-muted-foreground/60 font-mono">Pagamento #{paymentId.slice(0, 8)}</p>
        )}
      </div>
    </div>
  )
}

export default function SucessoPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}><SucessoInner /></Suspense>
}
