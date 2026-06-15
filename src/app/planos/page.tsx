'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Sparkles, Flame, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type PublicPlan = {
  id: string
  slug: string
  name: string
  description: string | null
  type: string
  interval: 'TRIAL' | 'MONTH' | 'YEAR' | 'LIFETIME'
  priceCents: number
  pixDiscount: number
  moneyBackDays: number
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL'
  features: string[]
  badge: string | null
  slotsLeft: number | null
  soldOut: boolean
}

const INTERVAL_LABEL: Record<string, string> = {
  TRIAL: '',
  MONTH: '/mês',
  YEAR: '/ano',
  LIFETIME: 'pra sempre',
}

const TYPE_ICON: Record<string, any> = {
  TRIAL: Sparkles,
  SINGLE_COURSE: ShieldCheck,
  COMBO: Zap,
  FULL_ACCESS: ShieldCheck,
  VITALICIO_PROMO: Flame,
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PlanosPublicoPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plans/public')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  // Separa o trial dos pagos pra organização visual
  const trial = plans.find((p) => p.type === 'TRIAL')
  const paid = plans.filter((p) => p.type !== 'TRIAL')

  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <header className="border-b border-border bg-card sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-black text-lg">Gabaritai</Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link href="/registro" className="text-sm font-semibold rounded-lg px-3 py-1.5 bg-brand-500 text-white hover:bg-brand-600">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Escolha o plano que cabe na sua aprovação.
          </h1>
          <p className="text-muted-foreground">
            Sem fidelidade. Garantia de 15 dias (devolvemos se não se adaptar). Cancela quando quiser.
            Pague no Pix e ganhe desconto.
          </p>
        </section>

        {/* Trial card destacado */}
        {trial && (
          <section className="max-w-xl mx-auto">
            <div className="card p-5 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800/40 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-bold text-foreground">{trial.name}</h3>
                  <p className="text-xs text-muted-foreground">{trial.description}</p>
                </div>
              </div>
              <Link
                href="/registro"
                className="rounded-xl bg-amber-500 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-600 whitespace-nowrap"
              >
                Começar grátis
              </Link>
            </div>
          </section>
        )}

        {/* Planos pagos */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paid.map((p) => {
            const Icon = TYPE_ICON[p.type] ?? Check
            const pixPrice = p.pixDiscount > 0 ? p.priceCents * (1 - p.pixDiscount / 100) : null
            const featured = p.badge?.toLowerCase().includes('escolhido') || p.badge?.toLowerCase().includes('recomendado')
            return (
              <div
                key={p.id}
                className={cn(
                  'card p-6 space-y-4 relative flex flex-col',
                  featured && 'ring-2 ring-brand-500 shadow-glow-blue',
                  p.soldOut && 'opacity-60',
                )}
              >
                {p.badge && (
                  <div className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap',
                    p.type === 'VITALICIO_PROMO' ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950',
                  )}>
                    {p.badge}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-brand-500" />
                  <h2 className="font-bold text-lg">{p.name}</h2>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground min-h-[2.5rem]">{p.description}</p>
                )}

                <div className="py-3 border-y border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tabular-nums">{fmtBRL(p.priceCents)}</span>
                    <span className="text-xs text-muted-foreground">{INTERVAL_LABEL[p.interval]}</span>
                  </div>
                  {pixPrice && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
                      💸 ou {fmtBRL(pixPrice)} no Pix ({p.pixDiscount}% off)
                    </p>
                  )}
                  {p.interval === 'YEAR' && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ≈ {fmtBRL(Math.round(p.priceCents / 12))}/mês
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-xs flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {p.slotsLeft !== null && (
                  <div className="text-[11px] font-bold text-amber-600 text-center">
                    🔥 Restam apenas {p.slotsLeft} vagas
                  </div>
                )}

                {p.soldOut ? (
                  <button disabled className="w-full rounded-xl bg-muted text-muted-foreground py-3 text-sm font-bold cursor-not-allowed">
                    Esgotado
                  </button>
                ) : (
                  <Link
                    href={`/checkout/${p.slug}`}
                    className={cn(
                      'w-full text-center rounded-xl py-3 text-sm font-bold transition',
                      featured ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border-2 border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20',
                    )}
                  >
                    Assinar agora
                  </Link>
                )}

                <p className="text-[10px] text-muted-foreground text-center">
                  Garantia 15 dias · Cancela quando quiser
                </p>
              </div>
            )
          })}
        </section>

        {/* Trust */}
        <section className="text-center pt-8 max-w-2xl mx-auto space-y-2 text-xs text-muted-foreground">
          <p>💳 Aceitamos Pix, cartão de crédito (até 12x) e boleto · Processado pelo Mercado Pago</p>
          <p>🔒 Pagamento 100% seguro · Seus dados são criptografados</p>
        </section>
      </main>
    </div>
  )
}
