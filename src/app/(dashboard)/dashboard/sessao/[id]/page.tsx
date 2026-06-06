'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, BookOpen, Brain, Target, CheckCircle2, Clock,
  FileText, Zap, Play, Pause, RotateCcw, ChevronRight, Sparkles, Download, Flame,
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
  topicCompletedAt: string | null
}

type PendingTopic = {
  id: string
  name: string
  description: string | null
  order: number
  weight: number
  hasMaterial: boolean
  hasResumo: boolean
  completed: boolean
}

type PendingData = {
  pending: PendingTopic[]
  completed: PendingTopic[]
  totalSubject: number
  completedCount: number
  pendingCount: number
  coverage: number
}

type Tab = 'resumo' | 'questoes-oficiais' | 'questoes-ia' | 'flashcards' | 'pomodoro'

export default function SessaoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<SessionData | null>(null)
  const [pending, setPending] = useState<PendingData | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('resumo')
  const [saving, setSaving] = useState(false)
  const [cicloMode, setCicloMode] = useState(false)
  const [cicloFase, setCicloFase] = useState<'ler' | 'questoes' | 'fixar'>('ler')
  const [erradasNoCiclo, setErradasNoCiclo] = useState(0)

  // Pomodoro state
  const [pomoMode, setPomoMode] = useState<'estudo' | 'pausa' | 'revisao'>('estudo')
  const [pomoSeconds, setPomoSeconds] = useState(50 * 60)
  const [pomoRunning, setPomoRunning] = useState(false)

  useEffect(() => {
    api.get(`/sessao/${params.id}`).then(({ data }) => setData(data)).catch(() => toast.error('Sessão não encontrada')).finally(() => setLoading(false))
    api.get(`/me/schedule/sessions/${params.id}/pending-topics`).then(({ data }) => setPending(data)).catch(() => {})
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
              <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  {data.topic.parentName && <span>{data.topic.parentName} → </span>}
                  <strong>{data.topic.name}</strong>
                </span>
                {data.topicCompletedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500 text-white text-[10px] font-black px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3" /> DOMINADO
                  </span>
                )}
              </div>
            )}
            {data.topic && (
              <div className="mt-2">
                <button
                  onClick={async () => {
                    try {
                      if (data.topicCompletedAt) {
                        await api.delete(`/me/topics/${data.topic!.id}/complete`)
                        setData({ ...data, topicCompletedAt: null })
                        toast('Tópico volta pra fila de estudo')
                      } else {
                        const { data: res } = await api.post(`/me/topics/${data.topic!.id}/complete`)
                        setData({ ...data, topicCompletedAt: res.completedAt })
                        toast.success('✅ Tópico marcado como dominado — não cai mais em estudo novo')
                      }
                    } catch (err: any) {
                      toast.error(err.response?.data?.message ?? 'Erro')
                    }
                  }}
                  className={cn(
                    'text-[11px] font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors',
                    data.topicCompletedAt
                      ? 'bg-card border border-border hover:bg-muted text-foreground'
                      : 'bg-green-500 hover:bg-green-600 text-white',
                  )}
                  title={data.topicCompletedAt ? 'Desmarcar (volta pra estudo)' : 'Marca este tópico como dominado'}
                >
                  {data.topicCompletedAt ? '↩ Desmarcar dominado' : '✅ Já dominei este tópico'}
                </button>
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

      {/* Tópicos pendentes desta matéria */}
      {pending && pending.totalSubject > 0 && (
        <div className="card p-4">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-500" />
                Tópicos desta matéria
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pending.completedCount} de {pending.totalSubject} estudados ({pending.coverage}%) — os já marcados como dominados não voltam pra fila do cronograma
              </p>
            </div>
            <div className="text-base font-black text-brand-600">{pending.coverage}%</div>
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-brand-500"
              style={{ width: `${Math.min(100, Math.max(0, pending.coverage))}%` }}
            />
          </div>

          {pending.pending.length === 0 ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-green-700 dark:text-green-300">
                Todos os tópicos desta matéria já estão marcados como dominados!
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground mb-1.5">
                Pendentes ({pending.pendingCount})
              </p>
              <ul className="space-y-1 mb-3">
                {pending.pending.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/material/${t.id}`}
                      className={cn(
                        'flex items-center gap-2 text-sm py-1.5 px-2 -mx-1 rounded hover:bg-muted/40 transition',
                        !t.hasMaterial && 'text-muted-foreground/60'
                      )}
                    >
                      <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{t.name}</span>
                      {t.hasMaterial ? (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-brand-600 dark:text-brand-400 shrink-0">
                          Material
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 shrink-0">
                          Em produção
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    </Link>
                  </li>
                ))}
                {pending.pending.length > 8 && (
                  <li className="text-[11px] text-muted-foreground/70 px-2 italic">
                    +{pending.pending.length - 8} tópicos pendentes nesta matéria
                  </li>
                )}
              </ul>
            </>
          )}

          {pending.completed.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
              >
                {showCompleted ? '▼' : '▶'} Já dominados ({pending.completed.length})
              </button>
              {showCompleted && (
                <ul className="space-y-1 mt-1.5">
                  {pending.completed.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/material/${t.id}`}
                        className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-1 rounded hover:bg-muted/40 transition text-muted-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="flex-1 min-w-0 truncate line-through decoration-from-font">{t.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Toggle MODO CICLO GUIADO */}
      <div className={cn(
        'card p-3 flex items-center gap-3 transition-colors',
        cicloMode
          ? 'bg-orange-50/60 dark:bg-orange-900/15 border-orange-300 dark:border-orange-700/60'
          : '',
      )}>
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg',
          cicloMode ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground',
        )}>
          {cicloMode ? <Flame className="w-4 h-4" /> : '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm flex items-center gap-1.5">
            Modo Ciclo Guiado
            {cicloMode && <span className="badge bg-orange-500 text-white text-[10px] py-0.5 px-2">FASE: {cicloFase.toUpperCase()}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {cicloMode
              ? `Vai te guiar: LER resumo → fazer QUESTÕES → FIXAR (revisar flashcards das erradas). Total ~50min.`
              : `Modo livre: navega pelas abas como quiser. Liga pra ter um ciclo guiado de estudo.`}
          </p>
        </div>
        <button
          onClick={() => {
            const novo = !cicloMode
            setCicloMode(novo)
            if (novo) { setCicloFase('ler'); setErradasNoCiclo(0) }
          }}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors shrink-0',
            cicloMode ? 'bg-orange-500' : 'bg-muted',
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all',
            cicloMode ? 'left-5' : 'left-0.5',
          )} />
        </button>
      </div>

      {/* MODO CICLO GUIADO — fluxo sequencial */}
      {cicloMode ? (
        <CicloGuiado
          fase={cicloFase}
          setFase={setCicloFase}
          data={data}
          erradas={erradasNoCiclo}
          setErradas={setErradasNoCiclo}
          onUpdateChecklist={updateChecklist}
          onConcluir={concluirSessao}
        />
      ) : (
      <>
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
      </>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Modo Ciclo Guiado — 3 fases sequenciais
// ──────────────────────────────────────────────────────────────────────

function CicloGuiado({
  fase, setFase, data, erradas, setErradas, onUpdateChecklist, onConcluir,
}: {
  fase: 'ler' | 'questoes' | 'fixar'
  setFase: (f: 'ler' | 'questoes' | 'fixar') => void
  data: SessionData
  erradas: number
  setErradas: (n: number) => void
  onUpdateChecklist: (field: keyof SessionData['session']['checklist'], value: any) => void
  onConcluir: () => void
}) {
  const questoes = data.officialQuestions.length > 0 ? data.officialQuestions : data.aiQuestions
  const recapFcds = data.flashcards.slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Stepper visual */}
      <div className="flex items-center gap-2">
        <CicloStep label="LER" active={fase === 'ler'} done={fase !== 'ler'} icon="📖" />
        <div className="flex-1 h-0.5 bg-muted relative">
          <div className={cn('absolute inset-0 bg-orange-500 transition-all',
            fase === 'ler' ? 'w-0' : fase === 'questoes' ? 'w-1/2' : 'w-full')} />
        </div>
        <CicloStep label="QUESTÕES" active={fase === 'questoes'} done={fase === 'fixar'} icon="✍️" />
        <div className="flex-1 h-0.5 bg-muted relative">
          <div className={cn('absolute inset-0 bg-orange-500 transition-all',
            fase === 'fixar' ? 'w-full' : 'w-0')} />
        </div>
        <CicloStep label="FIXAR" active={fase === 'fixar'} done={false} icon="🎴" />
      </div>

      {/* FASE 1 — LER */}
      {fase === 'ler' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            📖 Leia o resumo do tópico
            <span className="text-[10px] text-muted-foreground font-normal">~15 min</span>
          </h3>
          {data.resumo ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{data.resumo}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Resumo indisponível pra este tópico.</p>
          )}
          <button
            onClick={() => { onUpdateChecklist('resumoLido', true); setFase('questoes') }}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Estudei! Ir pras questões
          </button>
        </div>
      )}

      {/* FASE 2 — QUESTÕES */}
      {fase === 'questoes' && (
        <div className="space-y-3">
          <div className="card p-3 bg-orange-50/40 dark:bg-orange-900/15 text-xs flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-500" />
            <span>Responde {questoes.length > 0 ? questoes.length : 5} questões. As erradas viram flashcard automaticamente.</span>
          </div>
          <QuestoesPanel
            questoes={questoes}
            onAnswer={() => onUpdateChecklist('questoesFeitas', data.session.checklist.questoesFeitas + 1)}
            onWrong={() => setErradas(erradas + 1)}
            source="oficiais"
          />
          <button
            onClick={() => setFase('fixar')}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Concluí as questões {erradas > 0 && `(${erradas} erradas viraram flashcard)`}
          </button>
        </div>
      )}

      {/* FASE 3 — FIXAR */}
      {fase === 'fixar' && (
        <div className="space-y-3">
          <div className="card p-4 bg-purple-50/40 dark:bg-purple-900/15 space-y-2">
            <h3 className="font-bold text-sm inline-flex items-center gap-2">
              🎴 Fixar o conceito
              <span className="text-[10px] text-muted-foreground font-normal">~10 min</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Você errou <strong>{erradas}</strong> questão{erradas === 1 ? '' : 's'} nesse ciclo.
              {erradas > 0
                ? ` Cada uma virou um flashcard que volta amanhã (SM-2). Revise antes de concluir.`
                : ` Você gabaritou! Continue mantendo o ritmo.`}
            </p>
          </div>
          {recapFcds.length > 0 ? (
            <FlashcardsPanel
              flashcards={recapFcds}
              onReview={() => onUpdateChecklist('flashcardsRevisados', data.session.checklist.flashcardsRevisados + 1)}
            />
          ) : (
            <div className="card p-6 text-center text-sm text-muted-foreground">
              Sem flashcards revisáveis agora. Clica em "Concluir" pra fechar o ciclo.
            </div>
          )}
          <button
            onClick={onConcluir}
            disabled={data.session.status === 'CONCLUIDO'}
            className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" /> Concluir ciclo de estudo
          </button>
        </div>
      )}
    </div>
  )
}

