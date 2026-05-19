'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, EyeOff, Star, Briefcase, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Alerta = {
  id: string
  uf: string
  orgao: string
  vagas: string | null
  status: 'ABERTO' | 'PREVISTO'
  isRelevant: boolean
  linkedEdital: string | null
  dismissed: boolean
  firstSeenAt: string
  lastSeenAt: string
}

type Stats = { total: number; relevantes: number; abertos: number; previstos: number }

export default function ConcursosPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<{ uf?: string; status?: string; relevant: boolean }>({ relevant: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filter.uf) params.uf = filter.uf
      if (filter.status) params.status = filter.status
      if (filter.relevant) params.relevant = 'true'
      const { data } = await api.get('/admin/concursos', { params })
      setAlertas(data.alertas)
      setStats(data.stats)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function sync(scope: 'priority' | 'all') {
    setSyncing(true)
    try {
      const { data } = await api.post('/admin/concursos/sync', { scope })
      toast.success(`Sincronizado! ${data.novosAlertas} novos · ${data.relevantes} relevantes`)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function dismiss(id: string) {
    try {
      await api.patch(`/admin/concursos/${id}`, { dismissed: true })
      setAlertas((p) => p.filter((a) => a.id !== id))
      toast.success('Alerta ocultado')
    } catch { toast.error('Erro') }
  }

  async function toggleRelevant(a: Alerta) {
    try {
      await api.patch(`/admin/concursos/${a.id}`, { isRelevant: !a.isRelevant })
      setAlertas((p) => p.map((x) => x.id === a.id ? { ...x, isRelevant: !a.isRelevant } : x))
    } catch { toast.error('Erro') }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Concursos abertos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Sincronizados da <code className="text-xs">concursos-api.deno.dev</code> — admin revisa e cria Edital.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => sync('priority')}
            disabled={syncing}
            className="rounded-xl bg-brand-500 text-white px-3.5 py-2 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-1.5"
            title="DF, GO, MG, SC, SP"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            Sincronizar prioritárias
          </button>
          <button
            onClick={() => sync('all')}
            disabled={syncing}
            className="rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Todas as UFs
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} icon={Briefcase} />
          <StatCard label="Relevantes" value={stats.relevantes} icon={Star} accent="text-amber-500" />
          <StatCard label="Abertos" value={stats.abertos} accent="text-green-500" />
          <StatCard label="Previstos" value={stats.previstos} accent="text-blue-500" />
        </div>
      )}

      {/* Filtros */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filter.uf ?? ''}
          onChange={(e) => setFilter((p) => ({ ...p, uf: e.target.value || undefined }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todas UFs</option>
          {['DF', 'GO', 'MG', 'SC', 'SP', 'RJ', 'PR', 'RS', 'BA', 'PE'].map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select
          value={filter.status ?? ''}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value || undefined }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos status</option>
          <option value="ABERTO">Abertos</option>
          <option value="PREVISTO">Previstos</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.relevant}
            onChange={(e) => setFilter((p) => ({ ...p, relevant: e.target.checked }))}
          />
          Apenas militar/policial
        </label>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum alerta. Clique em "Sincronizar prioritárias" pra carregar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">UF</th>
                  <th className="px-4 py-3">Órgão</th>
                  <th className="px-4 py-3">Vagas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Visto em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id} className={cn('border-t border-border hover:bg-muted/30', a.isRelevant && 'bg-amber-50/40 dark:bg-amber-900/10')}>
                    <td className="px-4 py-3 font-mono text-xs">{a.uf}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.isRelevant && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        <span className="font-medium">{a.orgao}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.vagas ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'badge text-xs',
                        a.status === 'ABERTO' ? 'badge-green' : 'badge-blue'
                      )}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(a.lastSeenAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => toggleRelevant(a)}
                          className="p-1.5 rounded-md hover:bg-muted"
                          title={a.isRelevant ? 'Marcar como não relevante' : 'Marcar como relevante'}
                        >
                          <Star className={cn('w-3.5 h-3.5', a.isRelevant ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                        </button>
                        <button
                          onClick={() => dismiss(a.id)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                          title="Ocultar"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon?: any; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium uppercase">{label}</span>
        {Icon && <Icon className={cn('w-4 h-4', accent ?? 'text-brand-500')} />}
      </div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
    </div>
  )
}
