'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Check, ShieldCheck, AlertTriangle, ArrowLeft, CreditCard } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Plan = {
  id: string
  slug: string
  name: string
  description: string | null
  type: string
  interval: string
  priceCents: number
  pixDiscount: number
  moneyBackDays: number
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL'
  coverageData: string[] | null
  features: string[]
}

type Course = { id: string; slug: string; name: string; cargo: string | null; parentSlug: string | null; orgao: string | null }
type Group = { parentSlug: string; orgao: string | null; uf: string | null; label: string; cargos: Course[] }

const INTERVAL_LABEL: Record<string, string> = {
  TRIAL: '', MONTH: '/mês', YEAR: '/ano', LIFETIME: 'pra sempre',
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CheckoutPage() {
  const params = useParams<{ planSlug: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [parentSlug, setParentSlug] = useState('')
  const [courseSlug, setCourseSlug] = useState('')
  const [useDiscount, setUseDiscount] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Cupom
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountCents: number } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [plansData, coursesData] = await Promise.all([
          fetch('/api/plans/public').then((r) => r.json()),
          fetch('/api/courses?all=true').then((r) => r.json()),
        ])
        const plans: Plan[] = plansData.plans ?? []
        let p = plans.find((x) => x.slug === params.planSlug) ?? null

        // Fallback 1: plano oculto (isVisible=false) — busca direto por slug
        // (planos de teste/promo de link-direto não vêm na lista pública).
        if (!p) {
          const single = await fetch(`/api/plans/${params.planSlug}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
          if (single?.plan) p = single.plan
        }

        // Fallback 2: trial-7-dias x trial-3d/trial-7d (compat seeds antigos)
        if (!p && params.planSlug.startsWith('trial-')) {
          const fallback = plans.find((x) => x.slug.startsWith('trial-'))
          if (fallback) {
            router.replace(`/checkout/${fallback.slug}`)
            return
          }
        }

        if (!p) {
          toast.error('Plano não encontrado')
          router.push('/planos')
          return
        }
        setPlan(p)
        setGroups(coursesData.groups ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [params.planSlug, router])

  // Quando muda o concurso pai, reseta o cargo
  useEffect(() => {
    if (!parentSlug) { setCourseSlug(''); return }
    const g = groups.find((x) => x.parentSlug === parentSlug)
    if (g?.cargos.length) setCourseSlug(g.cargos[0].slug)
  }, [parentSlug, groups])

  const selectedGroup = groups.find((g) => g.parentSlug === parentSlug)

  async function validateCoupon() {
    if (!couponCode) return
    setValidatingCoupon(true)
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, planSlug: params.planSlug })
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discountCents: data.discountCents })
        toast.success(`Cupom aplicado: -${(data.discountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
      } else {
        toast.error(data.message ?? 'Cupom inválido')
        setAppliedCoupon(null)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Cupom inválido')
      setAppliedCoupon(null)
    } finally { setValidatingCoupon(false) }
  }

  async function pay() {
    if (!user) {
      // Salva o plano no localStorage e redireciona pra login
      localStorage.setItem('gabaritai_pending_plan', JSON.stringify({ slug: params.planSlug, courseSlug }))
      router.push(`/login?redirect=/checkout/${params.planSlug}`)
      return
    }
    if (!plan) return
    const isCombo = plan.type === 'COMBO' || plan.type === 'FULL_ACCESS'
    const needsCourseChoice = plan.coverageType === 'SPECIFIC' && !isCombo
    if (needsCourseChoice && !courseSlug) {
      return toast.error('Selecione o curso')
    }
    setProcessing(true)
    try {
      const { data } = await api.post('/checkout', {
        planSlug: plan.slug,
        courseSlug: needsCourseChoice ? courseSlug : undefined,
        useDiscount,
        couponCode: appliedCoupon?.code,
      })
      if (data.free) {
        router.push(data.redirect)
        return
      }
      // Redireciona pro checkout do MP
      window.location.href = data.checkoutUrl
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar checkout')
      setProcessing(false)
    }
  }

  if (loading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const pixPrice = plan.pixDiscount > 0 && useDiscount
    ? plan.priceCents * (1 - plan.pixDiscount / 100)
    : plan.priceCents

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link href="/planos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar aos planos
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo do plano */}
        <div className="card p-6 space-y-4">
          <h1 className="font-bold text-xl">{plan.name}</h1>
          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

          <ul className="space-y-2 text-sm pt-3 border-t border-border">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Garantia incondicional de {plan.moneyBackDays} dias</span>
          </div>
        </div>

        {/* Checkout */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-lg">Finalizar compra</h2>

          {!user && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-200">
              Você será direcionado pra login antes de pagar.
            </div>
          )}

          {/* Combo/FullAccess: mostra lista de cursos inclusos, não pede escolha */}
          {(plan.type === 'COMBO' || plan.type === 'FULL_ACCESS') && (
            <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40">
              <p className="text-xs font-bold text-brand-700 dark:text-brand-300 mb-2">
                Esse plano inclui {plan.coverageType === 'ALL' ? 'todos os cursos do site' : `${(plan.coverageData ?? []).length} cursos`}:
              </p>
              {plan.coverageType === 'SPECIFIC' && Array.isArray(plan.coverageData) && plan.coverageData.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {plan.coverageData.map((slug) => {
                    const found = groups.flatMap((g) => g.cargos).find((c) => c.slug === slug)
                    const label = found ? `${found.name}${found.cargo ? ' — ' + found.cargo : ''}` : slug
                    return (
                      <li key={slug} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-success-500 mt-0.5 shrink-0" />
                        <span>{label}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Acesso liberado em todos. Cronograma adapta automaticamente.
              </p>
            </div>
          )}

          {/* Single course: pede escolha */}
          {plan.coverageType === 'SPECIFIC' && plan.type !== 'COMBO' && plan.type !== 'FULL_ACCESS' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">1. Concurso</label>
                <select
                  value={parentSlug}
                  onChange={(e) => setParentSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— escolha o concurso —</option>
                  {groups.map((g) => (
                    <option key={g.parentSlug} value={g.parentSlug}>
                      {g.label}{g.uf ? ` (${g.uf})` : ''} {g.cargos.length > 1 ? `— ${g.cargos.length} cargos` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedGroup && selectedGroup.cargos.length > 1 && (
                <div>
                  <label className="text-xs font-semibold">2. Cargo</label>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {selectedGroup.cargos.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCourseSlug(c.slug)}
                        className={cn(
                          'rounded-lg border-2 px-2 py-2 text-xs font-semibold transition text-left',
                          courseSlug === c.slug ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-border hover:bg-muted',
                        )}
                      >
                        {c.cargo ?? c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedGroup && selectedGroup.cargos.length === 1 && (
                <p className="text-[11px] text-muted-foreground">
                  ✓ Cargo único: <strong>{selectedGroup.cargos[0].cargo ?? selectedGroup.cargos[0].name}</strong>
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">Pode trocar de curso depois (mantém o plano).</p>
            </div>
          )}

          {plan.pixDiscount > 0 && (
            <label className={cn(
              'flex items-start gap-2 p-3 rounded-lg cursor-pointer border-2 transition',
              useDiscount ? 'border-success-500 bg-success-50 dark:bg-success-900/20' : 'border-border',
            )}>
              <input
                type="checkbox"
                checked={useDiscount}
                onChange={(e) => setUseDiscount(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm">Pagar via Pix ({plan.pixDiscount}% off)</div>
                <div className="text-xs text-muted-foreground">
                  Desconto aplicado automaticamente. Liberação imediata após confirmação.
                </div>
              </div>
            </label>
          )}

          {/* Cupom */}
          {plan.priceCents > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold">🏷️ Cupom de desconto</label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="DIGITE O CÓDIGO"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  disabled={validatingCoupon || !couponCode}
                  className="rounded-lg bg-yellow-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                </button>
              </div>
              {appliedCoupon && (
                <div className="text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                  ✓ Cupom <strong>{appliedCoupon.code}</strong> aplicado: -{fmtBRL(appliedCoupon.discountCents)}
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="bg-muted/40 p-4 rounded-xl">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{fmtBRL(plan.priceCents)}</span>
            </div>
            {useDiscount && plan.pixDiscount > 0 && (
              <div className="flex justify-between text-sm text-success-600">
                <span>Desconto Pix</span>
                <span>- {fmtBRL(plan.priceCents - pixPrice)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-yellow-600">
                <span>Cupom {appliedCoupon.code}</span>
                <span>- {fmtBRL(appliedCoupon.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span>{fmtBRL(Math.max(0, pixPrice - (appliedCoupon?.discountCents ?? 0)))}<span className="text-xs font-normal text-muted-foreground ml-1">{INTERVAL_LABEL[plan.interval]}</span></span>
            </div>
          </div>

          <button
            onClick={pay}
            disabled={processing || (plan.coverageType === 'SPECIFIC' && !courseSlug)}
            className="w-full rounded-xl bg-brand-500 text-white py-3 font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando…</> :
             plan.priceCents === 0 ? 'Ativar trial grátis' :
             <><CreditCard className="w-4 h-4" /> Ir para pagamento</>}
          </button>

          {plan.priceCents > 0 && (
            <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
              <p>🔒 Pagamento processado pelo Mercado Pago</p>
              <p>💳 Pix · Cartão (até 12x) · Boleto</p>
            </div>
          )}

          {!process.env.NEXT_PUBLIC_MP_READY && (
            <div className="p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 text-[11px] text-yellow-800 dark:text-yellow-200 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>Modo dev:</strong> sem <code>MERCADOPAGO_ACCESS_TOKEN</code> no .env, o checkout vai dar erro. Configure no Mercado Pago Developers e adicione no <code>.env</code>.
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
