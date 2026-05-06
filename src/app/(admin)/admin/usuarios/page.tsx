'use client'

import { useState, useEffect } from 'react'
import { DEMO_USERS } from '@/lib/demo-users'
import { getOverrides, setOverride, clearOverride } from '@/lib/admin-store'
import {
  Search, Eye, Edit2, Lock, Unlock, Crown,
  X, Check, Download, RefreshCw, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const PLAN_COLOR: Record<string, string> = {
  LIFETIME: 'badge-yellow',
  PREMIUM:  'badge-blue',
  BASIC:    'badge-purple',
  FREE:     'bg-muted text-muted-foreground',
}
const PLAN_LABEL: Record<string, string> = {
  LIFETIME: '♾️ Vitalício',
  PREMIUM:  '⭐ Premium',
  BASIC:    '📘 Básico',
  FREE:     '🆓 Grátis',
}

export default function AdminUsuariosPage() {
  const [search, setSearch]           = useState('')
  const [filterPlan, setFilterPlan]   = useState('all')
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const [overrides, setOverrides]     = useState<Record<string, any>>({})
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [newPlan, setNewPlan]         = useState('')

  useEffect(() => { setOverrides(getOverrides()) }, [])

  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')

  function effectivePlan(u: typeof DEMO_USERS[0]) {
    return overrides[u.id]?.plan ?? u.plan
  }
  function isActive(u: typeof DEMO_USERS[0]) {
    return overrides[u.id]?.active !== false
  }

  const filtered = students.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'all' || effectivePlan(u) === filterPlan
    return matchSearch && matchPlan
  })

  const stats = {
    total:    students.length,
    lifetime: students.filter(u => effectivePlan(u) === 'LIFETIME').length,
    premium:  students.filter(u => effectivePlan(u) === 'PREMIUM').length,
    basic:    students.filter(u => effectivePlan(u) === 'BASIC').length,
    free:     students.filter(u => effectivePlan(u) === 'FREE').length,
    inativos: students.filter(u => !isActive(u)).length,
  }

  function handleChangePlan(userId: string, plan: string) {
    setOverride(userId, { plan })
    setOverrides(getOverrides())
    setEditingUserId(null)
    toast.success(`Plano alterado para ${PLAN_LABEL[plan]}!`)
  }

  function handleToggleActive(u: typeof DEMO_USERS[0]) {
    const active = !isActive(u)
    setOverride(u.id, { active })
    setOverrides(getOverrides())
    toast.success(active ? `${u.name.split(' ')[0]} reativado!` : `${u.name.split(' ')[0]} suspenso!`)
  }

  function handleGiveLifetime(u: typeof DEMO_USERS[0]) {
    setOverride(u.id, { plan: 'LIFETIME', active: true })
    setOverrides(getOverrides())
    toast.success(`✅ Acesso vitalício concedido para ${u.name.split(' ')[0]}!`)
  }

  function handleReset(u: typeof DEMO_USERS[0]) {
    clearOverride(u.id)
    setOverrides(getOverrides())
    toast.success('Conta resetada para configuração original.')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gerenciar Usuários</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} beta testers cadastrados</p>
        </div>
        <button className="btn-outline btn-sm">
          <Download className="w-3.5 h-3.5" /> Exportar lista
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { l: 'Total', v: stats.total,    c: 'text-foreground' },
          { l: 'Vitalícios', v: stats.lifetime, c: 'text-yellow-500' },
          { l: 'Premium',    v: stats.premium,  c: 'text-brand-500' },
          { l: 'Básico',     v: stats.basic,    c: 'text-purple-500' },
          { l: 'Grátis',     v: stats.free,     c: 'text-muted-foreground' },
          { l: 'Suspensos',  v: stats.inativos, c: 'text-danger-500' },
        ].map(s => (
          <div key={s.l} className="card p-3 text-center">
            <div className={`text-xl font-black ${s.c}`}>{s.v}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="input pl-9" placeholder="Buscar nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
          <option value="all">Todos os planos</option>
          {['LIFETIME', 'PREMIUM', 'BASIC', 'FREE'].map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Usuário', 'Concurso / Cursos', 'Plano', 'Status', 'Beta', 'Ações rápidas'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => {
                const plan   = effectivePlan(u)
                const active = isActive(u)
                const override = overrides[u.id]
                return (
                  <tr key={u.id} className={cn('hover:bg-muted/20 transition-colors', !active && 'opacity-60')}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                          {override && <div className="text-xs text-brand-500 font-medium">✏️ modificado pelo admin</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-foreground">{u.concursoAlvo}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.courses === 'all' ? 'Todos os cursos' : `${(u.courses as string[]).length} curso(s)`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {editingUserId === u.id ? (
                        <div className="flex gap-1">
                          <select className="input py-1 text-xs w-28" value={newPlan} onChange={e => setNewPlan(e.target.value)} autoFocus>
                            <option value="">Selecione</option>
                            {['FREE', 'BASIC', 'PREMIUM', 'LIFETIME'].map(p => (
                              <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                            ))}
                          </select>
                          <button onClick={() => newPlan && handleChangePlan(u.id, newPlan)} className="btn-primary btn-sm p-1.5"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingUserId(null)} className="btn-ghost btn-sm p-1.5"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingUserId(u.id); setNewPlan(plan) }}
                          className={`badge cursor-pointer hover:opacity-80 transition-opacity ${PLAN_COLOR[plan]}`}>
                          {PLAN_LABEL[plan]} <Edit2 className="w-2.5 h-2.5 ml-1" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {active
                        ? <span className="badge-green text-xs">● Ativo</span>
                        : <span className="badge-red text-xs">● Suspenso</span>
                      }
                    </td>
                    <td className="py-3 px-4">
                      {u.isBetaTester ? <span className="badge-blue text-xs">Beta ✓</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setSelectedUser(u)} title="Detalhes"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleGiveLifetime(u)} title="Dar acesso vitalício"
                          className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-muted-foreground hover:text-yellow-500 transition-colors">
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleActive(u)} title={active ? 'Suspender conta' : 'Reativar conta'}
                          className={cn('p-1.5 rounded-lg transition-colors', active
                            ? 'hover:bg-danger-50 dark:hover:bg-danger-900/20 text-muted-foreground hover:text-danger-500'
                            : 'hover:bg-success-50 dark:hover:bg-success-600/20 text-muted-foreground hover:text-success-600')}>
                          {active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        {override && (
                          <button onClick={() => handleReset(u)} title="Desfazer alterações do admin"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda das ações */}
      <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">👁️ Olho</strong> — ver detalhes completos do usuário</p>
            <p><strong className="text-foreground">👑 Coroa</strong> — conceder acesso vitalício imediatamente (gratuito para sempre)</p>
            <p><strong className="text-foreground">🔒 Cadeado</strong> — suspender conta (usuário não consegue mais logar)</p>
            <p><strong className="text-foreground">🔓 Cadeado aberto</strong> — reativar conta suspensa</p>
            <p><strong className="text-foreground">🔄 Atualizar</strong> — desfazer todas as alterações do admin nessa conta</p>
            <p className="text-warning-600 dark:text-warning-400 mt-2">⚠️ As alterações ficam salvas no navegador. Em produção com banco de dados, serão permanentes.</p>
          </div>
        </div>
      </div>

      {/* Modal detalhes */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="font-black text-foreground">{selectedUser.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2 mb-4">
              {[
                ['Plano atual', PLAN_LABEL[effectivePlan(selectedUser)]],
                ['Concurso alvo', selectedUser.concursoAlvo],
                ['Nível', selectedUser.nivel],
                ['Horas/dia', `${selectedUser.horasDia}h por dia`],
                ['Beta Tester', selectedUser.isBetaTester ? '✅ Sim — acesso vitalício garantido' : 'Não'],
                ['Cursos', selectedUser.courses === 'all' ? 'Todos' : (selectedUser.courses as string[]).join(', ')],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{l}</span>
                  <span className="text-sm font-medium text-foreground">{v}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-sm text-muted-foreground mb-1">Meta pessoal</div>
                <p className="text-sm bg-muted/50 p-3 rounded-xl italic text-foreground">"{selectedUser.meta}"</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { handleGiveLifetime(selectedUser); setSelectedUser(null) }}
                className="btn-primary btn-md">
                <Crown className="w-4 h-4" /> Dar vitalício
              </button>
              <button onClick={() => { handleToggleActive(selectedUser); setSelectedUser(null) }}
                className={isActive(selectedUser) ? 'btn-danger btn-md' : 'btn-outline btn-md'}>
                {isActive(selectedUser) ? <><Lock className="w-4 h-4" /> Suspender</> : <><Unlock className="w-4 h-4" /> Reativar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
