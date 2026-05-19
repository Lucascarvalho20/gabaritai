'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, DollarSign, CheckCircle2, XCircle, Clock, RefreshCw, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Payment = {
  id: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED'
  paymentMethod: string | null
  pricingPlanSlug: string | null
  courseSlug: string | null
  paidAt: string | null
  expiresAt: string | null
  createdAt: string
  installments: number | null
  user: { id: string; name: string; email: string | null; username: string | null }
}

type Stats = {
  revenue: number
  approvedCount: number
  avgTicket: number
  approvalRate: number
  byStatus: Record<string, number>
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  REFUNDED: 'badge-purple',
  CANCELLED: 'badge text-muted-foreground bg-muted',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado',
}

const METHOD_LABEL: Record<string, string> = {
  pix: '🟦 Pix',
  credit_card: '💳 Cartão',
  debit_card: '💳 Débito',
  ticket: '📄 Boleto',
  account_money: '💰 Saldo MP',
}

function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—' }

export default function AdminPagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', plan: '', days: 30 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { days: String(filter.days) }
      if (filter.status) params.status = filter.status
      if (filter.plan) params.plan = filter.plan
      const { data } = await api.get('/admin/payments', { params })
      setPayments(data.payments)
      setStats(data.stats)
    } catch (e: any) {
      toast.error('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vendas, status e métricas em tempo real.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Receita aprovada" value={fmtBRL(stats.revenue)} icon={DollarSign} accent="text-green-500" />
          <StatCard label="Vendas aprovadas" value={stats.approvedCount} icon={CheckCircle2} accent="text-green-500" />
          <StatCard label="Ticket médio" value={fmtBRL(stats.avgTicket)} icon={DollarSign} />
          <StatCard label="Taxa de aprovação" value={`${stats.approvalRate.toFixed(1)}%`} icon={CheckCircle2} accent={stats.approvalRate >= 70 ? 'text-green-500' : 'text-yellow-500'} />
        </div>
      )}

      {/* Stats por status (compact) */}
      {stats && (
        <div className="card p-3 flex flex-wrap items-center gap-4 text-xs">
          {Object.entries(stats.byStatus).map(([s, count]) => (
            <span key={s} className={cn(STATUS_BADGE[s], 'inline-flex items-center gap-1')}>
              {STATUS_LABEL[s]}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="APPROVED">Aprovados</option>
          <option value="PENDING">Pendentes</option>
          <option value="REJECTED">Rejeitados</option>
          <option value="REFUNDED">Reembolsados</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        <select
          value={filter.days}
          onChange={(e) => setFilter((p) => ({ ...p, days: parseInt(e.target.value, 10) }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
        </select>
        <input
          placeholder="Filtrar por slug do plano…"
          value={filter.plan}
          onChange={(e) => setFilter((p) => ({ ...p, plan: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum pagamento no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Vence</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-xs">{p.user.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.user.email ?? (p.user.username ? `@${p.user.username}` : '—')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <code className="text-[10px] text-muted-foreground">{p.pricingPlanSlug ?? '—'}</code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.courseSlug ?? '—'}</td>
                    <td className="px-4 py-3 font-bold tabular-nums">{fmtBRL(p.amount)}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.paymentMethod ? METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod : '—'}
                      {p.installments && p.installments > 1 && (
                        <span className="block text-[10px] text-muted-foreground">{p.installments}x</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(STATUS_BADGE[p.status], 'text-[10px]')}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.expiresAt ? fmtDate(p.expiresAt).split(' ')[0] : (p.status === 'APPROVED' ? '∞' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        💡 Pagamentos integrados via Mercado Pago · Webhook ativo · Receita atualizada em tempo real
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
