'use client'

import { useState } from 'react'
import { DEMO_USERS, CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import {
  Search, Filter, Eye, Edit2, Lock, Unlock, Crown, Star,
  ChevronDown, ChevronUp, X, Check, UserPlus, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PLAN_COLOR: Record<string, string> = {
  LIFETIME: 'badge-yellow',
  PREMIUM: 'badge-blue',
  BASIC: 'badge-purple',
  FREE: 'bg-muted text-muted-foreground',
}
const PLAN_LABEL: Record<string, string> = {
  LIFETIME: '♾️ Vitalício',
  PREMIUM: '⭐ Premium',
  BASIC: '📘 Básico',
  FREE: 'Grátis',
}

export default function AdminUsuariosPage() {
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)

  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  const filtered = students.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan
    return matchSearch && matchPlan
  })

  const stats = {
    total: students.length,
    lifetime: students.filter(u => u.plan === 'LIFETIME').length,
    premium: students.filter(u => u.plan === 'PREMIUM').length,
    basic: students.filter(u => u.plan === 'BASIC').length,
    free: students.filter(u => u.plan === 'FREE').length,
    beta: students.filter(u => u.isBetaTester).length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gerenciar Usuários</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} alunos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button className="btn-primary btn-sm">
            <UserPlus className="w-3.5 h-3.5" /> Adicionar usuário
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total alunos', value: stats.total, color: 'text-foreground' },
          { label: 'Vitalícios', value: stats.lifetime, color: 'text-yellow-500' },
          { label: 'Premium', value: stats.premium, color: 'text-brand-500' },
          { label: 'Básico', value: stats.basic, color: 'text-purple-500' },
          { label: 'Beta testers', value: stats.beta, color: 'text-success-600' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
        >
          <option value="all">Todos os planos</option>
          <option value="LIFETIME">Vitalício</option>
          <option value="PREMIUM">Premium</option>
          <option value="BASIC">Básico</option>
          <option value="FREE">Grátis</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Usuário', 'Concurso / Cursos', 'Plano', 'Beta', 'Acesso', 'Ações'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-foreground">{u.concursoAlvo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {u.courses === 'all' ? 'Todos os cursos' : (u.courses as string[]).map(c =>
                        CURSOS_DISPONIVEIS.find(d => d.id === c)?.label ?? c
                      ).join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {editingPlan === u.id ? (
                      <select
                        className="input py-1 text-xs w-28"
                        defaultValue={u.plan}
                        onChange={() => setEditingPlan(null)}
                        onBlur={() => setEditingPlan(null)}
                        autoFocus
                      >
                        {['FREE', 'BASIC', 'PREMIUM', 'LIFETIME'].map(p => (
                          <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingPlan(u.id)}
                        className={`badge cursor-pointer hover:opacity-80 transition-opacity ${PLAN_COLOR[u.plan]}`}
                      >
                        {PLAN_LABEL[u.plan]} <Edit2 className="w-2.5 h-2.5 ml-1" />
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.isBetaTester ? (
                      <span className="badge-green text-xs">✓ Beta</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge-green text-xs">Ativo</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Ver detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-brand-500"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors text-muted-foreground hover:text-danger-500"
                        title="Suspender"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-black text-foreground">{selectedUser.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-ghost btn-sm p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                ['Plano', PLAN_LABEL[selectedUser.plan]],
                ['Concurso alvo', selectedUser.concursoAlvo],
                ['Nível', selectedUser.nivel],
                ['Horas/dia disponíveis', `${selectedUser.horasDia}h`],
                ['Beta Tester', selectedUser.isBetaTester ? 'Sim (acesso vitalício garantido)' : 'Não'],
                ['Cursos com acesso', selectedUser.courses === 'all' ? 'Todos' : (selectedUser.courses as string[]).length + ' curso(s)'],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{l}</span>
                  <span className="text-sm font-medium text-foreground">{v}</span>
                </div>
              ))}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Meta pessoal</div>
                <p className="text-sm text-foreground bg-muted/50 p-3 rounded-xl italic">"{selectedUser.meta}"</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-outline btn-md flex-1">
                <Edit2 className="w-4 h-4" /> Editar perfil
              </button>
              <button className="btn-primary btn-md flex-1">
                <Crown className="w-4 h-4" /> Mudar plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
