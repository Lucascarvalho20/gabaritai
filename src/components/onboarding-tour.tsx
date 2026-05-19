'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Calendar, Target, Brain, Zap, Sparkles, ArrowRight, Check } from 'lucide-react'
import { api } from '@/lib/api'

type Step = {
  icon: any
  title: string
  description: string
  cta?: { label: string; href: string }
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Gabaritai! 👋',
    description: 'Sua plataforma de mentoria com IA pra concursos militares e policiais. Vamos te mostrar o essencial em 5 passos.',
  },
  {
    icon: Calendar,
    title: '1. Crie seu cronograma',
    description: 'Escolha o concurso, define horas/dia e data da prova. Nossa IA gera um cronograma diário automático com intercalação por matéria e revisões espaçadas.',
    cta: { label: 'Criar cronograma', href: '/dashboard/cronograma' },
  },
  {
    icon: Target,
    title: '2. Faça um mini-simulado',
    description: 'Treino rápido (15-20 questões) por matéria do seu curso. Você recebe nota, comentários e a IA atualiza seu desempenho automaticamente.',
    cta: { label: 'Ir aos simulados', href: '/dashboard/simulados' },
  },
  {
    icon: Brain,
    title: '3. Converse com o Mentor IA',
    description: 'Tire dúvidas, peça dicas, peça um resumo. O mentor conhece seu curso e seu progresso.',
    cta: { label: 'Abrir Mentor', href: '/dashboard/mentor' },
  },
  {
    icon: Zap,
    title: '4. Revise com flashcards',
    description: 'Sistema de repetição espaçada (SRS) baseado em ciência: você vê os cards no momento certo pra memorizar de verdade.',
    cta: { label: 'Ver flashcards', href: '/dashboard/flashcards' },
  },
]

export function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    api.get('/users/tutorial').then(({ data }) => {
      if (!data.tutorialCompleted) {
        setStep(data.tutorialStep ?? 0)
        // Pequeno delay pra UI carregar antes do overlay
        setTimeout(() => setOpen(true), 600)
      }
    }).catch(() => {})
  }, [])

  async function next() {
    const newStep = step + 1
    if (newStep >= STEPS.length) {
      await complete()
    } else {
      setStep(newStep)
      api.patch('/users/tutorial', { tutorialStep: newStep }).catch(() => {})
    }
  }

  async function skip() {
    setOpen(false)
    api.patch('/users/tutorial', { tutorialCompleted: true }).catch(() => {})
  }

  async function complete() {
    setOpen(false)
    api.patch('/users/tutorial', { tutorialCompleted: true, tutorialStep: STEPS.length }).catch(() => {})
  }

  if (!open) return null

  const s = STEPS[step]
  const Icon = s.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="card max-w-md w-full p-6 space-y-5 relative">
        <button onClick={skip} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg">{s.title}</h2>
            <div className="text-[10px] text-muted-foreground">Passo {step + 1} de {STEPS.length}</div>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed">{s.description}</p>

        {/* Progresso visual */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-brand-500' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.cta && (
            <Link
              href={s.cta.href}
              onClick={() => { next() }}
              className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold text-center hover:bg-brand-600 inline-flex items-center justify-center gap-1.5"
            >
              {s.cta.label} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {!s.cta && (
            <button
              onClick={next}
              className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold hover:bg-brand-600 inline-flex items-center justify-center gap-1.5"
            >
              {isLast ? <><Check className="w-3 h-3" /> Concluir</> : <>Próximo <ArrowRight className="w-3 h-3" /></>}
            </button>
          )}
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground px-3">
            Pular tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
