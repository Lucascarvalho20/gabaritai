'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Edit2, Save, X, Loader2, Check, Power, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
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
  coverageType: string
  coverageData: any
  maxCourses: number | null
  features: string[]
  badge: string | null
  limitTotal: number | null
  soldCount: number
  active: boolean
  isVisible: boolean
  sortOrder: number
}

const INTERVAL_LABEL: Record<string, string> = {
  TRIAL: 'Trial',
  MONTH: '/mês',
  YEAR: '/ano',
  LIFETIME: 'vitalício',
}

const TYPE_BADGE: Record<string, string> = {
  TRIAL: 'badge-yellow',
  SINGLE_COURSE: 'badge-blue',
  COMBO: 'badge-purple',
  FULL_ACCESS: 'badge-green',
  VITALICIO_PROMO: 'badge-red',
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Partial<Plan>>({})

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/plans')
      setPlans(data.plans)
    } catch (e: any) {
      toast.error('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Plan) {
    setEditingId(p.id)
    setEdits({
      name: p.name, description: p.description, priceCents: p.priceCents,
      pixDiscount: p.pixDiscount, badge: p.badge, features: p.features,
    })
  }

  async function save(id: string) {
    try {
      await api.patch(`/admin/plans/${id}`, edits)
      toast.success('Plano atualizado')
      setEditingId(null)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function toggleActive(p: Plan) {
    try {
      await api.patch(`/admin/plans/${p.id}`, { isVisible: !p.isVisible })
      toast.success(p.isVisible ? 'Ocultado' : 'Visível')
      load()
    } catch { toast.error('Erro') }
  }

  const visiblePlans = plans.filter((p) => p.isVisible)
  const totalActive = plans.filter((p) => p.active).length
  const mrrPotential = plans.filter((p) => p.interval === 'MONTH' && p.active).reduce((acc, p) => acc + p.priceCents, 0) / 100

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Planos e preços</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Edite nome, descrição e preço inline. Mudanças refletem na hora.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Planos ativos" value={totalActive} icon={DollarSign} />
        <StatCard label="Visíveis pro público" value={visiblePlans.length} icon={Sparkles} />
        <StatCard label="MRR potencial (1 venda mensal de cada)" value={fmtBRL(mrrPotential * 100)} icon={DollarSign} accent="text-green-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const editing = editingId === p.id
          const sold = p.limitTotal ? `${p.soldCount}/${p.limitTotal}` : null
          return (
            <div key={p.id} className={cn('card p-5 space-y-3 relative', !p.isVisible && 'opacity-60')}>
              {p.badge && (
                <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold">
                  {p.badge}
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className={cn(TYPE_BADGE[p.type], 'text-[10px]')}>{p.type}</span>
                  {editing ? (
                    <input
                      value={edits.name as string ?? ''}
                      onChange={(e) => setEdits((pp) => ({ ...pp, name: e.target.value }))}
                      className="mt-1 font-bold text-lg w-full rounded border border-border bg-background px-2 py-1"
                    />
                  ) : (
                    <h2 className="mt-1 font-bold text-lg text-foreground truncate">{p.name}</h2>
                  )}
                </div>
                {editing ? (
                  <div className="flex gap-1">
                    <button onClick={() => save(p.id)} className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200">
                      <Save className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-muted">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-md hover:bg-muted" title="Editar">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => toggleActive(p)} className="p-1.5 rounded-md hover:bg-muted" title={p.isVisible ? 'Ocultar' : 'Tornar visível'}>
                      <Power className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <textarea
                  value={edits.description as string ?? ''}
                  onChange={(e) => setEdits((pp) => ({ ...pp, description: e.target.value }))}
                  className="w-full text-xs rounded border border-border bg-background px-2 py-1.5"
                  rows={2}
                />
              ) : p.description && (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              )}

              <div className="flex items-baseline gap-1.5 pt-2 border-t border-border">
                {editing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={((edits.priceCents as number) ?? 0) / 100}
                      onChange={(e) => setEdits((pp) => ({ ...pp, priceCents: Math.round(parseFloat(e.target.value) * 100) }))}
                      className="w-24 rounded border border-border bg-background px-2 py-1 text-lg font-black"
                    />
                  </div>
                ) : (
                  <span className="text-3xl font-black text-foreground tabular-nums">{fmtBRL(p.priceCents)}</span>
                )}
                <span className="text-xs text-muted-foreground">{INTERVAL_LABEL[p.interval]}</span>
              </div>

              {p.pixDiscount > 0 && (
                <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                  💸 {p.pixDiscount}% off no Pix = {fmtBRL(p.priceCents * (1 - p.pixDiscount / 100))}
                </div>
              )}

              <ul className="space-y-1 text-xs">
                {p.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-success-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {p.features.length > 5 && (
                  <li className="text-muted-foreground text-[10px]">+ {p.features.length - 5} benefícios</li>
                )}
              </ul>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                <span>Garantia {p.moneyBackDays}d</span>
                {sold && <span className="font-bold text-amber-600">🔥 {sold} vendidos</span>}
                {!p.isVisible && <span className="badge-yellow">oculto</span>}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        💡 Edite nome, descrição, preço e desconto inline · Pra mudanças profundas (cobertura, intervalo) crie novo plano
      </p>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase">{label}</span>
        <Icon className={cn('w-4 h-4', accent ?? 'text-brand-500')} />
      </div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
    </div>
  )
}
