'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Brain, Play } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const CRONOGRAMA_SEMANA = [
  {
    dia: 'Seg', data: '06/01', ativo: false,
    tarefas: [
      { tipo: 'Teoria', materia: 'Dir. Constitucional', topico: 'Art. 5º I-X', tempo: 45, done: true },
      { tipo: 'Questões', materia: 'Dir. Constitucional', topico: '20 questões', tempo: 30, done: true },
      { tipo: 'Flashcards', materia: 'Revisão geral', topico: '15 cards', tempo: 15, done: true },
    ]
  },
  {
    dia: 'Ter', data: '07/01', ativo: false,
    tarefas: [
      { tipo: 'Teoria', materia: 'Direito Penal', topico: 'Tipicidade e Antijuridicidade', tempo: 50, done: true },
      { tipo: 'Questões', materia: 'Direito Penal', topico: '25 questões', tempo: 35, done: false },
    ]
  },
  {
    dia: 'Qua', data: '08/01', ativo: true,
    tarefas: [
      { tipo: 'Teoria', materia: 'Dir. Administrativo', topico: 'Atos Administrativos', tempo: 45, done: false },
      { tipo: 'Questões', materia: 'Dir. Administrativo', topico: '20 questões', tempo: 30, done: false },
      { tipo: 'Flashcards', materia: 'Dir. Penal (revisão)', topico: '20 cards', tempo: 15, done: false },
      { tipo: 'Simulado', materia: 'Módulo 3', topico: 'estilo CESPE', tempo: 90, done: false },
    ]
  },
  {
    dia: 'Qui', data: '09/01', ativo: false,
    tarefas: [
      { tipo: 'Teoria', materia: 'Conhec. Policiais', topico: 'Lei 12.830/2013', tempo: 40, done: false },
      { tipo: 'Questões', materia: 'Conhec. Policiais', topico: '30 questões', tempo: 40, done: false },
    ]
  },
  {
    dia: 'Sex', data: '10/01', ativo: false,
    tarefas: [
      { tipo: 'Teoria', materia: 'Matemática', topico: 'Juros e Porcentagem', tempo: 45, done: false },
      { tipo: 'Questões', materia: 'Matemática', topico: '25 questões', tempo: 35, done: false },
      { tipo: 'Flashcards', materia: 'Revisão semanal', topico: '30 cards', tempo: 20, done: false },
    ]
  },
  {
    dia: 'Sáb', data: '11/01', ativo: false,
    tarefas: [
      { tipo: 'Simulado', materia: 'Simulado completo', topico: '80 questões', tempo: 120, done: false },
      { tipo: 'Revisão', materia: 'Análise do simulado', topico: 'Correção com IA', tempo: 30, done: false },
    ]
  },
  {
    dia: 'Dom', data: '12/01', ativo: false,
    tarefas: [
      { tipo: 'Flashcards', materia: 'Revisão quinzenal', topico: '50 cards acumulados', tempo: 30, done: false },
    ]
  },
]

const TIPO_COLOR: Record<string, string> = {
  Teoria: 'badge-blue',
  Questões: 'badge-purple',
  Flashcards: 'badge-yellow',
  Simulado: 'badge-red',
  Revisão: 'badge-green',
}

const TIPO_HREF: Record<string, string> = {
  Teoria: '/dashboard/questoes',
  Questões: '/dashboard/questoes',
  Flashcards: '/dashboard/flashcards',
  Simulado: '/dashboard/simulados',
  Revisão: '/dashboard/progresso',
}

const DIAS_NOME: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' }

