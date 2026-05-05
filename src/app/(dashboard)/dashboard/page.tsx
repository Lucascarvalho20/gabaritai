'use client'

import { useAuthStore } from '@/store/auth'
import { BarChart3, Brain, Flame, Target, Clock, BookOpen, Zap, ChevronRight, TrendingUp, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { RadialBarChart, RadialBar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const mockPerformance = [
  { dia: 'Seg', acertos: 72 }, { dia: 'Ter', acertos: 68 }, { dia: 'Qua', acertos: 75 },
  { dia: 'Qui', acertos: 80 }, { dia: 'Sex', acertos: 77 }, { dia: 'Sáb', acertos: 85 }, { dia: 'Dom', acertos: 82 },
]

const mockMaterias = [
  { name: 'Dir. Constitucional', pct: 82, color: 'bg-brand-500' },
  { name: 'Dir. Penal', pct: 65, color: 'bg-purple-500' },
  { name: 'Matemática', pct: 48, color: 'bg-warning-500' },
  { name: 'Port. Redação', pct: 71, color: 'bg-success-500' },
  { name: 'Conhec. Policiais', pct: 38, color: 'bg-danger-500' },
]

const mockTarefasHoje = [
  { id: 1, tipo: 'Teoria', titulo: 'Dir. Constitucional — Art. 5º, Inc. I-X', tempo: '45 min', done: true, href: '/dashboard/cronograma' },
  { id: 2, tipo: 'Questões', titulo: '30 questões de Direito Penal', tempo: '40 min', done: false, href: '/dashboard/questoes' },
  { id: 3, tipo: 'Flashcards', titulo: 'Revisão: 25 flashcards de hoje', tempo: '15 min', done: false, href: '/dashboard/flashcards' },
  { id: 4, tipo: 'Simulado', titulo: 'Simulado semanal PMDF — Módulo 3', tempo: '90 min', done: false, href: '/dashboard/simulados' },
]

const TIPO_COLOR: Record<string, string> = {
  Teoria: 'badge-blue',
  Questões: 'badge-purple',
  Flashcards: 'badge-yellow',
  Simulado: 'badge-red',
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const tarefasConcluidas = mockTarefasHoje.filter(t => t.done).length

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            {saudacao}, {user?.name?.split(' ')[0] ?? 'Concurseiro'}! 🎯
          </h1>
          <p className="text-muted-foreground mt-1">
            Você tem <span className="font-semibold text-brand-600 dark:text-brand-400">{mockTarefasHoje.length - tarefasConcluidas} tarefas</span> pendentes para hoje
          </p>
        </div>
        <Link href="/dashboard/mentor" className="btn-primary btn-md self-start sm:self-auto">
          <Brain className="w-4 h-4" />
          Falar com Mentor IA
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sequência de estudo', value: '12 dias', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', trend: '+2 esta semana' },
          { label: 'Taxa de acerto', value: '78%', icon: TrendingUp, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10', trend: '↑5% vs semana passada' },
          { label: 'Questões hoje', value: '47 / 80', icon: BookOpen, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', trend: '59% da meta diária' },
          { label: 'Tempo estudado', value: '3h 20min', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', trend: 'Meta: 4h/dia' },
        ].map(({ label, value, icon: Icon, color, bg, trend }) => (
          <div key={label} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground mb-0.5">{value}</div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{trend}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tarefas de hoje */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground">Tarefas de hoje</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{tarefasConcluidas}/{mockTarefasHoje.length} concluídas</p>
            </div>
            <Link href="/dashboard/cronograma" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
              Ver cronograma <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockTarefasHoje.map(t => (
              <Link key={t.id} href={t.href}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${t.done ? 'border-success-200 bg-success-50/50 dark:border-success-800/30 dark:bg-success-900/10' : 'border-border hover:border-brand-200 dark:hover:border-brand-700'}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.done ? 'border-success-500 bg-success-500' : 'border-muted-foreground'}`}>
                  {t.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`${TIPO_COLOR[t.tipo]} text-xs`}>{t.tipo}</span>
                  </div>
                  <div className={`text-sm font-medium truncate ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.titulo}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{t.tempo}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Progresso geral + pontos fracos */}
        <div className="space-y-4">
          {/* Edital concluído */}
          <div className="card p-5">
            <h3 className="font-bold text-foreground mb-1 text-sm">Edital concluído</h3>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black gradient-text dark:gradient-text-dark">43%</div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[43%] bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">18/42 tópicos concluídos</div>
              </div>
            </div>
          </div>

          {/* Pontos fracos */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm">Desempenho por matéria</h3>
              <Link href="/dashboard/progresso" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-3">
              {mockMaterias.map(m => (
                <div key={m.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-medium truncate pr-2">{m.name}</span>
                    <span className={`font-bold ${m.pct < 60 ? 'text-danger-500' : m.pct < 75 ? 'text-warning-500' : 'text-success-600'}`}>{m.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta de pontos fracos */}
          <div className="card p-4 border-warning-200 dark:border-warning-800/40 bg-warning-50/50 dark:bg-warning-900/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-warning-700 dark:text-warning-400">Atenção do Mentor IA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você está errando <strong>62%</strong> em Conhecimentos Policiais. Sugiro pausar e revisar hoje.
                </p>
                <Link href="/dashboard/mentor" className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                  Ver plano de revisão <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de performance semanal */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">Performance semanal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Taxa de acerto nos últimos 7 dias</p>
          </div>
          <div className="badge-green">↑ 14% vs semana anterior</div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockPerformance}>
              <defs>
                <linearGradient id="acertosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 13 }}
                formatter={(v: number) => [`${v}%`, 'Acertos']}
              />
              <Area type="monotone" dataKey="acertos" stroke="#2563eb" strokeWidth={2.5} fill="url(#acertosGrad)" dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
