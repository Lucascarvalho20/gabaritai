'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, BookOpen, Brain, Target, CheckCircle2, Clock,
  FileText, Zap, Play, Pause, RotateCcw, ChevronRight, Sparkles, Download,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

type SessionData = {
  session: {
    id: string
    type: string
    status: string
    durationMin: number
    date: string
    checklist: { resumoLido: boolean; questoesFeitas: number; flashcardsRevisados: number; simuladoFeito?: boolean }
    notes: string | null
  }
  course: { slug: string; name: string; cargo: string | null }
  subject: { id: string; name: string; slug: string } | null
  topic: { id: string; name: string; description: string | null; parentName: string | null } | null
  bancaSlug: string | null
  resumo: string | null
  resumoCached: boolean
  officialQuestions: Array<any>
  aiQuestions: Array<any>
  flashcards: Array<{ id: string; frente: string; verso: string }>
  myTopicStats: { total: number; corretos: number; mastery: number } | null
}

type Tab = 'resumo' | 'questoes-oficiais' | 'questoes-ia' | 'flashcards' | 'pomodoro'

export default function SessaoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('resumo')
  const [saving, setSaving] = useState(false)

  // Pomodoro state
  const [pomoMode, setPomoMode] = useState<'estudo' | 'pausa' | 'revisao'>('estudo')
  const [pomoSeconds, setPomoSeconds] = useState(50 * 60)
  const [pomoRunning, setPomoRunning] = useState(false)

  useEffect(() => {
    api.get(`/sessao/${params.id}`).then(({ data }) => setData(data)).catch(() => toast.error('Sessão não encontrada')).finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!pomoRunning) return
    const t = setInterval(() => {
      setPomoSeconds((s) => {
        if (s <= 1) {
          setPomoRunning(false)
          if (pomoMode === 'estudo') { setPomoMode('pausa'); return 10 * 60 }
          if (pomoMode === 'pausa') { setPomoMode('revisao'); return 20 * 60 }
          setPomoMode('estudo'); return 50 * 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [pomoRunning, pomoMode])

  async function updateChecklist(field: keyof SessionData['session']['checklist'], value: any) {
    if (!data) return
    const newChecklist = { ...data.session.checklist, [field]: value }
    setData({ ...data, session: { ...data.session, checklist: newChecklist } })
    setSaving(true)
    try {
      await api.patch(`/sessao/${params.id}`, { checklist: newChecklist })
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function concluirSessao() {
    if (!data) return
    try {
      await api.patch(`/sessao/${params.id}`, { status: 'CONCLUIDO' })
      toast.success('Sessão concluída! 🎉')
      setData({ ...data, session: { ...data.session, status: 'CONCLUIDO' } })
    } catch {
      toast.error('Erro')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!data) return <div className="text-center py-16 text-muted-foreground">Sessão não encontrada</div>

  const allChecked = data.session.checklist.resumoLido &&
    data.session.checklist.questoesFeitas >= 5 &&
    data.session.checklist.flashcardsRevisados >= 3

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/cronograma" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar ao cronograma
        </Link>
        <Link
          href={`/dashboard/sessao/${params.id}/imprimir`}
          target="_blank"
          className="text-xs font-bold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
        >
          <Download className="w-3 h-3" /> Baixar PDF
        </Link>
      </div>

      {/* Header */}
      <div className="card p-4 bg-gradient-to-br from-brand-500/10 to-purple-500/10 border-brand-500/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1">
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-1">
              {data.course.name}{data.course.cargo ? ` · ${data.course.cargo}` : ''}
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              {data.subject?.name ?? 'Estudo livre'}
            </h1>
            {data.topic && (
              <div className="text-sm text-muted-foreground mt-0.5">
                {data.topic.parentName && <span>{data.topic.parentName} → </span>}
                <strong>{data.topic.name}</strong>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {data.session.durationMin} min
            </div>
            <div className={cn(
              'mt-1 text-xs font-bold px-2 py-1 rounded-full inline-block',
              data.session.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
            )}>
              {data.session.status === 'CONCLUIDO' ? '✓ Concluído' : 'Em andamento'}
            </div>
          </div>
        </div>

        {/* Checklist granular */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Checkbox
            label="Resumo lido"
            checked={data.session.checklist.resumoLido}
            onChange={(v) => updateChecklist('resumoLido', v)}
            icon={FileText}
          />
          <div className="card p-2 text-center">
            <div className="text-xs font-bold flex items-center justify-center gap-1">
              <Target className="w-3 h-3" /> {data.session.checklist.questoesFeitas}/10 questões
            </div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-xs font-bold flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> {data.session.checklist.flashcardsRevisados}/5 flashcards
            </div>
          </div>
          <button
            onClick={concluirSessao}
            disabled={data.session.status === 'CONCLUIDO'}
            className={cn(
              'card p-2 text-center transition',
              allChecked && data.session.status !== 'CONCLUIDO' ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' : 'opacity-50',
            )}
          >
            <div className="text-xs font-bold inline-flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Concluir sessão
            </div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { id: 'resumo', label: '📚 Resumo', count: null },
          { id: 'questoes-oficiais', label: '📄 Oficiais', count: data.officialQuestions.length },
          { id: 'questoes-ia', label: '🤖 IA', count: data.aiQuestions.length },
          { id: 'flashcards', label: '⚡ Flashcards', count: data.flashcards.length },
          { id: 'pomodoro', label: '⏱ Pomodoro', count: null },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-xs font-bold border-b-2 transition -mb-px whitespace-nowrap',
              tab === t.id ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label} {t.count !== null && <span className="opacity-60 ml-1">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {tab === 'resumo' && (
        <div className="card p-5">
          {data.resumoCached && (
            <div className="text-[10px] text-green-600 dark:text-green-400 mb-2 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Resumo cacheado (zero custo IA)
            </div>
          )}
          {data.resumo ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{data.resumo}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Resumo indisponível.</p>
          )}
          {data.resumo && !data.session.checklist.resumoLido && (
            <button onClick={() => updateChecklist('resumoLido', true)}
              className="mt-4 rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold hover:bg-brand-600 inline-flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Marcar como lido
            </button>
          )}
        </div>
      )}

      {(tab === 'questoes-oficiais' || tab === 'questoes-ia') && (
        <QuestoesPanel
          questoes={tab === 'questoes-oficiais' ? data.officialQuestions : data.aiQuestions}
          onAnswer={() => updateChecklist('questoesFeitas', data.session.checklist.questoesFeitas + 1)}
          source={tab === 'questoes-oficiais' ? 'oficiais' : 'IA'}
        />
      )}

      {tab === 'flashcards' && (
        <FlashcardsPanel
          flashcards={data.flashcards}
          onReview={() => updateChecklist('flashcardsRevisados', data.session.checklist.flashcardsRevisados + 1)}
        />
      )}

      {tab === 'pomodoro' && (
        <PomodoroPanel
          mode={pomoMode}
          seconds={pomoSeconds}
          running={pomoRunning}
          onStart={() => setPomoRunning(true)}
          onPause={() => setPomoRunning(false)}
          onReset={() => { setPomoRunning(false); setPomoMode('estudo'); setPomoSeconds(50 * 60) }}
        />
      )}
    </div>
  )
}

function Checkbox({ label, checked, onChange, icon: Icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; icon: any }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={cn('card p-2 text-center transition', checked && 'bg-green-100 dark:bg-green-900/30 border-green-500')}>
      <div className="text-xs font-bold inline-flex items-center justify-center gap-1">
        {checked ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Icon className="w-3 h-3" />}
        {label}
      </div>
    </button>
  )
}

function QuestoesPanel({ questoes, onAnswer, source }: { questoes: any[]; onAnswer: () => void; source: string }) {
  const [idx, setIdx] = useState(0)
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  if (questoes.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Sem questões {source} desse tópico ainda.</p>
        <p className="text-xs text-muted-foreground">{source === 'oficiais' ? 'Aguarde admin importar provas.' : 'Geração automática em breve.'}</p>
      </div>
    )
  }

  const q = questoes[idx]
  const isCE = !q.alternativas || q.alternativas.length === 0

  function answer(letter: string) {
    if (showAnswer) return
    setSelected(letter)
    setShowAnswer(true)
    if (!answered.has(q.id)) {
      setAnswered(new Set([...answered, q.id]))
      onAnswer()
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <span>Questão {idx + 1} de {questoes.length}</span>
        <span>{answered.size} respondidas</span>
      </div>
      <p className="text-sm mb-4 whitespace-pre-wrap">{q.enunciado}</p>
      <div className="space-y-1.5">
        {isCE ? ['C', 'E'].map((l) => {
          const isCorrect = showAnswer && l === q.gabarito
          const isWrong = showAnswer && selected === l && l !== q.gabarito
          return (
            <button key={l} onClick={() => answer(l)}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 text-sm transition',
                isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                selected === l ? 'border-brand-500' : 'border-border hover:bg-muted',
              )}>
              <strong>({l})</strong> {l === 'C' ? 'Certo' : 'Errado'}
            </button>
          )
        }) : (q.alternativas || []).map((alt: any) => {
          const isCorrect = showAnswer && alt.letra === q.gabarito
          const isWrong = showAnswer && selected === alt.letra && alt.letra !== q.gabarito
          return (
            <button key={alt.letra} onClick={() => answer(alt.letra)}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 text-sm transition',
                isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                selected === alt.letra ? 'border-brand-500' : 'border-border hover:bg-muted',
              )}>
              <strong>({alt.letra})</strong> {alt.texto}
            </button>
          )
        })}
      </div>
      {showAnswer && q.explicacao && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs">
          <strong>Explicação:</strong> {q.explicacao}
        </div>
      )}
      <div className="mt-4 flex justify-between">
        <button onClick={() => { setIdx(Math.max(0, idx - 1)); setSelected(null); setShowAnswer(false) }}
          disabled={idx === 0}
          className="px-3 py-2 rounded-lg border border-border text-xs font-bold disabled:opacity-30">← Anterior</button>
        <button onClick={() => { setIdx(Math.min(questoes.length - 1, idx + 1)); setSelected(null); setShowAnswer(false) }}
          disabled={idx === questoes.length - 1}
          className="px-3 py-2 rounded-lg bg-brand-500 text-white text-xs font-bold disabled:opacity-30">Próxima →</button>
      </div>
    </div>
  )
}

function FlashcardsPanel({ flashcards, onReview }: { flashcards: any[]; onReview: () => void }) {
  const [idx, setIdx] = useState(0)
  const [showVerso, setShowVerso] = useState(false)
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  if (flashcards.length === 0) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">Sem flashcards desse tópico ainda.</div>
  }

  const fc = flashcards[idx]

  function next() {
    if (!reviewed.has(fc.id)) {
      setReviewed(new Set([...reviewed, fc.id]))
      onReview()
    }
    setShowVerso(false)
    setIdx(Math.min(flashcards.length - 1, idx + 1))
  }

  return (
    <div className="card p-5">
      <div className="text-xs text-muted-foreground text-center mb-3">
        Flashcard {idx + 1}/{flashcards.length} · {reviewed.size} revisados
      </div>
      <div onClick={() => setShowVerso(!showVerso)}
        className="min-h-[200px] card cursor-pointer p-6 flex items-center justify-center text-center hover:bg-muted/30 transition">
        <p className="text-sm whitespace-pre-wrap">{showVerso ? fc.verso : fc.frente}</p>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">Clica pra virar</p>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={next}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-xs font-bold">
          Próximo →
        </button>
      </div>
    </div>
  )
}

function PomodoroPanel({ mode, seconds, running, onStart, onPause, onReset }: {
  mode: 'estudo' | 'pausa' | 'revisao'; seconds: number; running: boolean; onStart: () => void; onPause: () => void; onReset: () => void
}) {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  const colors = {
    estudo: 'text-brand-500',
    pausa: 'text-green-500',
    revisao: 'text-purple-500',
  }
  return (
    <div className="card p-8 text-center">
      <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">
        {mode === 'estudo' ? '📚 Estudo focado' : mode === 'pausa' ? '☕ Pausa' : '🔁 Revisão'}
      </div>
      <div className={cn('text-6xl sm:text-7xl font-black font-mono mb-6', colors[mode])}>
        {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
      </div>
      <div className="flex justify-center gap-2">
        {!running ? (
          <button onClick={onStart} className="rounded-xl bg-brand-500 text-white px-6 py-3 text-sm font-bold inline-flex items-center gap-2">
            <Play className="w-4 h-4" /> Começar
          </button>
        ) : (
          <button onClick={onPause} className="rounded-xl bg-yellow-500 text-white px-6 py-3 text-sm font-bold inline-flex items-center gap-2">
            <Pause className="w-4 h-4" /> Pausar
          </button>
        )}
        <button onClick={onReset} className="rounded-xl border border-border px-4 py-3 text-sm font-bold inline-flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-4">
        Ciclo: 50min estudo → 10min pausa → 20min revisão
      </p>
    </div>
  )
}