export default function CronogramaPage() {
  const user = useAuthStore(s => s.user)
  const [diaAtivo, setDiaAtivo] = useState(2)
  const [configCronograma, setConfigCronograma] = useState({ horas_dia: 4, dias_semana: [1, 2, 3, 4, 5] })

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_cronograma_config')
    if (saved) {
      try { setConfigCronograma(JSON.parse(saved)) } catch {}
    }
  }, [])

  const dia = CRONOGRAMA_SEMANA[diaAtivo]
  const concluidas = dia.tarefas.filter(t => t.done).length
  const total = dia.tarefas.length
  const tempoTotal = dia.tarefas.reduce((acc, t) => acc + t.tempo, 0)

  const diasLabel = configCronograma.dias_semana.length > 0
    ? configCronograma.dias_semana.map(d => DIAS_NOME[d]).filter(Boolean).join(', ')
    : 'Seg a Sex'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Cronograma</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Semana de 06 a 12 de Janeiro</p>
        </div>
        <div className="badge-blue text-sm py-1 px-3">
          <Brain className="w-3.5 h-3.5 mr-1.5" />
          Plano gerado pela IA
        </div>
      </div>

      {/* Viabilidade do edital */}
      <div className="card p-4 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border-brand-200 dark:border-brand-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground text-sm">Análise de viabilidade — {user?.concursoAlvo ?? 'Seu Concurso'}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Com <strong>{configCronograma.horas_dia}h/dia</strong> ({diasLabel}) você conclui o edital em <strong>87 dias</strong> e ainda tem <strong>23 dias para revisar</strong> antes da prova.
            </p>
          </div>
          <div className="shrink-0">
            <span className="badge-green text-sm py-1.5 px-3">No prazo ✓</span>
          </div>
        </div>
      </div>

      {/* Seletor de dias */}
      <div className="grid grid-cols-7 gap-1.5">
        {CRONOGRAMA_SEMANA.map((d, i) => (
          <button
            key={d.dia}
            onClick={() => setDiaAtivo(i)}
            className={cn(
              'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm',
              i === diaAtivo
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                : d.ativo
                ? 'border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                : 'border-border hover:border-brand-300 hover:bg-muted'
            )}
          >
            <span className={cn('font-semibold text-xs', i === diaAtivo ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground')}>{d.dia}</span>
            <span className={cn('text-xs', i === diaAtivo ? 'text-brand-700 dark:text-brand-300 font-medium' : 'text-muted-foreground')}>{d.data}</span>
            <div className="flex gap-0.5">
              {d.tarefas.map((t, j) => (
                <div key={j} className={cn('w-1.5 h-1.5 rounded-full', t.done ? 'bg-success-500' : i === diaAtivo ? 'bg-brand-300' : 'bg-muted-foreground/30')} />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Tarefas do dia selecionado */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">
              {dia.dia}{dia.ativo ? ' — Hoje' : ''} • {dia.data}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {concluidas}/{total} tarefas • {Math.floor(tempoTotal / 60)}h{tempoTotal % 60 > 0 ? `${tempoTotal % 60}min` : ''} no total
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-foreground">{total > 0 ? Math.round((concluidas / total) * 100) : 0}%</div>
            <div className="text-xs text-muted-foreground">concluído</div>
          </div>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-5">
          <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? (concluidas / total) * 100 : 0}%` }} />
        </div>

        <div className="space-y-3">
          {dia.tarefas.map((t, i) => (
            <Link key={i} href={TIPO_HREF[t.tipo] || '/dashboard'}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm group',
                t.done
                  ? 'border-success-200 bg-success-50/50 dark:border-success-800/30 dark:bg-success-900/10'
                  : 'border-border hover:border-brand-200 dark:hover:border-brand-700'
              )}
            >
              <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                t.done ? 'border-success-500 bg-success-500' : 'border-muted-foreground')}>
                {t.done && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`${TIPO_COLOR[t.tipo]} text-xs`}>{t.tipo}</span>
                  <span className="text-xs text-muted-foreground">{t.materia}</span>
                </div>
                <div className={cn('text-sm font-medium', t.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {t.topico}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{t.tempo}min
                </div>
                {!t.done && (
                  <Play className="w-4 h-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
