'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import { api } from '@/lib/api'
import {
  Flame, Clock, BookOpen, TrendingUp, CheckCircle2,
  AlertCircle, ChevronRight, Brain, BarChart3, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from 'recharts'
import { GamifiedHeader } from '@/components/gamified-header'

// Gera dados mock determinísticos por curso
function mockCurso(courseId: string) {
  const h = courseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const acerto = 55 + (h % 35)
  const questoes = 120 + (h % 480)
  const edital = 20 + (h % 68)
  const horas = 8 + (h % 44)
  const semana = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((dia, i) => ({
    dia,
    acertos: 48 + ((h + i * 17) % 42),
  }))
  const materias = [
    { name: 'Direito Constitucional', pct: 55 + ((h * 3) % 38) },
    { name: 'Português',              pct: 48 + ((h * 7) % 45) },
    { name: 'Raciocínio Lógico',      pct: 42 + ((h * 11) % 50) },
    { name: 'Conhec. Específicos',    pct: 60 + ((h * 5) % 35) },
  ]
  const alertaMateria = materias.reduce((a, b) => a.pct < b.pct ? a : b)
  return { acerto, questoes, edital, horas, semana, materias, alertaMateria }
}

const mockTarefasHoje = [
  { id: 1, tipo: 'Teoria',    titulo: 'Dir. Constitucional — Art. 5º, Inc. I-X', tempo: '45 min', done: true,  href: '/dashboard/cronograma' },
  { id: 2, tipo: 'Questões',  titulo: '30 questões de Direito Penal',             tempo: '40 min', done: false, href: '/dashboard/questoes' },
  { id: 3, tipo: 'Flashcards',titulo: 'Revisão: 25 flashcards de hoje',           tempo: '15 min', done: false, href: '/dashboard/flashcards' },
  { id: 4, tipo: 'Simulado',  titulo: 'Simulado semanal — Módulo 3',             tempo: '90 min', done: false, href: '/dashboard/simulados' },
]

const TIPO_COLOR: Record<string, string> = {
  Teoria: 'badge-blue', Questões: 'badge-purple', Flashcards: 'badge-yellow', Simulado: 'badge-red',
}

function AccuracyBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-success-500' : pct >= 60 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CourseCard({ courseId, label, icon, stats }: { courseId: string; label: string; icon: string; stats: ReturnType<typeof mockCurso> }) {
  const color = stats.acerto >= 75 ? 'text-success-600' : stats.acerto >= 60 ? 'text-warning-500' : 'text-danger-500'
  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="text-sm font-bold text-foreground leading-tight">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stats.questoes} questões respondidas</div>
          </div>
        </div>
        <div className={`text-xl font-black ${color}`}>{stats.acerto}%</div>
      </div>

      {/* Mini sparkline */}
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.semana} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${courseId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Acerto']} />
            <Area type="monotone" dataKey="acertos" stroke="#2563eb" strokeWidth={2} fill={`url(#g-${courseId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Edital progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Edital concluído</span>
          <span className="font-bold text-foreground">{stats.edital}%</span>
        </div>
        <AccuracyBar pct={stats.edital} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="font-bold text-foreground">{stats.horas}h</div>
          <div className="text-muted-foreground">estudadas</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className={`font-bold ${color}`}>{stats.acerto}%</div>
          <div className="text-muted-foreground">acerto geral</div>
        </div>
      </div>

      {/* Status IA — sempre mostra algo para manter altura uniforme */}
      <div className={`rounded-lg p-2.5 text-xs border ${
        stats.alertaMateria.pct < 65
          ? 'bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800/30'
          : 'bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800/30'
      }`}>
        {stats.alertaMateria.pct < 65 ? (
          <><span className="text-warning-700 dark:text-warning-400 font-semibold">⚠️ Ponto fraco: </span>
          <span className="text-muted-foreground">{stats.alertaMateria.name} ({stats.alertaMateria.pct}%)</span></>
        ) : (
          <><span className="text-success-700 dark:text-success-400 font-semibold">✅ No caminho certo! </span>
          <span className="text-muted-foreground">Acerto médio acima de 65% em todas matérias.</span></>
        )}
      </div>

      <Link href={`/dashboard/curso/${courseId}`} className="btn-primary btn-sm text-center text-xs mt-auto">
        Ver curso completo →
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const tarefasConcluidas = mockTarefasHoje.filter(t => t.done).length

  // Redirect novato sem plano pro wizard
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return
    api.get('/schedule').then(({ data }) => {
      if (!data.plan) router.push('/dashboard/comecar')
    }).catch(() => {})
  }, [user])

  // Resolve cursos do usuário
  const userCourseIds: string[] = user?.courses === 'all'
    ? CURSOS_DISPONIVEIS.map(c => c.id)
    : Array.isArray(user?.courses) ? (user.courses as string[]) : []

  const userCursos = CURSOS_DISPONIVEIS.filter(c => userCourseIds.includes(c.id))
  const hasMultiple = userCursos.length > 1

  // Gera stats globais agregadas (média dos cursos)
  const allStats = userCursos.map(c => mockCurso(c.id))
  const globalAcerto = allStats.length > 0
    ? Math.round(allStats.reduce((a, s) => a + s.acerto, 0) / allStats.length) : 78
  const totalQuestoes = allStats.reduce((a, s) => a + s.questoes, 0)
  const totalHoras = allStats.reduce((a, s) => a + s.horas, 0)
  const primaryCurso = userCursos[0]
  const primaryStats = primaryCurso ? mockCurso(primaryCurso.id) : mockCurso('default')

  // Gráfico de performance semanal (média de todos os cursos por dia)
  const weekChart = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((dia, i) => ({
    dia,
    acertos: Math.round(allStats.length > 0
      ? allStats.reduce((a, s) => a + s.semana[i].acertos, 0) / allStats.length
      : 72 + i * 2)
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <GamifiedHeader />

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            {saudacao}, {user?.name?.split(' ')[0] ?? 'Concurseiro'}! 🎯
          </h1>
          <p className="text-muted-foreground mt-1">
            {hasMultiple
              ? <><span className="font-semibold text-brand-600 dark:text-brand-400">{userCursos.length} cursos</span> em estudo — acompanhe cada um abaixo</>
              : <>Você tem <span className="font-semibold text-brand-600 dark:text-brand-400">{mockTarefasHoje.length - tarefasConcluidas} tarefas</span> pendentes para hoje</>
            }
          </p>
        </div>
        <Link href="/dashboard/mentor" className="btn-primary btn-md self-start sm:self-auto">
          <Brain className="w-4 h-4" />
          Falar com Mentor IA
        </Link>
      </div>

      {/* Stats cards globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sequência de estudo',  value: '14 dias',                          icon: Flame,     color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20',       trend: '+2 esta semana' },
          { label: 'Taxa de acerto média', value: `${globalAcerto}%`,                  icon: TrendingUp,color: 'text-success-600',bg: 'bg-success-50 dark:bg-success-600/10',    trend: '↑5% vs semana passada' },
          { label: 'Total de questões',    value: totalQuestoes.toLocaleString('pt-BR'),icon: BookOpen,  color: 'text-brand-500',  bg: 'bg-brand-50 dark:bg-brand-900/20',        trend: `${userCursos.length} curso${userCursos.length > 1 ? 's' : ''}` },
          { label: 'Horas de estudo',      value: `${totalHoras}h`,                    icon: Clock,     color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',      trend: `Meta: ${parseInt(user?.horasDia ?? '4') * 7}h/semana` },
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

      {/* ── MULTI-CURSO: grade de cards por curso ── */}
      {hasMultiple && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-500" />
                Progresso por Curso
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acompanhe o avanço individual de cada concurso em estudo
              </p>
            </div>
            <Link href="/dashboard/progresso" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              Análise completa <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {userCursos.map(curso => (
              <CourseCard
                key={curso.id}
                courseId={curso.id}
                label={curso.label}
                icon={curso.icon}
                stats={mockCurso(curso.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── SINGLE-CURSO: layout original ── */}
      {!hasMultiple && (
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
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${t.done ? 'border-success-500 bg-success-500' : 'border-muted-foreground'}`}>
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

          {/* Progresso + pontos fracos */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-foreground mb-1 text-sm">Edital concluído</h3>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black gradient-text dark:gradient-text-dark">{primaryStats.edital}%</div>
                <div className="flex-1">
                  <AccuracyBar pct={primaryStats.edital} />
                  <div className="text-xs text-muted-foreground mt-1">{Math.round(primaryStats.edital * 0.42)}/42 tópicos concluídos</div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground text-sm">Desempenho por matéria</h3>
                <Link href="/dashboard/progresso" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver tudo</Link>
              </div>
              <div className="space-y-3">
                {primaryStats.materias.map(m => (
                  <div key={m.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-medium truncate pr-2">{m.name}</span>
                      <span className={`font-bold ${m.pct < 60 ? 'text-danger-500' : m.pct < 75 ? 'text-warning-500' : 'text-success-600'}`}>{m.pct}%</span>
                    </div>
                    <AccuracyBar pct={m.pct} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 border-warning-200 dark:border-warning-800/40 bg-warning-50/50 dark:bg-warning-900/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-warning-700 dark:text-warning-400">Atenção do Mentor IA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você está em <strong>{primaryStats.alertaMateria.pct}%</strong> em {primaryStats.alertaMateria.name}. Sugiro revisar hoje.
                  </p>
                  <Link href="/dashboard/mentor" className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                    Ver plano de revisão <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de performance semanal */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">Performance semanal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasMultiple ? 'Taxa de acerto média entre todos os cursos' : 'Taxa de acerto nos últimos 7 dias'}
            </p>
          </div>
          <div className="badge-green">↑ 14% vs semana anterior</div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekChart}>
              <defs>
                <linearGradient id="acertosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 13 }} formatter={(v: number) => [`${v}%`, 'Acertos']} />
              <Area type="monotone" dataKey="acertos" stroke="#2563eb" strokeWidth={2.5} fill="url(#acertosGrad)" dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IA insights por curso (multi-curso) */}
      {hasMultiple && (
        <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/30 dark:bg-brand-900/10">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Análise IA dos seus Cursos
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {userCursos.slice(0, 6).map(curso => {
              const s = mockCurso(curso.id)
              const status = s.acerto >= 75 ? '✅ Ótimo ritmo' : s.acerto >= 60 ? '📈 Progredindo' : '⚠️ Precisa de atenção'
              const insight = s.acerto >= 75
                ? `Excelente desempenho! Continue focando nos pontos mais difíceis.`
                : s.acerto >= 60
                ? `Bom progresso. Reforce ${s.alertaMateria.name} para subir mais.`
                : `Taxa abaixo do ideal. Priorize revisão de ${s.alertaMateria.name} (${s.alertaMateria.pct}%).`
              return (
                <div key={curso.id} className="flex gap-3 p-3 rounded-xl bg-background border border-border">
                  <span className="text-xl shrink-0">{curso.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{curso.label}</div>
                    <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">{status}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {userCursos.length > 6 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              + {userCursos.length - 6} outros cursos — veja todos em{' '}
              <Link href="/dashboard/progresso" className="text-brand-600 dark:text-brand-400 hover:underline">Meu Progresso</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
