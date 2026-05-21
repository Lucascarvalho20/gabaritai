'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Users, BookOpen, Brain, Download, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

type Data = {
  period: { from: string; to: string; days: number }
  kpis: {
    totalUsers: number
    activeUsers: number
    activeStudents: number
    totalCourses: number
    questionsBank: number
    materialsTotal: number
    materialsPublished: number
    attemptsCurrent: number
    attemptsDelta: number
    aiCallsCurrent: number
    aiCallsDelta: number
    loginsCurrent: number
    loginsDelta: number
  }
  series: { dia: string; acessos: number; questoes: number; acertos: number }[]
  byCourse: { courseId: string; name: string; alunos: number }[]
  byPlan: { plan: string; count: number }[]
}

const COLORS = ['#2563eb', '#9333ea', '#16a34a', '#f59e0b', '#e11d48', '#0891b2', '#7c3aed', '#0ea5e9']
const PLAN_COLORS: Record<string, string> = {
  PREMIUM: '#2563eb', LIFETIME: '#f59e0b', BASIC: '#9333ea', FREE: '#94a3b8',
}
const PLAN_LABELS: Record<string, string> = {
  PREMIUM: 'Premium', LIFETIME: 'Vitalício', BASIC: 'Básico', FREE: 'Grátis',
}

export default function RelatoriosPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/relatorios', { params: { days } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-sm text-muted-foreground">
        Não foi possível carregar relatórios.
      </div>
    )
  }

  const { kpis, series, byCourse, byPlan } = data

  const planData = byPlan.map((p) => ({
    name: PLAN_LABELS[p.plan] ?? p.plan,
    value: p.count,
    fill: PLAN_COLORS[p.plan] ?? '#888',
  }))

  const cursoBarData = byCourse.slice(0, 8).map((c, i) => ({
    name: c.name.length > 24 ? c.name.slice(0, 24) + '…' : c.name,
    alunos: c.alunos,
    fill: COLORS[i % COLORS.length],
  }))

  const noActivity = kpis.attemptsCurrent === 0 && kpis.loginsCurrent === 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Métricas reais da plataforma · últimos {days} dias
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="text-sm rounded-lg border border-border bg-background px-2 py-1.5">
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <button className="btn-outline btn-sm" onClick={() => window.print()}>
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {noActivity && (
        <div className="card p-4 border-l-4 border-l-yellow-500 bg-yellow-50/40 dark:bg-yellow-900/10 text-xs">
          ⚠️ Nenhuma atividade registrada nesse período. As métricas vão crescer conforme os alunos forem usando a plataforma.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Kpi label="Acessos no período" value={kpis.loginsCurrent.toLocaleString('pt-BR')} delta={kpis.loginsDelta}
          icon={Users} color="text-brand-500" bg="bg-brand-50 dark:bg-brand-900/20" />
        <Kpi label="Questões respondidas" value={kpis.attemptsCurrent.toLocaleString('pt-BR')} delta={kpis.attemptsDelta}
          icon={BookOpen} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" />
        <Kpi label="Chamadas de IA" value={kpis.aiCallsCurrent.toLocaleString('pt-BR')} delta={kpis.aiCallsDelta}
          icon={Brain} color="text-yellow-500" bg="bg-yellow-50 dark:bg-yellow-900/20" />
        <Kpi label="Usuários ativos" value={kpis.activeUsers.toLocaleString('pt-BR')} delta={null}
          icon={TrendingUp} color="text-success-600" bg="bg-success-50 dark:bg-success-600/10"
          sub={`de ${kpis.totalUsers} totais`} />
      </div>

      {/* Inventário */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SmallStat label="Cursos ativos" value={kpis.totalCourses} />
        <SmallStat label="Alunos ativos" value={kpis.activeStudents} />
        <SmallStat label="Banco de questões" value={kpis.questionsBank} />
        <SmallStat label="Materiais publicados" value={`${kpis.materialsPublished}/${kpis.materialsTotal}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-bold text-foreground mb-4">Atividade por dia</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="acessosG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="questoesG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                <Area type="monotone" dataKey="acessos" name="Acessos" stroke="#2563eb" strokeWidth={2} fill="url(#acessosG)" />
                <Area type="monotone" dataKey="questoes" name="Questões" stroke="#9333ea" strokeWidth={2} fill="url(#questoesG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Planos dos alunos</h2>
          <div className="h-52">
            {planData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem alunos ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-4">Alunos por curso (top 8)</h2>
        <div className="h-48">
          {cursoBarData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Nenhuma matrícula registrada</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cursoBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [v, 'Alunos']} />
                <Bar dataKey="alunos" radius={[0, 6, 6, 0]}>
                  {cursoBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-4">Questões respondidas por dia</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
              <Bar dataKey="questoes" name="Total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="acertos" name="Acertos" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, delta, icon: Icon, color, bg, sub }: {
  label: string; value: string; delta: number | null; icon: any; color: string; bg: string; sub?: string
}) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-xl font-black text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {delta !== null ? (
        <div className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
          {delta >= 0 ? '+' : ''}{delta}% vs período anterior
        </div>
      ) : sub ? (
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      ) : null}
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
