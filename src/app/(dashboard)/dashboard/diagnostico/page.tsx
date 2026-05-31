'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, Loader2, ChevronLeft, ChevronRight, Crown, Target,
  CheckCircle2, AlertTriangle, BookOpen, Brain,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Alt = { letra: string; texto: string }
type Question = {
  id: string
  enunciado: string
  alternativas: Alt[]
  subjectId: string | null
  bancaSlug: string | null
  ano: number | null
}
type MateriaPlanned = {
  subjectId: string
  name: string
  qtd: number
  weight: number
}
type StartResponse = {
  course: { id: string; slug: string; name: string }
  edital: { id: string; ano: number; titulo: string }
  materiasPlanejadas: MateriaPlanned[]
  questions: Question[]
  totalQuestoes: number
}
type SubmitResponse = {
  ok: true
  studyPlanId: string | null
  overview: {
    totalRespondidas: number
    acertos: number
    erros: number
    brancos: number
    taxaAcerto: number
  }
  porMateria: Array<{
    subjectId: string
    total: number
    correct: number
    pct: number
    nivel: 'forte' | 'medio' | 'fraco' | 'sem-dados'
  }>
  fraquezasIdentificadas: number
}

type Phase = 'intro' | 'loading' | 'answering' | 'submitting' | 'result' | 'error'

