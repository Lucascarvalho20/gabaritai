'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import {
  Flame, Clock, BookOpen, TrendingUp, AlertCircle, ChevronRight, Sparkles, Loader2, BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { GamifiedHeader } from '@/components/gamified-header'
import { TrialBanner } from '@/components/TrialBanner'

// ─── tipos vindos da API ────────────────────────────────────────────────────
type MeStats = {
  level: number
  xp: number
  streak: number
  totalAttempts: number
  correctAttempts: number
  accuracy: number     // % acerto geral
  totalHoras: number   // horas estudadas
  diasEstudando: number
  simuladosFeitos: number
}

type MeCurso = {
  courseId: string
  slug: string
  name: string
  cargo: string | null
  orgao: string | null
  area: string | null
  progress: number              // % consolidado
  totalAttempts: number
  totalCorrect: number
  accuracy: number              // % acerto neste curso
  simulados: number
  hasActiveEdital: boolean      // se já tem edital cadastrado pelo admin
  lastActivityAt: string | null
  topFraqueza: { name: string; pct: number } | null
}

type MeProgresso = {
  byMateria: Array<{ subjectId: string; name: string; total: number; correct: number; pct: number }>
  weekly: Array<{ dia: string; acertos: number; total: number }>
}

function pctColor(p: number) {
  if (p >= 75) return 'text-success-600'
  if (p >= 60) return 'text-warning-500'
  return 'text-danger-500'
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-success-500' : pct >= 60 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MeStats | null>(null)
  const [cursos, setCursos] = useState<MeCurso[]>([])
  const [progresso, setProgresso] = useState<MeProgresso | null>(null)

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    if (!user || user.role === 'ADMIN') {
      setLoading(false)
      return
    }
    let alive = true
    async function load() {
      try {
        const [s, c, p, sched] = await Promise.all([
          api.get('/me/stats').then((r) => r.data).catch(() => null),
          api.get('/me/cursos').then((r) => r.data).catch(() => ({ cursos: [] })),
          api.get('/me/progresso').then((r) => r.data).catch(() => null),
          api.get('/schedule').then((r) => r.data).catch(() => ({ plan: null })),
        ])
        if (!alive) return
        setStats(s)
        setCursos(c.cursos ?? [])
        setProgresso(p)
        // Sem plano → redireciona pro wizard (ADMIN já saiu antes)
        if (!sched?.plan) {
          router.push('/dashboard/comecar')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  // Admin tem visão própria — esse dashboard é só pra ALUNO
  if (user?.role === 'ADMIN') {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <h1 className="text-2xl font-black">Painel do aluno</h1>
        <p className="text-muted-foreground text-sm">
          Você está logado como <strong>admin</strong>. Esse dashboard é a visão do aluno.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/admin" className="btn-primary btn-md">Ir pro painel admin</Link>
        </div>
      </div>
    )
  }

  // Aluno sem cursos ainda
  if (cursos.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-8 sm:py-16 space-y-6 animate-fade-in">
        <TrialBanner />
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-black">Você ainda não tem nenhum curso</h1>
          <p className="text-muted-foreground text-sm">
            Pra começar a estudar, escolha um concurso e monte seu plano.
          </p>
          <Link href="/dashboard/comecar" className="btn-primary btn-md inline-flex">
            Montar meu plano agora
          </Link>
        </div>
      </div>
    )
  }

  const noStudyYet = (stats?.totalAttempts ?? 0) === 0 && (stats?.totalHoras ?? 0) === 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <TrialBanner />
      <GamifiedHeader />

      {/* Saudação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            {saudacao}, {user?.name?.split(' ')[0] ?? 'concurseiro'}! 🎯
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {noStudyYet
              ? <>Você ainda não estudou nada. Bora começar pelo seu cronograma de hoje.</>
              : <><strong>{cursos.length} curso{cursos.length > 1 ? 's' : ''}</strong> em estudo · {stats?.diasEstudando ?? 0} dias ativos</>
            }
          </p>
        </div>
        <Link href="/dashboard/cronograma" className="btn-primary btn-md self-start sm:self-auto">
          <BookOpen className="w-4 h-4" /> Ver cronograma
        </Link>
      </div>

      {/* KPIs reais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Sequência de estudo" value={`${stats?.streak ?? 0} dia${(stats?.streak ?? 0) === 1 ? '' : 's'}`}
          icon={Flame} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-900/20"
          empty={!stats || stats.streak === 0} emptyHint="Estude hoje pra começar uma sequência"
        />
        <KpiCard
          label="Taxa de acerto" value={`${stats?.accuracy ?? 0}%`}
          icon={TrendingUp} color={pctColor(stats?.accuracy ?? 0)} bg="bg-success-50 dark:bg-success-600/10"
          empty={!stats || stats.totalAttempts === 0} emptyHint={`${stats?.totalAttempts ?? 0} questões respondidas`}
          subtext={stats && stats.totalAttempts > 0 ? `${stats.correctAttempts}/${stats.totalAttempts} acertos` : undefined}
        />
        <KpiCard
          label="Questões respondidas" value={(stats?.totalAttempts ?? 0).toLocaleString('pt-BR')}
          icon={BookOpen} color="text-brand-500" bg="bg-brand-50 dark:bg-brand-900/20"
          empty={!stats || stats.totalAttempts === 0} emptyHint="Responda sua primeira questão"
        />
        <KpiCard
          label="Horas estudadas" value={`${stats?.totalHoras ?? 0}h`}
          icon={Clock} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20"
          empty={!stats || stats.totalHoras === 0} emptyHint={`Meta: ${parseInt(user?.horasDia ?? '4') * 7}h/semana`}
        />
      </div>

      {/* Cards por curso */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" /> Seus cursos
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Progresso real baseado nas suas atividades</p>
          </div>
          <Link href="/dashboard/progresso" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            Análise completa <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {cursos.map((c) => <CourseCard key={c.courseId} c={c} />)}
        </div>
      </div>

      {/* Performance por matéria (queries reais) */}
      {progresso && progresso.byMateria.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground">Desempenho por matéria</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Baseado em todas as questões que você respondeu</p>
            </div>
            <Link href="/dashboard/progresso" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver tudo</Link>
          </div>
          <div className="space-y-3">
            {progresso.byMateria.slice(0, 6).map((m) => (
              <div key={m.subjectId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground font-medium truncate pr-2">{m.name}</span>
                  <span className={`font-bold ${pctColor(m.pct)}`}>{m.pct}% <span className="text-muted-foreground font-normal">({m.correct}/{m.total})</span></span>
                </div>
                <Bar pct={m.pct} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state quando nunca estudou */}
      {noStudyYet && (
        <div className="card p-8 text-center space-y-3 border-dashed">
          <Sparkles className="w-10 h-10 text-brand-500 mx-auto" />
          <h3 className="font-bold">Tudo limpo por aqui — bora começar!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ainda não temos dados seus pra mostrar. Conforme você for respondendo questões, fazendo simulados e revisando flashcards,
            os números reais vão aparecendo nessa tela. Sem mock, sem invenção.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link href="/dashboard/cronograma" className="btn-primary btn-md">Ver minha próxima sessão</Link>
            <Link href="/dashboard/questoes" className="btn-outline btn-md">Pegar questões</Link>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label, value, icon: Icon, color, bg, empty, emptyHint, subtext,
}: {
  label: string; value: string; icon: any; color: string; bg: string
  empty?: boolean; emptyHint?: string; subtext?: string
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className={`text-xl sm:text-2xl font-black mb-0.5 ${empty ? 'text-muted-foreground/60' : 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-[10px] text-muted-foreground/70 mt-1">{empty ? (emptyHint ?? 'Sem dados ainda') : (subtext ?? ' ')}</div>
    </div>
  )
}

function CourseCard({ c }: { c: MeCurso }) {
  const noActivity = c.totalAttempts === 0
  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground leading-tight truncate">{c.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {c.totalAttempts === 0 ? 'Nenhuma questão respondida ainda' : `${c.totalAttempts} questões · ${c.simulados} simulado${c.simulados === 1 ? '' : 's'}`}
          </div>
        </div>
        {!noActivity && <div className={`text-xl font-black ${pctColor(c.accuracy)}`}>{c.accuracy}%</div>}
      </div>

      {!c.hasActiveEdital && (
        <div className="rounded-lg p-2.5 text-xs border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30 text-yellow-700 dark:text-yellow-200 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Edital oficial ainda não cadastrado. Algumas matérias podem aparecer como "em curadoria".</span>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-bold text-foreground">{c.progress}%</span>
        </div>
        <Bar pct={c.progress} />
      </div>

      {!noActivity && c.topFraqueza && (
        <div className="rounded-lg p-2.5 text-xs border bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800/30">
          <span className="text-warning-700 dark:text-warning-400 font-semibold">⚠️ Ponto fraco: </span>
          <span className="text-muted-foreground">{c.topFraqueza.name} ({c.topFraqueza.pct}%)</span>
        </div>
      )}

      <Link href={`/dashboard/curso/${c.courseId}`} className="btn-primary btn-sm text-center text-xs mt-auto">
        Ver curso completo →
      </Link>
    </div>
  )
}
