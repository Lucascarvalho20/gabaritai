'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Target, Zap, Brain, Layers, Clock, CheckCircle2, Circle,
  X, Check, RefreshCw, Send, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabId = 'cronograma' | 'simulado' | 'flashcard' | 'mentor' | 'edital'

const TABS: Array<{ id: TabId; label: string; icon: typeof Calendar; sublabel: string }> = [
  { id: 'cronograma', label: 'Cronograma', icon: Calendar, sublabel: 'Plano do dia' },
  { id: 'simulado', label: 'Simulado', icon: Target, sublabel: 'Questão Cebraspe' },
  { id: 'flashcard', label: 'Flashcard', icon: Zap, sublabel: 'Repetição espaçada' },
  { id: 'mentor', label: 'Mentor', icon: Brain, sublabel: 'Tira dúvida' },
  { id: 'edital', label: 'Edital', icon: Layers, sublabel: 'Verticalizado' },
]

export function DemoExplorer() {
  const [tab, setTab] = useState<TabId>('cronograma')

  return (
    <section className="space-y-5">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 justify-center">
        {TABS.map(({ id, label, icon: Icon, sublabel }) => {
          const active = id === tab
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-4 py-3 rounded-xl text-left transition-all border',
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                  : 'border-border bg-card hover:border-brand-500/40',
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className={cn('w-4 h-4', active ? 'text-brand-600' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-bold', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">{sublabel}</div>
            </button>
          )
        })}
      </div>

      {/* Conteúdo do tab — animação ao trocar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'cronograma' && <CronogramaDemo />}
          {tab === 'simulado' && <SimuladoDemo />}
          {tab === 'flashcard' && <FlashcardDemo />}
          {tab === 'mentor' && <MentorDemo />}
          {tab === 'edital' && <EditalDemo />}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

// ─── 1. Cronograma ────────────────────────────────────────────────────────────

function CronogramaDemo() {
  const [tasks, setTasks] = useState([
    { id: 1, label: 'Direito Constitucional · Princípios Fundamentais', time: '45min', done: true },
    { id: 2, label: 'Português · Concordância verbal', time: '30min', done: true },
    { id: 3, label: 'Direito Penal · Crimes contra a pessoa', time: '1h', done: false },
    { id: 4, label: 'Mini-simulado · 20 questões mistas', time: '40min', done: false },
    { id: 5, label: 'Revisão SRS · 18 flashcards atrasados', time: '15min', done: false },
  ])

  const toggle = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const done = tasks.filter((t) => t.done).length
  const totalMin = tasks.reduce((acc, t) => {
    const m = parseTimeToMin(t.time)
    return acc + m
  }, 0)
  const doneMin = tasks.filter((t) => t.done).reduce((acc, t) => acc + parseTimeToMin(t.time), 0)
  const pct = Math.round((doneMin / totalMin) * 100)

  return (
    <div className="card p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Plano de hoje</div>
          <div className="text-lg font-bold">Quinta-feira · 27 mai</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">progresso</div>
          <div className="text-2xl font-bold tabular-nums bg-gradient-to-br from-brand-600 to-emerald-500 bg-clip-text text-transparent">
            {pct}%
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden mb-5">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => toggle(t.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
              t.done
                ? 'border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15'
                : 'border-border bg-background hover:border-brand-500/40 hover:-translate-y-0.5',
            )}
          >
            {t.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={cn(
                'flex-1 text-sm font-medium',
                t.done && 'line-through text-muted-foreground',
              )}
            >
              {t.label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{t.time}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between pt-4 border-t border-border text-xs">
        <span className="text-muted-foreground">
          {done} de {tasks.length} feitas · {doneMin}min de {totalMin}min
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Simulado domingo · 09h
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 text-center italic">
        💡 Clique nas tarefas pra marcar como feitas. No produto real, isso vira histórico que o algoritmo
        usa pra ajustar a próxima semana.
      </p>
    </div>
  )
}

function parseTimeToMin(s: string): number {
  if (s.includes('h')) {
    const [h, m] = s.split('h')
    return parseInt(h, 10) * 60 + (m ? parseInt(m, 10) : 0)
  }
  return parseInt(s, 10) || 0
}

// ─── 2. Simulado Cebraspe ─────────────────────────────────────────────────────

function SimuladoDemo() {
  const [secs, setSecs] = useState(90)
  const [answer, setAnswer] = useState<'C' | 'E' | null>(null)
  const [feedback, setFeedback] = useState<null | { correct: boolean; correctAnswer: 'C' | 'E'; rationale: string }>(null)

  useEffect(() => {
    if (feedback) return
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [feedback])

  const enunciado = 'Os direitos e garantias fundamentais previstos na Constituição Federal de 1988 são taxativos, ou seja, não admitem o reconhecimento de outros direitos decorrentes do regime e dos princípios por ela adotados.'

  function responder(a: 'C' | 'E') {
    setAnswer(a)
    setFeedback({
      correct: a === 'E',
      correctAnswer: 'E',
      rationale: 'O §2º do art. 5º da CF/88 estabelece que os direitos e garantias fundamentais não excluem outros decorrentes do regime e dos princípios adotados pela Constituição. Portanto, NÃO são taxativos — admitem outros direitos (rol exemplificativo).',
    })
  }

  function reset() {
    setAnswer(null)
    setFeedback(null)
    setSecs(90)
  }

  const min = Math.floor(secs / 60)
  const ss = secs % 60

  return (
    <div className="card p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div>
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Cebraspe · Cebraspe</div>
          <div className="text-sm font-bold">Questão 14 de 120</div>
        </div>
        <div className={cn(
          'text-2xl font-bold tabular-nums px-3 py-1 rounded-lg',
          secs < 30 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20',
        )}>
          {min}:{ss.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Direito Constitucional · Direitos Fundamentais
      </div>

      <p className="text-base leading-relaxed mb-6">
        {enunciado}
      </p>

      {!feedback ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => responder('C')}
            className="px-5 py-4 rounded-xl border-2 border-border hover:border-brand-500 bg-card hover:bg-brand-50 dark:hover:bg-brand-900/20 font-bold transition-all"
          >
            <Check className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            CERTO
          </button>
          <button
            type="button"
            onClick={() => responder('E')}
            className="px-5 py-4 rounded-xl border-2 border-border hover:border-brand-500 bg-card hover:bg-brand-50 dark:hover:bg-brand-900/20 font-bold transition-all"
          >
            <X className="w-5 h-5 mx-auto mb-1 text-red-500" />
            ERRADO
          </button>
        </div>
      ) : (
        <div className={cn(
          'rounded-xl p-4 border-2 space-y-2',
          feedback.correct
            ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/15'
            : 'border-red-300 bg-red-50/60 dark:bg-red-900/15',
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              'font-bold text-sm',
              feedback.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
            )}>
              {feedback.correct ? '✓ Acertou!' : '✗ Errou.'} Gabarito: <strong>{feedback.correctAnswer}</strong>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Tentar de novo
            </button>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
            <strong className="text-foreground">Por quê:</strong> {feedback.rationale}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Penalização: <strong className="text-red-600">1 errada anula 1 certa</strong></span>
        <span>+1 ponto se acertar</span>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 text-center italic">
        💡 Questão real de prova anterior, no formato exato Cebraspe. No produto, são milhares delas
        + simulados completos cronometrados.
      </p>
    </div>
  )
}

// ─── 3. Flashcard com SM-2 ────────────────────────────────────────────────────

const FLASHCARDS = [
  {
    frente: 'Princípio da Anterioridade Tributária',
    verso: 'Nenhum tributo pode ser cobrado no MESMO exercício financeiro em que foi publicada a lei que o instituiu ou aumentou (art. 150, III, b, CF). Exceções: II, IE, IPI, IOF, empréstimo compulsório de guerra.',
    tag: 'Direito Tributário',
  },
  {
    frente: 'Aplicação da lei penal no tempo (favor rei)',
    verso: 'A lei penal não retroage, salvo para beneficiar o réu (art. 5º, XL, CF). Lei nova mais benéfica retroage; lei nova mais gravosa NÃO retroage.',
    tag: 'Direito Penal',
  },
  {
    frente: 'Princípio da Reserva de Plenário',
    verso: 'Tribunais só podem declarar a inconstitucionalidade de lei pelo voto da MAIORIA ABSOLUTA de seus membros ou do órgão especial (art. 97, CF). Conhecida como cláusula full bench.',
    tag: 'Direito Constitucional',
  },
]

function FlashcardDemo() {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [nextInDays, setNextInDays] = useState<number | null>(null)

  const card = FLASHCARDS[idx]

  function rate(q: 0 | 3 | 4 | 5) {
    // simulação SM-2 simplificada — só pra UX demonstrativo
    const days = q === 0 ? 1 : q === 3 ? 3 : q === 4 ? 7 : 14
    setNextInDays(days)
  }

  function next() {
    setIdx((i) => (i + 1) % FLASHCARDS.length)
    setRevealed(false)
    setNextInDays(null)
  }

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {card.tag}
          </div>
          <div className="text-xs text-muted-foreground">Card {idx + 1} de {FLASHCARDS.length} · revisão de hoje</div>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          SM-2
        </div>
      </div>

      <motion.div
        key={`${idx}-${revealed}`}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: revealed ? 360 : 0 }}
        transition={{ duration: 0.4 }}
        className="min-h-[180px] flex items-center justify-center rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-emerald-500/5 p-6 text-center"
      >
        <div>
          {!revealed ? (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Frente</div>
              <p className="text-xl font-bold">{card.frente}</p>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">Verso</div>
              <p className="text-sm leading-relaxed text-foreground">{card.verso}</p>
            </>
          )}
        </div>
      </motion.div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
        >
          Mostrar resposta
        </button>
      ) : nextInDays === null ? (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-2 mt-4">
            Quão bem você lembrava?
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => rate(0)} className="py-2.5 rounded-lg border-2 border-red-300 dark:border-red-700/60 bg-red-50/60 dark:bg-red-900/15 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              Errei
            </button>
            <button onClick={() => rate(3)} className="py-2.5 rounded-lg border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              Difícil
            </button>
            <button onClick={() => rate(4)} className="py-2.5 rounded-lg border-2 border-brand-300 dark:border-brand-700/60 bg-brand-50/60 dark:bg-brand-900/15 text-brand-700 dark:text-brand-300 text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
              Bom
            </button>
            <button onClick={() => rate(5)} className="py-2.5 rounded-lg border-2 border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              Fácil
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-300/60 text-center space-y-2">
          <div className="text-sm">
            <strong className="text-emerald-700 dark:text-emerald-300">Anotado.</strong> Esse card volta em{' '}
            <strong className="text-foreground">{nextInDays} {nextInDays === 1 ? 'dia' : 'dias'}</strong>.
          </div>
          <button
            type="button"
            onClick={next}
            className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            <ArrowIcon /> Próximo card
          </button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
        💡 Algoritmo SuperMemo SM-2: cada nota define quando o card volta. Quanto mais difícil, mais cedo.
      </p>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ─── 4. Mentor ────────────────────────────────────────────────────────────────

const MENTOR_QUESTIONS = [
  {
    q: 'Como devo estudar Direito Constitucional pra Cebraspe?',
    a: 'Pra Cebraspe (PMDF, PF, PCDF), Direito Constitucional vale ~20-25% da prova. Foco em 3 frentes:\n\n1. **Direitos Fundamentais (art. 5º)** — decora a literalidade, cai muito\n2. **Organização do Estado** — competências da União, Estados, Municípios\n3. **Controle de Constitucionalidade** — ADI, ADO, ADC\n\nCebraspe ama trocar palavras: "exclusivamente", "somente", "sempre". Cada item você lê 2 vezes. Não chute — 1 errada anula 1 certa.\n\nNo seu cronograma, vou puxar 4h/semana de Constitucional nas próximas 6 semanas.',
  },
  {
    q: 'Estou errando muitas questões de Direito Penal. O que faço?',
    a: 'Olhei seu histórico: 47% de acerto em Penal, contra 72% nas outras matérias. Os erros se concentram em:\n\n- **Iter criminis** (consumação, tentativa) — 8 erros\n- **Aplicação da lei penal no tempo** — 5 erros\n\nProposta de ataque:\n1. Hoje vou puxar 6 flashcards de Penal pra revisão imediata\n2. Próxima semana, troco a aula nova de Penal por **revisão estruturada** desses 2 tópicos\n3. Sexta marco um mini-simulado só de Penal (20 questões) pra medir\n\nSe não melhorar pra 65%+ em 2 semanas, te aviso pra reavaliar a estratégia.',
  },
  {
    q: 'Falta 1 semana pra prova. O que estudar nesses dias?',
    a: 'Semana de prova NÃO é semana de conteúdo novo. Plano:\n\n**Seg-Qua**: revisão SRS intensa. Vou puxar todos os flashcards atrasados (98 cards). Foca neles.\n\n**Quinta**: simulado completo cronometrado, no formato exato da banca. Depois, análise dos erros (sem refazer agora — só identificar).\n\n**Sexta-Sábado**: revisão LEVE dos pontos errados na quinta. Dorme cedo.\n\n**Domingo de prova**: nada. Levanta cedo, café reforçado, chega 1h antes no local. Confia no que treinou.\n\nVou colocar tudo isso no seu calendário automaticamente.',
  },
]

function MentorDemo() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="card p-0 max-w-2xl mx-auto overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-bold">Mentor Gabaritai</div>
          <div className="text-[10px] text-muted-foreground">Online · conhece seu edital e progresso</div>
        </div>
      </div>

      {/* Conversação */}
      <div className="px-5 py-5 space-y-3 min-h-[320px] bg-background">
        {selected === null ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 text-brand-500/50" />
            <p>Escolha uma pergunta abaixo pra ver como o mentor responde.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-brand-500 text-white text-sm max-w-[85%]">
                {MENTOR_QUESTIONS[selected].q}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-muted text-sm whitespace-pre-line leading-relaxed max-w-[90%]">
                {MENTOR_QUESTIONS[selected].a.split('**').map((chunk, i) =>
                  i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{chunk}</strong> : <span key={i}>{chunk}</span>,
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Quick replies */}
      <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {selected === null ? 'Perguntas pra começar:' : 'Outra pergunta:'}
        </div>
        <div className="space-y-1.5">
          {MENTOR_QUESTIONS.map((mq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all',
                selected === i
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15 text-brand-700 dark:text-brand-300'
                  : 'border-border bg-card hover:border-brand-500/40',
              )}
            >
              {mq.q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <input
            disabled
            placeholder="No demo, perguntas livres não respondem — entre no trial pra usar."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground italic"
          />
          <button disabled className="px-3 py-2 rounded-lg bg-muted text-muted-foreground">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground p-3 text-center italic border-t border-border">
        💡 No produto, o mentor sabe seu edital, seus erros, seu ritmo. Resposta personalizada, não genérica.
      </p>
    </div>
  )
}

// ─── 5. Edital verticalizado ──────────────────────────────────────────────────

const MATERIAS = [
  { nome: 'Direito Constitucional', peso: 25, questoes: 30, acerto: 78 },
  { nome: 'Direito Penal', peso: 20, questoes: 24, acerto: 47 },
  { nome: 'Direito Administrativo', peso: 15, questoes: 18, acerto: 65 },
  { nome: 'Língua Portuguesa', peso: 15, questoes: 18, acerto: 72 },
  { nome: 'Raciocínio Lógico', peso: 10, questoes: 12, acerto: 58 },
  { nome: 'Direito Processual Penal', peso: 10, questoes: 12, acerto: 80 },
  { nome: 'Informática', peso: 5, questoes: 6, acerto: 89 },
]

function EditalDemo() {
  return (
    <div className="card p-6 max-w-3xl mx-auto">
      <div className="mb-4 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            PMDF Soldado · 2026
          </div>
          <div className="text-lg font-bold">Edital verticalizado</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">média geral</div>
          <div className="text-2xl font-bold tabular-nums bg-gradient-to-br from-brand-600 to-emerald-500 bg-clip-text text-transparent">
            68%
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {MATERIAS.map((m) => {
          const acertoColor =
            m.acerto >= 70
              ? 'bg-emerald-500'
              : m.acerto >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
          const acertoTextColor =
            m.acerto >= 70
              ? 'text-emerald-700 dark:text-emerald-400'
              : m.acerto >= 50
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-red-700 dark:text-red-400'
          return (
            <div key={m.nome} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{m.nome}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Peso {m.peso}% · {m.questoes} questões na prova
                  </span>
                </div>
                <div className={cn('text-sm font-bold tabular-nums shrink-0', acertoTextColor)}>
                  {m.acerto}%
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <motion.div
                  className={cn('h-full', acertoColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${m.acerto}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dominado</div>
          <div className="text-xl font-bold text-emerald-600">3</div>
          <div className="text-[10px] text-muted-foreground">≥ 70%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Em progresso</div>
          <div className="text-xl font-bold text-amber-600">3</div>
          <div className="text-[10px] text-muted-foreground">50-70%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Frágil</div>
          <div className="text-xl font-bold text-red-600">1</div>
          <div className="text-[10px] text-muted-foreground">&lt; 50%</div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
        💡 No produto, isso atualiza em tempo real. Quanto mais simulado você faz, mais preciso fica o
        diagnóstico — e o cronograma puxa mais horas pras matérias fracas automaticamente.
      </p>
    </div>
  )
}
