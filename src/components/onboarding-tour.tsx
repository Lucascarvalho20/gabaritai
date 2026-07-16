'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Calendar, Target, Sparkles, ArrowRight, Check, Clock, ListChecks } from 'lucide-react'
import { api } from '@/lib/api'

type Step = {
  icon: any
  title: string
  description: string
}

// Walkthrough puramente informativo (NÃO navega no meio — antes o overlay
// ficava por cima da página). Ensina o fluxo real de uso e é consciente do
// plano gratuito (recursos pagos aparecem como "no plano pago").
const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao GabaritAI! 👋',
    description: 'Em 1 minuto te mostro como usar a plataforma pra organizar seus estudos e ir com tudo pro seu concurso.',
  },
  {
    icon: Calendar,
    title: '1. Monte seu cronograma',
    description: 'Em "Meus Cursos" você escolhe o concurso; no "Cronograma", a IA distribui as matérias por dia até a data da prova. É o coração da plataforma — e é grátis pra sempre.',
  },
  {
    icon: ListChecks,
    title: '2. Estude e marque o que já viu',
    description: 'Abra cada tópico do edital, estude e clique em "Marcar como estudado". Seu progresso e o "quanto falta pra concluir" atualizam sozinhos.',
  },
  {
    icon: Clock,
    title: '3. Cronometre seu tempo',
    description: 'Use "Meu tempo" pra cronometrar o estudo. Cria hábito e mostra sua evolução real semana a semana.',
  },
  {
    icon: Target,
    title: '4. Treine e evolua',
    description: 'Questões, simulados no formato da banca, flashcards e o Mentor IA turbinam a preparação. No plano gratuito eles aparecem com 🔒 — quando quiser, é só assinar pra desbloquear.',
  },
]

export function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Abre automático só pra quem ainda não concluiu
    api.get('/users/tutorial').then(({ data }) => {
      if (!data.tutorialCompleted) {
        setStep(data.tutorialStep ?? 0)
        setTimeout(() => setOpen(true), 600)
      }
    }).catch(() => {})

    // Permite REABRIR o tutorial a qualquer momento (botão "Como usar a plataforma")
    const reopen = () => { setStep(0); setOpen(true) }
    window.addEventListener('gabaritai:open-tour', reopen)
    return () => window.removeEventListener('gabaritai:open-tour', reopen)
  }, [])

  function next() {
    const newStep = step + 1
    if (newStep >= STEPS.length) {
      complete()
    } else {
      setStep(newStep)
      api.patch('/users/tutorial', { tutorialStep: newStep }).catch(() => {})
    }
  }

  function skip() {
    setOpen(false)
    api.patch('/users/tutorial', { tutorialCompleted: true }).catch(() => {})
  }

  function complete() {
    setOpen(false)
    api.patch('/users/tutorial', { tutorialCompleted: true, tutorialStep: STEPS.length }).catch(() => {})
  }

  if (!open) return null

  const s = STEPS[step]
  const Icon = s.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
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

        <div className="flex items-center gap-2">
          {isLast ? (
            <Link
              href="/dashboard/comecar"
              onClick={complete}
              className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold text-center hover:bg-brand-600 inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Montar meu cronograma
            </Link>
          ) : (
            <button
              onClick={next}
              className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold hover:bg-brand-600 inline-flex items-center justify-center gap-1.5"
            >
              Próximo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground px-3">
            {isLast ? 'Fechar' : 'Pular'}
          </button>
        </div>
      </div>
    </div>
  )
}
