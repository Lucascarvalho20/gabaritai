'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, Loader2, Zap, CheckCircle2, Clock, FileText, ArrowRight, Lock, AlertCircle, Printer, Calendar, Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string }

type Simulado = {
  day: 'TUE' | 'THU' | 'SUN'
  label: string
  scheduledDate: string
  windowFrom: string
  windowUntil: string
  type: 'REAL' | 'MINI'
  mockExam: {
    id: string
    title: string
    totalQuestoes: number
    durationMin: number
    hasRedacao: boolean
    examFormat: string | null
    bancaSlug: string | null
  } | null
  result: {
    id: string
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'ABANDONED'
    score: number
    acertos: number
    erros: number
    brancos: number
    finishedAt: string | null
  } | null
  status: 'NOT_GENERATED' | 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED'
}

export default function SimuladosPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [activeCourse, setActiveCourse] = useState<string>('')
  const [weekly, setWeekly] = useState<Simulado[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/courses').then(({ data }) => {
      const cs = data.courses ?? []
      setCourses(cs)
      if (cs[0]) {
        setActiveCourse(cs[0].slug)
      } else {
        // Aluno sem nenhum curso ativo → libera a tela do loading
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeCourse) return
    setLoading(true)
    Promise.all([
      api.get(`/simulados/weekly?courseSlug=${activeCourse}`),
      api.get(`/simulados?courseSlug=${activeCourse}`),
    ])
      .then(([{ data: w }, { data: h }]) => {
        setWeekly(w.simulados ?? [])
        setHistory((h.exams ?? []).filter((e: any) => e.results?.length > 0))
      })
      .catch(() => toast.error('Erro ao carregar simulados'))
      .finally(() => setLoading(false))
  }, [activeCourse])

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in px-1 sm:px-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">Simulados</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Mini-simulados terça e quinta · Simulado real domingo · Cronômetro real do edital
          </p>
        </div>
      </div>

      {courses.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {courses.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCourse(c.slug)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border',
                activeCourse === c.slug
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-border bg-card hover:bg-muted',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : courses.length === 0 ? (
        <div className="card p-8 text-center text-sm space-y-3">
          <Target className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">Você ainda não tem nenhum curso ativo. Sem curso, não tem simulado pra fazer.</p>
          <Link href="/dashboard/meus-cursos" className="inline-flex items-center gap-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-xs font-bold">
            Escolher um curso <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <>
          <section>
            <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-500" /> Esta semana
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {weekly.map((s) => <WeeklyCard key={s.day} s={s} />)}
            </div>
          </section>

          {history.length > 0 && (
            <section>
              <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" /> Histórico
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.map((e) => {
                  const r = e.results[0]
                  return (
                    <div key={e.id} className="card p-3 sm:p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{e.title}</h3>
                        <span className={cn('badge text-[10px] shrink-0', e.type === 'REAL' ? 'badge-red' : 'badge-blue')}>{e.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{e.totalQuestoes}q</span>
                        {r.score != null && (
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            Nota {r.score}/10
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <Link
                          href={`/dashboard/simulados/${e.id}/resultado/${r.id}`}
                          className="rounded-lg bg-muted hover:bg-muted/70 py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                        >
                          Ver resultado
                        </Link>
                        <Link
                          href={`/dashboard/simulado/${e.id}/imprimir`}
                          target="_blank"
                          className="rounded-lg border border-border hover:bg-muted py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> PDF
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function WeeklyCard({ s }: { s: Simulado }) {
  const dateStr = new Date(s.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const isReal = s.type === 'REAL'

  return (
    <div className={cn(
      'card p-4 flex flex-col gap-3 border-2 transition',
      isReal && 'bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-900/10 dark:to-orange-900/5 border-red-200/60 dark:border-red-900/30',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">
            {s.label} · {dateStr}
          </div>
          <div className={cn('text-lg font-black mt-0.5', isReal ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')}>
            {isReal ? 'Simulado Real' : 'Mini'}
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {s.mockExam && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{s.mockExam.totalQuestoes}q</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{s.mockExam.durationMin}min</span>
          {s.mockExam.bancaSlug && <span className="font-mono uppercase">{s.mockExam.bancaSlug}</span>}
        </div>
      )}

      {s.result?.score != null && (s.result.status === 'SUBMITTED' || s.result.status === 'EXPIRED') && (
        <div className="text-xs">
          <strong>Nota: {s.result.score}/10</strong>
          <span className="text-muted-foreground ml-1">
            ({s.result.acertos}✓ · {s.result.erros}✗ · {s.result.brancos}—)
          </span>
        </div>
      )}

      <Action s={s} />
    </div>
  )
}

function StatusBadge({ status }: { status: Simulado['status'] }) {
  const map: Record<Simulado['status'], { label: string; cls: string; icon: any }> = {
    NOT_GENERATED: { label: 'aguardando', cls: 'bg-muted text-muted-foreground', icon: Loader2 },
    LOCKED:        { label: 'trancado',   cls: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Lock },
    AVAILABLE:     { label: 'disponível', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: Zap },
    IN_PROGRESS:   { label: 'em andamento', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: AlertCircle },
    COMPLETED:     { label: 'feito',      cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300', icon: CheckCircle2 },
    EXPIRED:       { label: 'expirado',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle },
  }
  const m = map[status]
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', m.cls)}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  )
}

function Action({ s }: { s: Simulado }) {
  if (s.status === 'NOT_GENERATED') {
    return <p className="text-xs text-muted-foreground italic">Será gerado em breve…</p>
  }
  if (s.status === 'LOCKED' && s.windowFrom) {
    const when = new Date(s.windowFrom).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return <p className="text-xs text-muted-foreground">Abre {s.label} ({when}) 00h</p>
  }
  if (s.status === 'COMPLETED' && s.mockExam && s.result) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Link
          href={`/dashboard/simulados/${s.mockExam.id}/resultado/${s.result.id}`}
          className="rounded-lg bg-muted hover:bg-muted/70 py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
        >
          Resultado
        </Link>
        <Link
          href={`/dashboard/simulado/${s.mockExam.id}/imprimir`}
          target="_blank"
          className="rounded-lg border border-border hover:bg-muted py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
        >
          <Printer className="w-3 h-3" /> PDF
        </Link>
      </div>
    )
  }
  if ((s.status === 'AVAILABLE' || s.status === 'IN_PROGRESS') && s.mockExam) {
    return (
      <Link
        href={`/dashboard/simulados/${s.mockExam.id}/fazer`}
        className="rounded-lg bg-brand-500 text-white py-2 text-xs font-bold hover:bg-brand-600 inline-flex items-center justify-center gap-1.5 transition"
      >
        {s.status === 'IN_PROGRESS' ? 'Continuar' : 'Começar'} <ArrowRight className="w-3 h-3" />
      </Link>
    )
  }
  if (s.status === 'EXPIRED' && s.mockExam) {
    return (
      <Link
        href={`/dashboard/simulado/${s.mockExam.id}/imprimir`}
        target="_blank"
        className="rounded-lg border border-border py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1 hover:bg-muted"
      >
        <Printer className="w-3 h-3" /> Baixar pra fazer no papel
      </Link>
    )
  }
  return null
}
