'use client'

import { Users, TrendingUp, DollarSign, BookOpen, Brain, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Eye } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts'
import Link from 'next/link'

const revenueData = [
  { mes: 'Jan', receita: 1200 }, { mes: 'Fev', receita: 1900 }, { mes: 'Mar', receita: 2400 },
  { mes: 'Abr', receita: 3100 }, { mes: 'Mai', receita: 3800 }, { mes: 'Jun', receita: 4200 },
]

const performanceData = [
  { materia: 'Dir. Const.', media: 74 }, { materia: 'Dir. Penal', media: 61 },
  { materia: 'Matemática', media: 52 }, { materia: 'Português', media: 69 },
  { materia: 'Conhec. Pol.', media: 45 },
]

const recentUsers = [
  { id: 1, name: 'Ana Silva', email: 'ana@email.com', plan: 'Premium', concurso: 'PMDF', acerto: 78, status: 'Ativo' },
  { id: 2, name: 'Carlos Lima', email: 'carlos@email.com', plan: 'Básico', concurso: 'PF', acerto: 64, status: 'Ativo' },
  { id: 3, name: 'Maria Costa', email: 'maria@email.com', plan: 'Premium', concurso: 'BB', acerto: 82, status: 'Ativo' },
  { id: 4, name: 'Pedro Santos', email: 'pedro@email.com', plan: 'Free', concurso: 'TJDFT', acerto: 55, status: 'Trial' },
  { id: 5, name: 'Lucia Ferreira', email: 'lucia@email.com', plan: 'Vitalício', concurso: 'CEF', acerto: 91, status: 'Ativo' },
]

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1 text-sm">Visão geral da plataforma em tempo real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuários ativos', value: '487', change: '+23 esta semana', up: true, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Receita mensal', value: 'R$ 4.200', change: '+18% vs mês anterior', up: true, icon: DollarSign, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
          { label: 'Questões respondidas', value: '48.200', change: '+5.100 esta semana', up: true, icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Conversas com IA', value: '3.847', change: '+12% vs semana', up: true, icon: Brain, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map(({ label, value, change, up, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? 'text-success-600' : 'text-danger-500'}`}>
                {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {up ? 'Alta' : 'Queda'}
              </span>
            </div>
            <div className="text-2xl font-black text-foreground mb-0.5">{value}</div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{change}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Receita */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Receita mensal (R$)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [`R$ ${v}`, 'Receita']} />
                <Area type="monotone" dataKey="receita" stroke="#16a34a" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance por matéria */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Desempenho médio por matéria</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="materia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Média']} />
                <Bar dataKey="media" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Usuários recentes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">Usuários recentes</h2>
          <Link href="/admin/usuarios" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver todos</Link>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                {['Usuário', 'Plano', 'Concurso', 'Taxa acerto', 'Status', 'Ação'].map(h => (
                  <th key={h} className="text-left py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-xs">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge text-xs ${u.plan === 'Premium' ? 'badge-blue' : u.plan === 'Vitalício' ? 'badge-yellow' : u.plan === 'Free' ? 'bg-muted text-muted-foreground' : 'badge-purple'}`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{u.concurso}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold text-xs ${u.acerto >= 75 ? 'text-success-600' : u.acerto >= 60 ? 'text-warning-500' : 'text-danger-500'}`}>{u.acerto}%</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge text-xs ${u.status === 'Ativo' ? 'badge-green' : 'badge-yellow'}`}>{u.status}</span>
                  </td>
                  <td className="py-3">
                    <button className="btn-ghost btn-sm text-xs">
                      <Eye className="w-3 h-3" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IA insights */}
      <div className="card p-5 border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-900/10">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-500" />
          <h2 className="font-bold text-foreground">Insights do Assistente IA</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: AlertTriangle, color: 'text-warning-500', text: '68 alunos têm taxa de acerto abaixo de 50% em Matemática. Considere criar um módulo de revisão intensiva.' },
            { icon: TrendingUp, color: 'text-success-600', text: 'Alunos que usam flashcards diariamente têm 34% mais taxa de acerto que os que não usam.' },
            { icon: CheckCircle2, color: 'text-brand-500', text: 'O módulo PMDF tem 92% de satisfação. Replicar a estrutura para outros concursos pode aumentar retenção.' },
            { icon: Users, color: 'text-purple-500', text: '23 alunos não acessam a plataforma há 7+ dias. Recomendo enviar e-mail de reengajamento automático.' },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
              <Icon className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
              <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
