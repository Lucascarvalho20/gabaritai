'use client'

import { useState } from 'react'
import { Users, TrendingUp, Brain, AlertTriangle, CheckCircle2, Crown, Lock, Unlock, Eye, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { DEMO_USERS, CURSOS_DISPONIVEIS, getCourseLabel } from '@/lib/demo-users'
import { getOverrides, setOverride } from '@/lib/admin-store'
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

const COLORS = ['#2563eb', '#9333ea', '#16a34a', '#f59e0b', '#e11d48', '#0891b2', '#7c3aed']

function planDistribution() {
  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  return [
    { name: 'Premium', value: students.filter(u => u.plan === 'PREMIUM').length, fill: '#2563eb' },
    { name: 'Vitalício', value: students.filter(u => u.plan === 'LIFETIME').length, fill: '#f59e0b' },
    { name: 'Básico', value: students.filter(u => u.plan === 'BASIC').length, fill: '#9333ea' },
    { name: 'Grátis', value: students.filter(u => u.plan === 'FREE').length, fill: '#94a3b8' },
  ].filter(d => d.value > 0)
}

function courseDistribution() {
  return CURSOS_DISPONIVEIS.slice(0, 7).map((c, i) => ({
    name: c.label.split(' — ')[0].replace('Polícia ', 'PC ').replace('Banco do Brasil', 'BB').replace('Caixa Econômica', 'CEF').replace('Concurso Nacional', 'CNU'),
    alunos: DEMO_USERS.filter(u =>
      u.role === 'STUDENT' && (u.courses === 'all' || (u.courses as string[]).includes(c.id))
    ).length,
    fill: COLORS[i % COLORS.length],
  }))
}

export default function AdminPage() {
  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  const [overrides, setOverridesState] = useState<Record<string, any>>(() => getOverrides())
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)

  function effectivePlan(u: typeof DEMO_USERS[0]) {
    return overrides[u.id]?.plan ?? u.plan
  }
  function isActive(u: typeof DEMO_USERS[0]) {
    return overrides[u.id]?.active !== false
  }
  function handleGiveLifetime(u: typeof DEMO_USERS[0]) {
    setOverride(u.id, { plan: 'LIFETIME', active: true })
    setOverridesState(getOverrides())
    toast.success(`✅ Vitalício concedido para ${u.name.split(' — ')[1] ?? u.name.split(' ')[0]}!`)
  }
  function handleToggleActive(u: typeof DEMO_USERS[0]) {
    const active = !isActive(u)
    setOverride(u.id, { active })
    setOverridesState(getOverrides())
    toast.success(active ? `${u.name.split(' — ')[1] ?? u.name} reativado!` : `${u.name.split(' — ')[1] ?? u.name} suspenso!`)
  }

  const planData = planDistribution()
  const courseData = courseDistribution()

  const stats = {
    total:    students.length,
    lifetime: students.filter(u => effectivePlan(u) === 'LIFETIME').length,
    premium:  students.filter(u => effectivePlan(u) === 'PREMIUM').length,
    inativos: students.filter(u => !isActive(u)).length,
    betaTesters: students.filter(u => u.isBetaTester).length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1 text-sm">{students.length} beta testers cadastrados — dados reais do sistema</p>
      </div>

      {/* Stats reais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Beta testers', value: stats.total, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', icon: Users },
          { label: 'Com acesso vitalício', value: stats.lifetime, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: Crown },
          { label: 'Premium', value: stats.premium, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: TrendingUp },
          { label: 'Beta confirmados', value: stats.betaTesters, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10', icon: CheckCircle2 },
          { label: 'Suspensos', value: stats.inativos, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-900/20', icon: Lock },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Distribuição de planos */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-1">Planos dos beta testers</h2>
          <p className="text-xs text-muted-foreground mb-4">Dados reais dos {students.length} usuários</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cursos por alunos */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-1">Alunos por curso</h2>
          <p className="text-xs text-muted-foreground mb-4">Quantidade de beta testers com acesso a cada curso</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [v, 'Alunos']} />
                <Bar dataKey="alunos" radius={[0, 6, 6, 0]}>
                  {courseData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Beta testers — tabela real */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">Beta Testers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Dados reais — clique em ações para gerenciar</p>
          </div>
          <Link href="/admin/usuarios" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Gerenciar todos →</Link>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {['Usuário', 'Concurso alvo', 'Cursos', 'Plano', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map(u => {
                const plan   = effectivePlan(u)
                const active = isActive(u)
                const courseCount = u.courses === 'all' ? 'Todos' : `${(u.courses as string[]).length}`
                return (
                  <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${!active ? 'opacity-60' : ''}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-xs">{u.name.split(' — ')[1] ?? u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{u.concursoAlvo}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{courseCount} curso(s)</td>
                    <td className="py-3 pr-4">
                      <span className={`badge text-xs ${PLAN_COLOR[plan]}`}>{PLAN_LABEL[plan]}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {active
                        ? <span className="badge-green text-xs">● Ativo</span>
                        : <span className="badge-red text-xs">● Suspenso</span>
                      }
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedUser(u)} title="Ver detalhes"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleGiveLifetime(u)} title="Dar vitalício"
                          className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-muted-foreground hover:text-yellow-500 transition-colors">
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleActive(u)} title={active ? 'Suspender' : 'Reativar'}
                          className={`p-1.5 rounded-lg transition-colors ${active ? 'hover:bg-danger-50 text-muted-foreground hover:text-danger-500' : 'hover:bg-success-50 text-muted-foreground hover:text-success-600'}`}>
                          {active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas e insights */}
      <div className="card p-5 border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-900/10">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-500" />
          <h2 className="font-bold text-foreground">Insights do Admin</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: CheckCircle2, color: 'text-success-600', text: `${stats.betaTesters} de ${stats.total} beta testers confirmados. Todos têm acesso para testar as funcionalidades completas da plataforma.` },
            { icon: Crown, color: 'text-yellow-500', text: `${stats.lifetime} usuários com acesso vitalício. Eles verão o dashboard multi-cursos com todos os ${CURSOS_DISPONIVEIS.length} cursos disponíveis.` },
            { icon: AlertTriangle, color: 'text-warning-500', text: `${students.filter(u => u.plan === 'BASIC').length} usuários no plano Básico. Use a coroa (👑) na tabela acima para conceder acesso vitalício e facilitar os testes.` },
            { icon: Users, color: 'text-brand-500', text: `Concursos mais cobertos: PMDF (${students.filter(u => (u.courses as string[] | 'all') === 'all' || (u.courses as string[]).includes('pmdf-soldado')).length} alunos), PF (${students.filter(u => (u.courses as string[] | 'all') === 'all' || (u.courses as string[]).includes('pf-agente')).length} alunos), PRF (${students.filter(u => (u.courses as string[] | 'all') === 'all' || (u.courses as string[]).includes('prf-policial')).length} alunos).` },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
              <Icon className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
              <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
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

            <div className="space-y-0 mb-4">
              {[
                ['Senha (demo)', selectedUser.password],
                ['Plano atual', PLAN_LABEL[overrides[selectedUser.id]?.plan ?? selectedUser.plan]],
                ['Concurso alvo', selectedUser.concursoAlvo],
                ['Nível', selectedUser.nivel],
                ['Horas/dia', `${selectedUser.horasDia}h por dia`],
                ['Beta Tester', selectedUser.isBetaTester ? `✅ Sim — código: ${selectedUser.betaAccessCode}` : 'Não'],
                ['Cursos', selectedUser.courses === 'all' ? 'Todos os cursos' : (selectedUser.courses as string[]).map(c => getCourseLabel(c)).join(', ')],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-2 border-b border-border last:border-0 gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">{l}</span>
                  <span className="text-sm font-medium text-foreground text-right">{v}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-sm text-muted-foreground mb-1">Meta pessoal</div>
                <p className="text-sm bg-muted/50 p-3 rounded-xl italic text-foreground">"{selectedUser.meta}"</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { handleGiveLifetime(selectedUser); setSelectedUser(null) }} className="btn-primary btn-md">
                <Crown className="w-4 h-4" /> Dar vitalício
              </button>
              <button
                onClick={() => { handleToggleActive(selectedUser); setSelectedUser(null) }}
                className={isActive(selectedUser) ? 'btn-danger btn-md' : 'btn-outline btn-md'}
              >
                {isActive(selectedUser) ? <><Lock className="w-4 h-4" /> Suspender</> : <><Unlock className="w-4 h-4" /> Reativar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
