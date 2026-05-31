'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { History, TrendingDown, TrendingUp, AlertTriangle, Loader2, Filter, ChevronDown, CheckCircle2, XCircle, MinusCircle, Sparkles, Target, Timer } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Attempt = {
  id: string
  selected: string | null
  correct: boolean
  timeMs: number | null
  createdAt: string
  question: {
    id: string
    enunciado: string
    alternativas: Array<{ letra: string; texto: string }>
    gabarito: string
    explicacao: string
    subjectId: string | null
    bancaSlug: string | null
    ano: number | null
    orgao: string | null
    difficulty: string
    subject: { name: string; slug: string } | null
  }
}

type Mastery = {
  subjectId: string
  subjectName: string
  subjectSlug: string
  courseId: string
  courseName: string
  courseSlug: string
  masteryScore: number
  totalAttempts: number
  correctAttempts: number
  recentWrongCount: number
  nivel: 'FORTE' | 'MEDIO' | 'FRACO'
}

export default function HistoricoPage() {
  const [tab, setTab] = useState<'fraquezas' | 'historico'>('fraquezas')
  const [masteries, setMasteries] = useState<{ fracas: Mastery[]; medias: Mastery[]; fortes: Mastery[] }>({ fracas: [], medias: [], fortes: [] })
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [studyTime, setStudyTime] = useState<{ totalMin: number; perDay: Array<{ date: string; min: number }> } | null>(null)

  // Filtros do histórico
  const [filterCorrect, setFilterCorrect] = useState<'all' | 'wrong' | 'right'>('all')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterBanca, setFilterBanca] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/me/fraquezas').then((r) => r.data),
      api.get('/me/historico?limit=100').then((r) => r.data),
      api.get('/me/study-time?days=7').then((r) => r.data).catch(() => null),
    ])
      .then(([f, h, st]) => {
        setMasteries({ fracas: f.fracas, medias: f.medias, fortes: f.fortes })
        setAttempts(h.attempts)
        if (st) setStudyTime({ totalMin: st.totalMin, perDay: st.perDay })
      })
      .catch(() => toast.error('Erro ao carregar histórico'))
      .finally(() => setLoading(false))
  }, [])

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (filterCorrect === 'wrong' && a.correct) return false
      if (filterCorrect === 'right' && !a.correct) return false
      if (filterSubject && a.question.subject?.slug !== filterSubject) return false
      if (filterBanca && a.question.bancaSlug !== filterBanca) return false
      return true
    })
  }, [attempts, filterCorrect, filterSubject, filterBanca])

  async function gerarSimuladoFraqueza(m: Mastery) {
    setGenerating(m.subjectId)
    try {
      const { data } = await api.post('/simulados/generate', {
        type: 'MINI',
        courseId: m.courseId,
        subjectId: m.subjectId,
        totalQuestoes: 10,
        durationMin: 15,
      })
      toast.success('Simulado da fraqueza gerado!')
      window.location.href = `/dashboard/simulados/${data.id}/fazer`
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao gerar')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  const allMasteries = [...masteries.fracas, ...masteries.medias, ...masteries.fortes]
  const subjects = Array.from(new Set(attempts.map((a) => a.question.subject?.slug).filter(Boolean))) as string[]
  const bancas = Array.from(new Set(attempts.map((a) => a.question.bancaSlug).filter(Boolean))) as string[]

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <History className="w-6 h-6 text-brand-500" /> Histórico e fraquezas
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Onde você anda errando + onde precisa reforçar.
        </p>
      </div>

      {studyTime && studyTime.totalMin > 0 && (
        <div className="card p-4 flex items-center gap-4">
          <div className="rounded-full p-2.5 bg-brand-500/10 text-brand-500">
            <Timer className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Tempo cronometrado nos últimos 7 dias</div>
            <div className="font-black text-lg tabular-nums">
              {Math.floor(studyTime.totalMin / 60)}h {studyTime.totalMin % 60}min
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {studyTime.perDay.slice(-7).map((d) => {
              const max = Math.max(1, ...studyTime.perDay.map((x) => x.min))
              const h = Math.max(4, Math.round((d.min / max) * 40))
              return (
                <div key={d.date} className="w-3 rounded-sm bg-brand-500/70" style={{ height: `${h}px` }} title={`${d.date}: ${d.min}min`} />
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'fraquezas', label: '🎯 Suas fraquezas', count: masteries.fracas.length },
          { id: 'historico', label: 'Histórico de respostas', count: attempts.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px',
              tab === t.id ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label} <span className="text-xs opacity-60 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'fraquezas' && (
        <div className="space-y-5">
          {allMasteries.length === 0 ? (
            <div className="card p-10 text-center">
              <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Faça alguns simulados primeiro pra eu mapear seu nível por matéria.</p>
              <Link href="/dashboard/simulados" className="mt-3 inline-block text-brand-500 font-semibold text-sm">Ir pros simulados →</Link>
            </div>
          ) : (
            <>
              {masteries.fracas.length > 0 && (
                <Section title="🔴 Pontos fracos" desc="Acerto abaixo de 60%. Foco aqui!" color="red">
                  {masteries.fracas.map((m) => (
                    <MasteryCard key={m.subjectId + m.courseId} m={m} onGenerate={gerarSimuladoFraqueza} generating={generating === m.subjectId} />
                  ))}
                </Section>
              )}
              {masteries.medias.length > 0 && (
                <Section title="🟡 Em desenvolvimento" desc="Entre 60% e 85%. Pode melhorar." color="yellow">
                  {masteries.medias.map((m) => (
                    <MasteryCard key={m.subjectId + m.courseId} m={m} onGenerate={gerarSimuladoFraqueza} generating={generating === m.subjectId} />
                  ))}
                </Section>
              )}
              {masteries.fortes.length > 0 && (
                <Section title="🟢 Dominadas" desc="Acima de 85% — mandando bem!" color="green">
                  {masteries.fortes.map((m) => (
                    <MasteryCard key={m.subjectId + m.courseId} m={m} onGenerate={gerarSimuladoFraqueza} generating={generating === m.subjectId} />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="space-y-3">
          <div className="card p-3 flex flex-wrap items-center gap-2 text-xs">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={filterCorrect} onChange={(e) => setFilterCorrect(e.target.value as any)}
              className="rounded-lg border border-border bg-background px-2 py-1">
              <option value="all">Todas</option>
              <option value="wrong">Só erradas</option>
              <option value="right">Só corretas</option>
            </select>
            {subjects.length > 0 && (
              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1">
                <option value="">Todas matérias</option>
                {subjects.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            )}
            {bancas.length > 0 && (
              <select value={filterBanca} onChange={(e) => setFilterBanca(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1">
                <option value="">Todas bancas</option>
                {bancas.map((b) => (<option key={b} value={b}>{b}</option>))}
              </select>
            )}
            <span className="ml-auto text-muted-foreground">{filteredAttempts.length} resultados</span>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="card p-10 text-center">
              <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma questão encontrada com esses filtros.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttempts.slice(0, 50).map((a) => <AttemptRow key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, desc, color, children }: { title: string; desc: string; color: 'red' | 'yellow' | 'green'; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h2 className="font-bold text-sm">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

function MasteryCard({ m, onGenerate, generating }: { m: Mastery; onGenerate: (m: Mastery) => void; generating: boolean }) {
  const ringColor = m.nivel === 'FRACO' ? 'ring-red-500/30 bg-red-50/40 dark:bg-red-900/10'
    : m.nivel === 'MEDIO' ? 'ring-yellow-500/30 bg-yellow-50/40 dark:bg-yellow-900/10'
    : 'ring-green-500/30 bg-green-50/40 dark:bg-green-900/10'
  const Icon = m.nivel === 'FRACO' ? TrendingDown : m.nivel === 'MEDIO' ? AlertTriangle : TrendingUp
  const iconColor = m.nivel === 'FRACO' ? 'text-red-500' : m.nivel === 'MEDIO' ? 'text-yellow-500' : 'text-green-500'

  return (
    <div className={cn('card p-3 ring-1 flex flex-col gap-2', ringColor)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{m.subjectName}</div>
          <div className="text-[10px] text-muted-foreground">{m.courseName}</div>
        </div>
        <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-black">{Math.round(m.masteryScore)}<span className="text-sm font-normal text-muted-foreground">%</span></div>
        <div className="text-[10px] text-muted-foreground mb-1">
          {m.correctAttempts}/{m.totalAttempts} acertos
          {m.recentWrongCount > 0 && <span className="text-red-500"> · {m.recentWrongCount} erros recentes</span>}
        </div>
      </div>
      {(m.nivel === 'FRACO' || m.nivel === 'MEDIO') && (
        <button
          onClick={() => onGenerate(m)}
          disabled={generating}
          className="rounded-lg bg-brand-500 text-white py-1.5 px-2 text-[11px] font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Mini-simulado dessa matéria
        </button>
      )}
    </div>
  )
}

function AttemptRow({ a }: { a: Attempt }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card p-3 text-sm">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-start gap-2">
        {a.correct ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          : a.selected ? <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          : <MinusCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mb-0.5">
            {a.question.subject && <span className="font-bold">{a.question.subject.name}</span>}
            {a.question.bancaSlug && <span className="uppercase">{a.question.bancaSlug}</span>}
            {a.question.ano && <span>{a.question.ano}</span>}
            <span className="ml-auto">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <p className={cn('text-xs line-clamp-2', !expanded && 'line-clamp-2')}>{a.question.enunciado}</p>
          {expanded && (
            <div className="mt-2 space-y-2">
              <ul className="space-y-1 text-xs">
                {a.question.alternativas?.map((alt) => (
                  <li
                    key={alt.letra}
                    className={cn(
                      'p-1.5 rounded border',
                      alt.letra === a.question.gabarito ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : alt.letra === a.selected ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-border',
                    )}
                  >
                    <strong>({alt.letra})</strong> {alt.texto}
                  </li>
                ))}
              </ul>
              {a.question.explicacao && (
                <div className="text-[11px] p-2 rounded-lg bg-muted">
                  <strong>Explicação:</strong> {a.question.explicacao}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition shrink-0 mt-0.5', expanded && 'rotate-180')} />
      </button>
    </div>
  )
}
