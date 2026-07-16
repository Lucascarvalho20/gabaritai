'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Banner do plano GRATUITO (planner). Aparece no topo do dashboard só pra
 * quem está no gratuito — reforça o que é livre e convida a assinar pra
 * desbloquear o conteúdo. Some pra trial/pagante/admin.
 */
export function FreePlanBanner() {
  const [isFree, setIsFree] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/me/plan')
      .then(({ data }) => { if (alive) setIsFree(!!data.plan?.isFree) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!isFree) return null

  return (
    <div className="rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">Você está no plano gratuito</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cronograma, edital e cronômetro são livres pra sempre. Material, questões, flashcards,
          simulados e mentor fazem parte dos planos pagos.
        </p>
      </div>
      <Link
        href="/planos"
        className="rounded-xl bg-brand-500 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600 shrink-0"
      >
        Assinar <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
