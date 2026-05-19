'use client'

import { useEffect, useState } from 'react'
import { Tag, Loader2, Plus, Trash2, Calendar, Users, DollarSign, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Coupon = {
  id: string
  code: string
  description: string | null
  type: 'PERCENT' | 'FIXED'
  value: number
  minAmountCents: number | null
  maxUses: number | null
  usedCount: number
  maxPerUser: number
  validFrom: string | null
  validUntil: string | null
  active: boolean
  createdAt: string
  _count: { redemptions: number }
}

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/coupons')
      setCoupons(data.coupons)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function toggle(c: Coupon) {
    try {
      await api.patch(`/admin/coupons/${c.id}`, { active: !c.active })
      load()
    } catch { toast.error('Erro') }
  }

  async function remove(c: Coupon) {
    if (!confirm(`Desativar cupom ${c.code}? (histórico de uso preservado)`)) return
    try {
      await api.delete(`/admin/coupons/${c.id}`)
      load()
    } catch { toast.error('Erro') }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Tag className="w-6 h-6 text-yellow-500" /> Cupons de desconto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Crie códigos promocionais pra alunos aplicarem no checkout.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-yellow-500 text-white px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo cupom
        </button>
      </div>

      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        coupons.length === 0 ? (
          <div className="card p-10 text-center">
            <Tag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum cupom criado ainda.</p>
            <button onClick={() => setShowCreate(true)} className="rounded-xl bg-yellow-500 text-white px-4 py-2 text-sm font-bold">
              Criar o primeiro
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className={cn('card p-4', !c.active && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <code className="text-base font-black font-mono bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">{c.code}</code>
                      <span className={cn('badge text-[10px]', c.active ? 'badge-green' : 'badge-red')}>{c.active ? 'ATIVO' : 'INATIVO'}</span>
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                        {c.type === 'PERCENT' ? `${c.value}% off` : `R$ ${(c.value / 100).toFixed(2)} off`}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {c.usedCount}/{c.maxUses ?? '∞'} usos</span>
                      <span>· {c.maxPerUser} por aluno</span>
                      {c.minAmountCents && <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" /> mín R$ {(c.minAmountCents / 100).toFixed(2)}</span>}
                      {c.validUntil && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> até {new Date(c.validUntil).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => toggle(c)}
                      className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold">
                      {c.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => remove(c)}
                      className="rounded-lg border border-red-300 text-red-600 px-2 py-1.5 text-xs hover:bg-red-50">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {showCreate && <CreateCouponModal onClose={() => { setShowCreate(false); load() }} />}
    </div>
  )
}

function CreateCouponModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [value, setValue] = useState('20')
  const [maxUses, setMaxUses] = useState('')
  const [maxPerUser, setMaxPerUser] = useState('1')
  const [validUntil, setValidUntil] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!code) return toast.error('Código obrigatório')
    setSaving(true)
    try {
      await api.post('/admin/coupons', {
        code, description: description || undefined,
        type, value: parseInt(value, 10),
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
        maxPerUser: parseInt(maxPerUser, 10),
        validUntil: validUntil || undefined,
      })
      toast.success('Cupom criado!')
      onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Novo cupom</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs font-bold">Código (ex: BLACK50)</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
        </div>

        <div>
          <label className="text-xs font-bold">Descrição (interna)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Black Friday 2026"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="PERCENT">% Porcentagem</option>
              <option value="FIXED">R$ Valor fixo</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold">Valor {type === 'PERCENT' ? '(% 1-100)' : '(centavos)'}</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} type="number"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold">Máx usos total</label>
            <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number"
              placeholder="∞" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold">Por aluno</label>
            <input value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)} type="number"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">Válido até (opcional)</label>
          <input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} type="date"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <button onClick={save} disabled={saving || !code}
          className="w-full rounded-xl bg-yellow-500 text-white py-2.5 text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Criar cupom'}
        </button>
      </div>
    </div>
  )
}