export default function DiagnosticoPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [data, setData] = useState<StartResponse | null>(null)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function start() {
    setPhase('loading')
    try {
      const { data } = await api.post<StartResponse>('/me/diagnostico/start')
      setData(data)
      setIdx(0)
      setAnswers({})
      setPhase('answering')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Não consegui iniciar o diagnóstico')
      setPhase('error')
    }
  }

  async function submit() {
    if (!data) return
    setPhase('submitting')
    try {
      const payload = {
        answers: data.questions.map((q) => ({
          questionId: q.id,
          selected: answers[q.id] ?? null,
        })),
      }
      const { data: res } = await api.post<SubmitResponse>('/me/diagnostico/submit', payload)
      setResult(res)
      setPhase('result')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao enviar respostas')
      setPhase('answering')
    }
  }

  function selectAnswer(qid: string, letra: string) {
    setAnswers((prev) => ({ ...prev, [qid]: letra }))
  }

  function next() {
    if (!data) return
    if (idx < data.questions.length - 1) {
      setIdx(idx + 1)
    } else {
      submit()
    }
  }
  function prev() {
    if (idx > 0) setIdx(idx - 1)
  }

  // ── INTRO ────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 text-white">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Diagnóstico inicial</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            20 questões em ~10 minutos pra mapear onde você está fraco no edital do seu
            <strong> curso principal</strong>. Seu cronograma vai nascer já priorizando o que mais precisa.
          </p>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" /> Como funciona
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>As 20 questões são distribuídas proporcionalmente ao <strong>peso de cada matéria</strong> no seu edital verticalizado.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Sem cronômetro, sem pressão de tempo. Responda com calma.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Pode pular pra frente e voltar pra trás antes de enviar.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Ao terminar, seu cronograma é recriado dando <strong>peso dobrado</strong> às matérias onde você acertou menos de 60%.</span>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/meus-cursos"
            className="rounded-xl border border-border bg-card hover:bg-muted py-3 text-sm font-bold text-center"
          >
            Voltar
          </Link>
          <button
            onClick={start}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Começar diagnóstico
          </button>
        </div>
      </div>
    )
  }

  // ── LOADING ──────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm text-muted-foreground">Selecionando suas 20 questões…</p>
      </div>
    )
  }

  // ── ERROR ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="max-w-md mx-auto card p-6 text-center space-y-3 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
        <h2 className="font-bold text-lg">Não consegui iniciar</h2>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Link href="/dashboard/meus-cursos" className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-semibold inline-block">
          Ir pra meus cursos
        </Link>
      </div>
    )
  }

  // ── SUBMITTING ───────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm text-muted-foreground">Calculando suas fraquezas e recriando cronograma…</p>
      </div>
    )
  }

  // ── RESULT ───────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const o = result.overview
    const sorted = [...result.porMateria].sort((a, b) => a.pct - b.pct)
    const fracas = sorted.filter((m) => m.nivel === 'fraco')
    const medias = sorted.filter((m) => m.nivel === 'medio')
    const fortes = sorted.filter((m) => m.nivel === 'forte')
    const materiaNomes = new Map(data?.materiasPlanejadas.map((m) => [m.subjectId, m.name]))

    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black">Diagnóstico pronto!</h1>
          <p className="text-sm text-muted-foreground">
            Você acertou <strong>{o.acertos} de {o.acertos + o.erros}</strong> ({o.taxaAcerto}%). Cronograma atualizado.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Acertos" value={o.acertos} color="text-green-600" />
          <Stat label="Erros" value={o.erros} color="text-red-500" />
          <Stat label="Em branco" value={o.brancos} color="text-muted-foreground" />
        </div>

        {fracas.length > 0 && (
          <Section title="🔴 Fraquezas — peso DOBRADO no cronograma" color="red">
            {fracas.map((m) => (
              <MateriaRow key={m.subjectId} nome={materiaNomes.get(m.subjectId) ?? '?'} pct={m.pct} total={m.total} correct={m.correct} />
            ))}
          </Section>
        )}
        {medias.length > 0 && (
          <Section title="🟡 Em desenvolvimento" color="yellow">
            {medias.map((m) => (
              <MateriaRow key={m.subjectId} nome={materiaNomes.get(m.subjectId) ?? '?'} pct={m.pct} total={m.total} correct={m.correct} />
            ))}
          </Section>
        )}
        {fortes.length > 0 && (
          <Section title="🟢 Mandando bem" color="green">
            {fortes.map((m) => (
              <MateriaRow key={m.subjectId} nome={materiaNomes.get(m.subjectId) ?? '?'} pct={m.pct} total={m.total} correct={m.correct} />
            ))}
          </Section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-border bg-card hover:bg-muted py-3 text-sm font-bold text-center"
          >
            Voltar pro dashboard
          </Link>
          <button
            onClick={() => router.push('/dashboard/cronograma')}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" /> Ver meu cronograma
          </button>
        </div>
      </div>
    )
  }

  // ── ANSWERING ────────────────────────────────────────────────────
  if (!data) return null
  const q = data.questions[idx]
  const total = data.questions.length
  const progresso = Math.round(((idx + 1) / total) * 100)
  const alts = Array.isArray(q.alternativas) ? q.alternativas : []
  const isCE = alts.length === 2 && alts.every((a) => a.letra === 'C' || a.letra === 'E')

  const respondidas = Object.values(answers).filter((v) => v != null).length

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-muted-foreground">
          Q{idx + 1} <span className="opacity-60">/ {total}</span>
        </div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Crown className="w-3 h-3 text-yellow-500" /> {data.course.name}
        </div>
      </div>

      {/* Progresso */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {q.bancaSlug && <span className="badge-blue uppercase">{q.bancaSlug}</span>}
          {q.ano && <span className="badge-purple">{q.ano}</span>}
        </div>

        <p className="text-foreground font-medium leading-relaxed whitespace-pre-wrap text-sm">
          {q.enunciado}
        </p>

        <div className="space-y-2">
          {alts.map((a) => {
            const selected = answers[q.id] === a.letra
            return (
              <button
                key={a.letra}
                onClick={() => selectAnswer(q.id, a.letra)}
                className={cn(
                  'w-full text-left rounded-xl border px-4 py-3 text-sm transition-all flex items-start gap-3',
                  selected
                    ? 'border-brand-500 bg-brand-500/10 text-foreground'
                    : 'border-border bg-card hover:bg-muted',
                )}
              >
                <span className={cn(
                  'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs',
                  selected ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground',
                )}>
                  {a.letra}
                </span>
                <span className="leading-relaxed">{isCE ? (a.letra === 'C' ? 'Certo' : 'Errado') : a.texto}</span>
              </button>
            )
          })}
        </div>

        <div className="text-[11px] text-muted-foreground text-center">
          {answers[q.id] == null ? 'Pode deixar em branco e pular' : '✓ resposta marcada'}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="rounded-xl border border-border bg-card hover:bg-muted px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="text-[11px] text-muted-foreground">
          {respondidas}/{total} respondidas
        </div>
        {idx < total - 1 ? (
          <button
            onClick={next}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            className="rounded-xl bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5"
          >
            <Target className="w-4 h-4" /> Finalizar
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={cn('text-2xl font-black tabular-nums', color)}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const bg = color === 'red'
    ? 'bg-red-50/40 dark:bg-red-900/15 border-red-200 dark:border-red-800/40'
    : color === 'yellow'
      ? 'bg-yellow-50/40 dark:bg-yellow-900/15 border-yellow-200 dark:border-yellow-800/40'
      : 'bg-green-50/40 dark:bg-green-900/15 border-green-200 dark:border-green-800/40'
  return (
    <div className={cn('card p-4 space-y-2 border', bg)}>
      <div className="text-xs font-bold">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function MateriaRow({ nome, pct, total, correct }: { nome: string; pct: number; total: number; correct: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-semibold truncate flex-1">{nome}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground tabular-nums">{correct}/{total}</span>
        <span className={cn(
          'font-bold tabular-nums w-10 text-right',
          pct >= 75 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500',
        )}>
          {pct}%
        </span>
      </div>
    </div>
  )
}
