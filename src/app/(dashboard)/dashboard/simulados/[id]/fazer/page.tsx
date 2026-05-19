'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Clock, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Send, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Question = {
  id: string
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }>
  subjectId: string | null
}

type Exam = {
  id: string
  title: string
  type: 'REAL' | 'MINI' | 'PERSONALIZADO'
  durationMin: number
  totalQuestoes: number
  hasRedacao: boolean
  examFormat: 'CE' | 'ME_5' | 'ME_4' | 'MISTA' | null
  wrongAnnulsRight: boolean
  questions: Question[]
}

export default function FazerSimuladoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [redacaoText, setRedacaoText] = useState('')
  const [phase, setPhase] = useState<'instructions' | 'questions' | 'redacao' | 'submitting' | 'locked'>('instructions')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [lockMessage, setLockMessage] = useState('')
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    api.get(`/simulados/${params.id}`).then(({ data }) => {
      setExam(data)
      setSecondsLeft(data.durationMin * 60)
    }).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (phase !== 'questions' && phase !== 'redacao') return
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current)
          // Auto-submit quando tempo acaba
          submit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function start() {
    try {
      const { data } = await api.post(`/simulados/${params.id}/start`)
      const sAt = new Date(data.startedAt).getTime()
      const eAt = new Date(data.expiresAt).getTime()
      setStartedAt(sAt)
      setExpiresAt(eAt)
      const remaining = Math.max(0, Math.floor((eAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (data.resumed) toast('Retomando simulado em andamento')
      setPhase('questions')
    } catch (e: any) {
      const code = e.response?.data?.code
      const msg = e.response?.data?.message ?? 'Erro ao iniciar'
      if (code === 'WINDOW_NOT_OPEN' || code === 'WINDOW_EXPIRED' || code === 'ALREADY_DONE') {
        setLockMessage(msg)
        setPhase('locked')
      } else {
        toast.error(msg)
      }
    }
  }

  function selectAnswer(qid: string, letter: string) {
    setAnswers((p) => ({ ...p, [qid]: letter }))
  }

  async function submit() {
    if (!exam || !startedAt) return
    setPhase('submitting')
    try {
      const answersArr = exam.questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] ?? null,
      }))
      const now = Date.now()
      const autoSubmit = expiresAt != null && now >= expiresAt
      const { data } = await api.post(`/simulados/${params.id}/submit`, {
        answers: answersArr,
        redacaoText: exam.hasRedacao ? redacaoText : undefined,
        redacaoMin: exam.hasRedacao ? Math.round((now - startedAt) / 60000) : undefined,
        timeMs: now - startedAt,
        autoSubmit,
      })
      router.push(`/dashboard/simulados/${params.id}/resultado/${data.resultId}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao submeter')
      setPhase('questions')
    }
  }

  const timer = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [secondsLeft])

  const isCE = exam?.examFormat === 'CE'
  const letters = isCE ? ['C', 'E'] : ['A', 'B', 'C', 'D', 'E']

  if (loading || !exam) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  if (phase === 'locked') {
    return (
      <div className="max-w-md mx-auto card p-6 text-center space-y-3 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
        <h2 className="font-bold text-lg">Não dá pra fazer agora</h2>
        <p className="text-sm text-muted-foreground">{lockMessage}</p>
        <button
          onClick={() => router.push('/dashboard/simulados')}
          className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-600"
        >
          Voltar pros simulados
        </button>
      </div>
    )
  }

  // INSTRUÇÕES
  if (phase === 'instructions') {
    return (
      <div className="max-w-2xl mx-auto card p-6 space-y-5 animate-fade-in">
        <h1 className="text-2xl font-black">{exam.title}</h1>
        <div className="space-y-2 text-sm">
          <Row label="Questões" value={`${exam.totalQuestoes}`} />
          <Row label="Tempo" value={`${exam.durationMin} minutos`} />
          <Row label="Formato" value={isCE ? 'Certo / Errado (Cebraspe)' : 'Múltipla escolha A-E'} />
          {exam.wrongAnnulsRight && <Row label="Errada anula certa" value="SIM — cuidado com chutes" alert />}
          {exam.hasRedacao && <Row label="Tem redação" value="SIM" />}
        </div>
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 text-xs text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Ao clicar em "Iniciar", o cronômetro começa. Não recarregue a página — o tempo continua correndo. Quando acabar, o simulado é submetido automaticamente.
        </div>
        <button
          onClick={start}
          className="w-full rounded-xl bg-brand-500 text-white py-3 text-sm font-semibold hover:bg-brand-600"
        >
          Iniciar simulado
        </button>
      </div>
    )
  }

  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm text-muted-foreground">Corrigindo e calculando nota…</p>
      </div>
    )
  }

  // REDAÇÃO
  if (phase === 'redacao') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <TimerBar timer={timer} secondsLeft={secondsLeft} totalSeconds={exam.durationMin * 60} />
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-foreground">Redação</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Escreva sua redação no espaço abaixo. Você pode voltar pras questões a qualquer momento.
            <strong> A correção da redação ainda não está disponível</strong> — você verá o texto no resultado pra revisar.
          </p>
          <textarea
            value={redacaoText}
            onChange={(e) => setRedacaoText(e.target.value)}
            placeholder="Comece a digitar sua redação aqui…"
            className="w-full min-h-[400px] rounded-lg border border-border bg-background p-3 text-sm font-mono leading-relaxed resize-y"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{redacaoText.length} caracteres · ~{Math.round(redacaoText.split(/\s+/).filter(Boolean).length)} palavras</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('questions')}
                className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold"
              >
                ← Voltar pras questões
              </button>
              <button
                onClick={submit}
                className="px-3 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 inline-flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Finalizar simulado
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // QUESTÕES
  const q = exam.questions[current]
  const answered = Object.keys(answers).length

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <TimerBar timer={timer} secondsLeft={secondsLeft} totalSeconds={exam.durationMin * 60} />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span>Questão {current + 1} de {exam.questions.length}</span>
          <span>{answered}/{exam.questions.length} respondidas</span>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm mb-5">
          <p className="whitespace-pre-wrap">{q.enunciado}</p>
        </div>

        <div className="space-y-2">
          {isCE ? (
            ['C', 'E'].map((l) => (
              <button
                key={l}
                onClick={() => selectAnswer(q.id, l)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition',
                  answers[q.id] === l ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-border hover:bg-muted',
                )}
              >
                <span className="font-bold mr-2">{l === 'C' ? '(C) Certo' : '(E) Errado'}</span>
              </button>
            ))
          ) : (
            (q.alternativas as Array<{ letra: string; texto: string }>).map((alt) => (
              <button
                key={alt.letra}
                onClick={() => selectAnswer(q.id, alt.letra)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition flex gap-2',
                  answers[q.id] === alt.letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-border hover:bg-muted',
                )}
              >
                <span className="font-bold shrink-0">{alt.letra})</span>
                <span className="text-sm">{alt.texto}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Nav inferior */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrent((p) => Math.max(0, p - 1))}
          disabled={current === 0}
          className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Anterior
        </button>

        <div className="flex flex-wrap gap-1 justify-center max-w-md">
          {exam.questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={cn(
                'w-7 h-7 rounded text-[10px] font-semibold border transition',
                i === current ? 'border-brand-500 bg-brand-500 text-white'
                  : answers[qq.id] ? 'border-success-300 bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {current < exam.questions.length - 1 ? (
          <button
            onClick={() => setCurrent((p) => p + 1)}
            className="px-3 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1"
          >
            Próxima <ChevronRight className="w-3 h-3" />
          </button>
        ) : exam.hasRedacao ? (
          <button
            onClick={() => setPhase('redacao')}
            className="px-3 py-2 rounded-lg bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> Ir pra redação
          </button>
        ) : (
          <button
            onClick={() => {
              if (answered < exam.questions.length && !confirm(`Você não respondeu ${exam.questions.length - answered} questões. Submeter assim?`)) return
              submit()
            }}
            className="px-3 py-2 rounded-lg bg-success-500 text-white text-xs font-semibold inline-flex items-center gap-1"
          >
            <Send className="w-3 h-3" /> Finalizar
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', alert && 'text-yellow-600 dark:text-yellow-400')}>{value}</span>
    </div>
  )
}

function TimerBar({ timer, secondsLeft, totalSeconds }: { timer: string; secondsLeft: number; totalSeconds: number }) {
  const pct = (secondsLeft / totalSeconds) * 100
  const critical = secondsLeft < 300
  return (
    <div className={cn('card p-3 sticky top-0 z-10', critical && 'ring-2 ring-red-500/40')}>
      <div className="flex items-center justify-between text-sm font-mono">
        <div className="flex items-center gap-2">
          <Clock className={cn('w-4 h-4', critical ? 'text-red-500' : 'text-brand-500')} />
          <span className={cn('font-bold text-lg', critical && 'text-red-600')}>{timer}</span>
        </div>
        {critical && <span className="text-xs text-red-500 font-semibold animate-pulse">⚠ menos de 5min</span>}
      </div>
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full transition-all', critical ? 'bg-red-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
