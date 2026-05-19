'use client'

import { useEffect, useState } from 'react'
import { Users, BookOpen, DollarSign, Activity, Shield, Sparkles, FileText, Brain, TrendingUp, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { api } from '@/lib/api'

type Metrics = {
  users: { total: number; active: number; students: number; admins: number; fullAccess: number; betaTesters: number; activeStudents30d: number }
  content: { courses: number; subjects: number; questions: number; flashcards: number }
  engagement: { activeStudyPlans: number; completedSessions7d: number; questionAttempts7d: number }
  revenue: { mrrEstimated: number; totalRevenue: number; totalPayments: number; revenue30d: number }
  byPlan: Array<{ plan: string; count: number }>
  signups: Array<{ date: string; count: number }>
  byCourse: Array<{ slug: string; name: string; count: number }>
}

const PLAN_COLORS: Record<string, string> = {
  FREE: '#94a3b8',
  BASIC: '#3b82f6',
  PREMIUM: '#a855f7',
  LIFETIME: '#f59e0b',
}

function StatCard({ label, value, hint, icon: Icon, accent }: { label: string; value: string | number; hint?: string; icon: any; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${accent ?? 'text-brand-500'}`} />
      </div>
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }
function fmtInt(n: number) { return n.toLocaleString('pt-BR') }

export default function AdminDashboard() {
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Metrics>('/admin/metrics')
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.message ?? 'Erro ao carregar métricas'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto card p-6">
        <p className="text-sm text-danger-600 font-semibold mb-2">Não foi possível carregar o dashboard</p>
        <p className="text-sm text-muted-foreground">{error ?? 'Faça login como admin.'}</p>
      </div>
    )
  }

  const planData = data.byPlan.map((p) => ({ name: p.plan, value: p.count, fill: PLAN_COLORS[p.plan] ?? '#888' }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Visão geral em tempo real — dados extraídos do banco.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total de alunos" value={fmtInt(data.users.students)} hint={`${fmtInt(data.users.active)} ativos`} icon={Users} />
        <StatCard label="Ativos últimos 30d" value={fmtInt(data.users.activeStudents30d)} hint="logaram ou estudaram" icon={Activity} accent="text-green-500" />
        <StatCard label="MRR estimado" value={fmtBRL(data.revenue.mrrEstimated)} hint={`${fmtBRL(data.revenue.revenue30d)} 30d real`} icon={DollarSign} accent="text-emerald-500" />
        <StatCard label="Acesso liberado" value={fmtInt(data.users.fullAccess)} hint="hasFullAccess=true" icon={Shield} accent="text-amber-500" />
        <StatCard label="Beta testers" value={fmtInt(data.users.betaTesters)} hint="testando a plataforma" icon={Sparkles} accent="text-purple-500" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground text-sm">Cadastros nos últimos 30 dias</h2>
            <p className="text-xs text-muted-foreground">novos usuários por dia</p>
          </div>
          <TrendingUp className="w-4 h-4 text-brand-500" />
        </div>
        <div className="h-64">
          {data.signups.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">Nenhum cadastro nos últimos 30 dias</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.signups}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#signupGrad)" name="Cadastros" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-foreground text-sm mb-3">Top cursos por matrículas ativas</h2>
          <div className="h-72">
            {data.byCourse.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">Sem matrículas ativas ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCourse} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="slug" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Alunos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-foreground text-sm mb-3">Distribuição por plano</h2>
          <div className="h-72">
            {planData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Cursos ativos" value={data.content.courses} icon={BookOpen} />
        <StatCard label="Matérias" value={data.content.subjects} icon={FileText} />
        <StatCard label="Questões" value={fmtInt(data.content.questions)} hint="não anuladas" icon={Brain} />
        <StatCard label="Flashcards" value={fmtInt(data.content.flashcards)} icon={Sparkles} />
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-foreground text-sm mb-3">Engajamento (últimos 7 dias)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Sessões concluídas" value={fmtInt(data.engagement.completedSessions7d)} icon={Activity} />
          <StatCard label="Questões respondidas" value={fmtInt(data.engagement.questionAttempts7d)} icon={Brain} />
          <StatCard label="Cronogramas ativos" value={fmtInt(data.engagement.activeStudyPlans)} icon={FileText} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Dados atualizados em tempo real do PostgreSQL · MRR estimado calcula apenas planos ativos (BASIC × R$59 + PREMIUM × R$97). Receita real virá do Mercado Pago quando webhook estiver ativo.
      </p>
    </div>
  )
}
