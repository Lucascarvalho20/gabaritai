'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2, Target, Clock, Brain, Calendar } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const CONCURSOS = [
  { id: 'pmdf', label: 'PMDF', icon: '🛡️' },
  { id: 'pf', label: 'Polícia Federal', icon: '🔵' },
  { id: 'pcdf', label: 'Polícia Civil-DF', icon: '🔍' },
  { id: 'prf', label: 'PRF', icon: '🚔' },
  { id: 'pol-leg', label: 'Polícia Legislativa', icon: '🏛️' },
  { id: 'bb', label: 'Banco do Brasil', icon: '🏦' },
  { id: 'cef', label: 'Caixa Econômica', icon: '💛' },
  { id: 'tjdft', label: 'TJDFT', icon: '⚖️' },
  { id: 'cnu', label: 'CNU (Unificado)', icon: '🇧🇷' },
  { id: 'outro', label: 'Outro', icon: '📋' },
]

const NIVEIS = [
  { id: 'zero', label: 'Estou começando do zero', desc: 'Nunca estudei para concurso' },
  { id: 'basico', label: 'Conheço o básico', desc: 'Já estudei um pouco mas sou iniciante' },
  { id: 'intermediario', label: 'Nível intermediário', desc: 'Já fiz provas antes, sei meus pontos fracos' },
  { id: 'avancado', label: 'Nível avançado', desc: 'Estou na reta final / já fiz muitas provas' },
]

const HORAS = ['1', '2', '3', '4', '5', '6', '7', '8+']

const schema = z.object({
  concursoId: z.string().min(1, 'Selecione um concurso'),
  nivel: z.string().min(1, 'Selecione seu nível'),
  horasDia: z.string().min(1, 'Selecione as horas disponíveis'),
  dataProva: z.string().optional(),
  meta: z.string().min(5, 'Escreva sua meta').max(200),
})
type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const [step, setStep] = useState(0)
  const TOTAL = 4

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { meta: '' },
  })

  const watched = watch()

  async function onSubmit(data: FormData) {
    try {
      await api.post('/users/onboarding', data)
      toast.success('Plano de estudos criado! A IA já está te esperando 🚀')
      router.push('/dashboard')
    } catch {
      toast.error('Erro ao salvar configurações. Tente novamente.')
    }
  }

  const steps = [
    {
      title: 'Qual concurso você quer passar?',
      subtitle: 'Selecione seu concurso alvo principal',
      icon: Target,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CONCURSOS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setValue('concursoId', c.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                watched.concursoId === c.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-border hover:border-brand-300 hover:bg-muted'
              )}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-sm font-semibold leading-tight">{c.label}</span>
              {watched.concursoId === c.id && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
            </button>
          ))}
        </div>
      ),
      valid: !!watched.concursoId,
    },
    {
      title: 'Qual é o seu nível atual?',
      subtitle: 'Isso ajuda a IA a calibrar o plano inicial',
      icon: Brain,
      content: (
        <div className="space-y-3">
          {NIVEIS.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => setValue('nivel', n.id)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                watched.nivel === n.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-border hover:border-brand-300 hover:bg-muted'
              )}
            >
              <div className={cn('w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors', watched.nivel === n.id ? 'border-brand-500 bg-brand-500' : 'border-muted-foreground')}>
                {watched.nivel === n.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{n.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
              </div>
            </button>
          ))}
        </div>
      ),
      valid: !!watched.nivel,
    },
    {
      title: 'Quanto tempo você tem por dia?',
      subtitle: 'A IA vai calcular se é viável fechar o edital no prazo',
      icon: Clock,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {HORAS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setValue('horasDia', h)}
                className={cn(
                  'py-4 rounded-2xl border-2 font-bold text-lg transition-all',
                  watched.horasDia === h
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'border-border hover:border-brand-300 hover:bg-muted'
                )}
              >
                {h}h
              </button>
            ))}
          </div>
          <div>
            <label className="label">Data da prova (opcional)</label>
            <input type="date" className="input" {...register('dataProva')} />
            <p className="text-xs text-muted-foreground mt-1">Se souber a data, a IA vai criar um cronograma mais preciso</p>
          </div>
        </div>
      ),
      valid: !!watched.horasDia,
    },
    {
      title: 'Qual é a sua meta?',
      subtitle: 'Escreva com suas palavras. A IA vai usar isso para te motivar nos momentos difíceis.',
      icon: Target,
      content: (
        <div className="space-y-4">
          <textarea
            className="input min-h-32 resize-none"
            placeholder="Ex: Quero ser aprovado no PMDF para ter estabilidade e segurança para minha família. É meu sonho desde criança e vou me dedicar ao máximo para conquistar isso."
            {...register('meta')}
          />
          {errors.meta && <p className="text-danger-500 text-xs">{errors.meta.message}</p>}
          <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
            <p className="text-sm text-brand-700 dark:text-brand-300">
              💡 <strong>Dica:</strong> Alunos que escrevem metas específicas têm 3x mais chances de manter a consistência nos estudos.
            </p>
          </div>
        </div>
      ),
      valid: (watched.meta?.length ?? 0) >= 5,
    },
  ]

  const currentStep = steps[step]
  const Icon = currentStep.icon

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground font-medium">Passo {step + 1} de {TOTAL}</div>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i <= step ? 'bg-brand-500 w-8' : 'bg-muted w-4')} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{currentStep.title}</h1>
            <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-8">{currentStep.content}</div>

        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)} className="btn-ghost btn-lg flex-1">
              <ChevronLeft className="w-5 h-5" /> Voltar
            </button>
          )}
          {step < TOTAL - 1 ? (
            <button
              type="button"
              disabled={!currentStep.valid}
              onClick={() => setStep(s => s + 1)}
              className="btn-primary btn-lg flex-1"
            >
              Continuar <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting || !currentStep.valid} className="btn-primary btn-lg flex-1">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isSubmitting ? 'Gerando plano...' : 'Criar meu plano de estudos'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
