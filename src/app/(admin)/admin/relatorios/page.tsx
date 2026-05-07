'use client'

import { DEMO_USERS, CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Users, BookOpen, Brain, Download } from 'lucide-react'

const acessosSemana = [
  { dia: 'Seg', acessos: 12, questoes: 340, ia: 28 },
  { dia: 'Ter', acessos: 18, questoes: 510, ia: 41 },
  { dia: 'Qua', acessos: 15, questoes: 420, ia: 35 },
  { dia: 'Qui', acessos: 22, questoes: 680, ia: 52 },
  { dia: 'Sex', acessos: 19, questoes: 590, ia: 47 },
  { dia: 'Sáb', acessos: 14, questoes: 380, ia: 31 },
  { dia: 'Dom', acessos: 8,  questoes: 210, ia: 19 },
]

const COLORS = ['#2563eb', '#9333ea', '#16a34a', '#f59e0b', '#e11d48', '#0891b2', '#7c3aed']

function countByCourse() {
  return CURSOS_DISPONIVEIS.slice(0, 6).map((c, i) => ({
    name: c.label.split(' — ')[0],
    alunos: DEMO_USERS.filter(u =>
      u.role === 'STUDENT' && (u.courses === 'all' || (u.courses as string[]).includes(c.id))
    ).length,
    fill: COLORS[i % COLORS.length],
  }))
}

function planDistribution() {
  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  return [
    { name: 'Premium', value: students.filter(u => u.plan === 'PREMIUM').length, fill: '#2563eb' },
    { name: 'Vitalício', value: students.filter(u => u.plan === 'LIFETIME').length, fill: '#f59e0b' },
    { name: 'Básico', value: students.filter(u => u.plan === 'BASIC').length, fill: '#9333ea' },
    { name: 'Grátis', value: students.filter(u => u.plan === 'FREE').length, fill: '#94a3b8' },
  ].filter(d => d.value > 0)
}

export default function RelatoriosPage() {
  const cursoData = countByCourse()
  const planData = planDistribution()

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão analítica da plataforma</p>
        </div>
        <button className="btn-outline btn-sm" onClick={() => window.print()}>
          <Download className="w-3.5 h-3.5" /> Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Acessos esta semana', value: '108', delta: '+23%', icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Questões respondidas', value: '3.130', delta: '+18%', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Msgs ao Mentor IA', value: '253', delta: '+41%', icon: Brain, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Taxa de retenção', value: '87%', delta: '+5%', icon: TrendingUp, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
        ].map(({ label, value, delta, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-xl font-black text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xs text-success-600 mt-1 font-medium">{delta} vs semana ant.</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Atividade semanal */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-bold text-foreground mb-4">Atividade da semana</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={acessosSemana}>
                <defs>
                  <linearGradient id="acessosG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="iaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                <Area type="monotone" dataKey="acessos" name="Acessos" stroke="#2563eb" strokeWidth={2} fill="url(#acessosG)" />
                <Area type="monotone" dataKey="ia" name="Msgs IA" stroke="#9333ea" strokeWidth={2} fill="url(#iaG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de planos */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Planos dos alunos</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alunos por curso */}
      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-4">Alunos por curso (top 6)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cursoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [v, 'Alunos']} />
              <Bar dataKey="alunos" radius={[0, 6, 6, 0]}>
                {cursoData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Questões por dia */}
      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-4">Questões respondidas por dia</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={acessosSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
              <Bar dataKey="questoes" name="Questões" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
