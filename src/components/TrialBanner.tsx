'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Plan = {
  hasPlan: boolean
  slug: string | null
  name: string | null
  isTrial: boolean
  isBypassed: boolean
  expiresAt: string | null
}
type TrialInfo = {
  daysLeft: number | null
  questionsToday: number
  dailyQuestionLimit: number
  allowedMockTypes: string[]
}

/**
 * Banner exibido no topo do dashboard quando o aluno está no trial.
 * Mostra dias restantes, questões usadas hoje vs limite, e CTA pra assinar.
 *
 * Esconde automaticamente se:
 *  - aluno não está em trial (pagante)
 *  - aluno é admin/beta (bypassed)
 *
 * Se sem plano, mostra um banner de "ativar trial".
 */
export function TrialBanner() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [trial, setTrial] = useState<TrialInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    api.get('/me/plan')
      .then(({ data }) => { setPlan(data.plan); setTrial(data.trial) })
      .catch(() => {})
  }, [])

  // Esconde pra admin/beta/pagante (ou enquanto carrega)
  if (!plan) return null
  if (plan.isBypassed) return null
  if (plan.hasPlan && !plan.isTrial) return null
  if (dismissed) return null

  // Sem plano: convite pra trial
  if (!plan.hasPlan) {
    return (
      <div className="rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-brand-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Comece grátis com 7 dias de trial</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            1 curso à escolha · 30 questões por dia · mini-simulados liberados · sem cartão
          </p>
        </div>
        <Link
          href="/planos"
          className="rounded-xl bg-brand-500 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600 shrink-0"
        >
          Ativar trial <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  // Em trial: mostra progresso + urgência
  if (!trial) return null
  const questionsLeft = Math.max(0, trial.dailyQuestionLimit - trial.questionsToday)
  const questionPct = Math.min(100, Math.round((trial.questionsToday / trial.dailyQuestionLimit) * 100))
  const veryUrgent = trial.daysLeft != null && trial.daysLeft <= 1
  const urgent = trial.daysLeft != null && trial.daysLeft <= 3

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      veryUrgent
        ? 'border-red-300 dark:border-red-700/60 bg-red-50/60 dark:bg-red-900/15'
        : urgent
          ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/15'
          : 'border-brand-300 dark:border-brand-700/60 bg-brand-50/40 dark:bg-brand-900/15',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          veryUrgent ? 'bg-red-500/15 text-red-600 dark:text-red-400'
            : urgent ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-brand-500/15 text-brand-600 dark:text-brand-400',
        )}>
          {veryUrgent ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">
            {veryUrgent ? '⚠ Trial acaba hoje!' : `Trial · ${trial.daysLeft} ${trial.daysLeft === 1 ? 'dia restante' : 'dias restantes'}`}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Questões hoje: <strong className="text-foreground tabular-nums">{trial.questionsToday}/{trial.dailyQuestionLimit}</strong>
            {questionsLeft > 0 ? ` · faltam ${questionsLeft}` : ' · você atingiu o limite (volta amanhã)'}
            {' · simulado completo: '}<strong className="text-foreground">só pra assinantes</strong>
          </p>
        </div>
        <Link
          href="/planos"
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors',
            veryUrgent
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-brand-500 text-white hover:bg-brand-600',
          )}
        >
          Assinar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Barra de progresso de questões */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            questionPct >= 100 ? 'bg-red-500' : questionPct >= 80 ? 'bg-amber-500' : 'bg-brand-500',
          )}
          style={{ width: `${questionPct}%` }}
        />
      </div>
    </div>
  )
}