function CicloStep({ label, active, done, icon }: { label: string; active: boolean; done: boolean; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors',
        done ? 'bg-green-500 text-white' : active ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground',
      )}>
        {done ? '✓' : icon}
      </div>
      <span className={cn(
        'text-[10px] font-bold',
        active ? 'text-orange-600 dark:text-orange-400' : done ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
      )}>
        {label}
      </span>
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

function QuestoesPanel({ questoes, onAnswer, onWrong, source }: { questoes: any[]; onAnswer: () => void; onWrong?: () => void; source: string }) {
  const [idx, setIdx] = useState(0)
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ correct: boolean; gabarito: string; explicacao?: string | null; autoFlashcard?: boolean } | null>(null)

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

  async function answer(letter: string) {
    if (showAnswer || submitting) return
    setSelected(letter)
    setSubmitting(true)
    try {
      // Chama API real — registra QuestionAttempt + dispara auto-flashcard se errar
      const { data } = await api.post(`/me/questoes/${q.id}/attempt`, { selected: letter })
      setLastResult(data)
      setShowAnswer(true)
      if (!answered.has(q.id)) {
        setAnswered(new Set([...answered, q.id]))
        onAnswer()
      }
      if (!data.correct) {
        onWrong?.()
        if (data.autoFlashcard) {
          toast('🎴 Flashcard adicionado pra você revisar', { icon: '✨', duration: 3000 })
        }
      }
    } catch (err: any) {
      const status = err.response?.status
      if (status === 429) {
        toast.error(err.response?.data?.message ?? 'Limite do trial atingido', { duration: 5000 })
      } else {
        // Fallback offline: mostra gabarito do front mesmo (não bloqueia estudo)
        setShowAnswer(true)
        setLastResult({ correct: letter === q.gabarito, gabarito: q.gabarito, explicacao: q.explicacao })
      }
      if (!answered.has(q.id)) {
        setAnswered(new Set([...answered, q.id]))
        onAnswer()
      }
    } finally {
      setSubmitting(false)
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
          const gab = (lastResult?.gabarito ?? q.gabarito)
          const isCorrect = showAnswer && l === gab
          const isWrong = showAnswer && selected === l && l !== gab
          return (
            <button key={l} onClick={() => answer(l)} disabled={submitting || showAnswer}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 text-sm transition disabled:cursor-default',
                isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                selected === l ? 'border-brand-500' : 'border-border hover:bg-muted',
              )}>
              <strong>({l})</strong> {l === 'C' ? 'Certo' : 'Errado'}
            </button>
          )
        }) : (q.alternativas || []).map((alt: any) => {
          const gab = (lastResult?.gabarito ?? q.gabarito)
          const isCorrect = showAnswer && alt.letra === gab
          const isWrong = showAnswer && selected === alt.letra && alt.letra !== gab
          return (
            <button key={alt.letra} onClick={() => answer(alt.letra)} disabled={submitting || showAnswer}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 text-sm transition disabled:cursor-default',
                isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                selected === alt.letra ? 'border-brand-500' : 'border-border hover:bg-muted',
              )}>
              <strong>({alt.letra})</strong> {alt.texto}
            </button>
          )
        })}
      </div>
      {showAnswer && (lastResult?.autoFlashcard) && (
        <div className="mt-3 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-xs inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>+1 flashcard adicionado pra você revisar amanhã (SM-2)</span>
        </div>
      )}
      {showAnswer && (lastResult?.explicacao ?? q.explicacao) && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs">
          <strong>Explicação:</strong> {lastResult?.explicacao ?? q.explicacao}
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
