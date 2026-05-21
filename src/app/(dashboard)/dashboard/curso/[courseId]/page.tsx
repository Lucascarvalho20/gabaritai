'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BookOpen, Zap, Target, TrendingUp, ChevronLeft, Brain, FileText, Trophy, BarChart3, Loader2, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'

type Curso = {
  courseId: string
  slug: string
  name: string
  cargo: string | null
  orgao: string | null
  area: string | null
  progress: number
  totalAttempts: number
  totalCorrect: number
  accuracy: number
  simulados: number
  hasActiveEdital: boolean
  lastActivityAt: string | null
  topFraqueza: { name: string; pct: number } | null
}

type Materia = {
  subjectId: string
  name: string
  total: number
  correct: number
  pct: number
}

function pctColor(p: number) {
  if (p >= 75) return 'text-success-600'
  if (p >= 60) return 'text-warning-500'
  return 'text-danger-500'
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-success-500' : pct >= 60 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function CursoDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [loading, setLoading] = useState(true)
  const [curso, setCurso] = useState<Curso | null>(null)
  const [materias, setMaterias] = useState<Materia[]>([])

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [cursosRes, progRes] = await Promise.all([
          api.get('/me/cursos').then((r) => r.data).catch(() => ({ cursos: [] })),
          api.get('/me/progresso').then((r) => r.data).catch(() => ({ byMateria: [] })),
        ])
        if (!alive) return
        const c: Curso | undefined = (cursosRes.cursos ?? []).find((x: Curso) => x.courseId === courseId)
        setCurso(c ?? null)
        setMaterias(progRes.byMateria ?? [])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [courseId])

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  if (!curso) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3 animate-fade-in">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-xl font-black">Curso não encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Você não está matriculado nesse curso, ou ele ainda não tem edital ativo.
        </p>
        <Link href="/dashboard/meus-cursos" className="btn-primary btn-md inline-flex">Ver meus cursos</Link>
      </div>
    )
  }

  const noActivity = curso.totalAttempts === 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{curso.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {[curso.orgao, curso.area].filter(Boolean).join(' · ')}
          </p>
        </div>
        {!noActivity && <div className={`text-3xl font-black ${pctColor(curso.accuracy)}`}>{curso.accuracy}%</div>}
      </div>

      {!curso.hasActiveEdital && (
        <div className="card p-4 border-l-4 border-l-yellow-500 bg-yellow-50/40 dark:bg-yellow-900/10">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-yellow-700 dark:text-yellow-300">Edital oficial ainda não cadastrado.</strong>
              <p className="text-muted-foreground mt-1">
                Algumas matérias podem aparecer como "em curadoria". Assim que o admin subir o edital oficial, todo o conteúdo é liberado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Progresso geral" value={`${curso.progress}%`} icon={TrendingUp} color="text-brand-500"
          bg="bg-brand-50 dark:bg-brand-900/20" empty={noActivity} emptyHint="Sem atividade ainda" />
        <KpiCard label="Questões respondidas" value={curso.totalAttempts.toLocaleString('pt-BR')} icon={BookOpen}
          color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" empty={noActivity} emptyHint="Comece respondendo" />
        <KpiCard label="Simulados feitos" value={`${curso.simulados}`} icon={Trophy}
          color="text-amber-500" bg="bg-amber-50 dark:bg-amber-900/20" empty={curso.simulados === 0} emptyHint="Faça seu 1º simulado" />
        <KpiCard label="Acerto neste curso" value={noActivity ? '—' : `${curso.accuracy}%`} icon={Target}
          color={pctColor(curso.accuracy)} bg="bg-success-50 dark:bg-success-600/10" empty={noActivity} emptyHint="Sem dado ainda" />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ActionCard href={`/dashboard/questoes?courseId=${curso.courseId}`} icon={BookOpen} label="Questões" />
        <ActionCard href={`/dashboard/flashcards`} icon={Zap} label="Flashcards" />
        <ActionCard href={`/dashboard/simulados`} icon={Target} label="Simulados" />
        <ActionCard href={`/dashboard/edital-verticalizado/${curso.slug}`} icon={FileText} label="Edital" />
      </div>

      {/* Matérias com performance real */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" /> Desempenho por matéria
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Baseado nas suas respostas reais (questões dessa matéria, em qualquer curso)
            </p>
          </div>
        </div>

        {materias.length === 0 ? (
          <div className="card p-8 text-center border-dashed">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Você ainda não respondeu nenhuma questão. Bora começar?
            </p>
            <Link href={`/dashboard/questoes?courseId=${curso.courseId}`} className="btn-primary btn-md inline-flex">
              Pegar primeiras questões
            </Link>
          </div>
        ) : (
          <div className="card p-5 space-y-4">
            {materias.map((m) => (
              <div key={m.subjectId}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium truncate pr-2">{m.name}</span>
                  <span className={`font-bold ${pctColor(m.pct)}`}>
                    {m.pct}% <span className="text-muted-foreground font-normal">({m.correct}/{m.total})</span>
                  </span>
                </div>
                <Bar pct={m.pct} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ponto fraco */}
      {curso.topFraqueza && (
        <div className="card p-5 border-warning-200 dark:border-warning-800/40 bg-warning-50/40 dark:bg-warning-900/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">Sugestão do Mentor IA</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sua matéria mais fraca neste curso é <strong>{curso.topFraqueza.name}</strong> com {curso.topFraqueza.pct}% de acerto.
                Considere reforçar com questões focadas.
              </p>
              <Link href={`/dashboard/questoes?courseId=${curso.courseId}`} className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                Praticar agora →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label, value, icon: Icon, color, bg, empty, emptyHint,
}: {
  label: string; value: string; icon: any; color: string; bg: string
  empty?: boolean; emptyHint?: string
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
      {empty && <div className="text-[10px] text-muted-foreground/70 mt-1">{emptyHint}</div>}
    </div>
  )
}

function ActionCard({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}
      className="card p-4 flex flex-col items-center gap-2 text-center hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition">
      <Icon className="w-5 h-5 text-brand-500" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}
