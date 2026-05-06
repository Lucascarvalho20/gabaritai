'use client'

import { useState } from 'react'
import { Target, Clock, Trophy, Play, BarChart3, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export default function SimuladosPage() {
  const user = useAuthStore(s => s.user)
  const concursoLabel = user?.concursoAlvo ?? 'Concurso'

  const SIMULADOS_DISPONIVEIS = [
    { id: 1, titulo: `Simulado ${concursoLabel} — Módulo 1`, questoes: 30, tempo: 45, materia: 'Dir. Constitucional + Penal', dificuldade: 'Médio', novo: false },
    { id: 2, titulo: `Simulado ${concursoLabel} — Módulo 2`, questoes: 40, tempo: 60, materia: 'Dir. Administrativo + Português', dificuldade: 'Médio', novo: false },
    { id: 3, titulo: `Simulado ${concursoLabel} — Módulo 3`, questoes: 50, tempo: 75, materia: 'Todos os conteúdos', dificuldade: 'Difícil', novo: true },
    { id: 4, titulo: 'Simulado Adaptativo — Pontos Fracos', questoes: 25, tempo: 35, materia: 'Gerado pela IA com seus erros', dificuldade: 'Personalizado', novo: true },
  ]

  const HISTORICO = [
    { titulo: `Simulado ${concursoLabel} — Módulo 2`, data: '05/01', acerto: 72, tempo: '58min', questoes: 40 },
    { titulo: `Simulado ${concursoLabel} — Módulo 1`, data: '29/12', acerto: 65, tempo: '44min', questoes: 30 },
    { titulo: 'Simulado Adaptativo', data: '22/12', acerto: 58, tempo: '32min', questoes: 25 },
  ]

  const [aba, setAba] = useState<'disponiveis' | 'historico'>('disponiveis')

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Simulados</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Simulados adaptativos no estilo da sua banca</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {[['disponiveis', 'Disponíveis'], ['historico', 'Histórico']].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v as any)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', aba === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {l}
          </button>
        ))}
      </div>

      {aba === 'disponiveis' ? (
        <div className="space-y-3">
          {SIMULADOS_DISPONIVEIS.map(s => (
            <div key={s.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground">{s.titulo}</h3>
                    {s.novo && <span className="badge-green text-xs">Novo</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{s.materia}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{s.questoes} questões</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.tempo} minutos</span>
                    <span className={cn('badge text-xs', s.dificuldade === 'Difícil' ? 'badge-red' : s.dificuldade === 'Personalizado' ? 'badge-blue' : 'badge-yellow')}>{s.dificuldade}</span>
                  </div>
                </div>
                <button className="btn-primary btn-md shrink-0">
                  <Play className="w-4 h-4" /> Iniciar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {HISTORICO.map((h, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-foreground mb-1">{h.titulo}</div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{h.data}</span>
                    <span><Clock className="w-3 h-3 inline mr-0.5" />{h.tempo}</span>
                    <span><Target className="w-3 h-3 inline mr-0.5" />{h.questoes} questões</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn('text-2xl font-black', h.acerto >= 75 ? 'text-success-600' : h.acerto >= 60 ? 'text-warning-500' : 'text-danger-500')}>
                    {h.acerto}%
                  </div>
                  <div className="text-xs text-muted-foreground">acertos</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', h.acerto >= 75 ? 'bg-success-500' : h.acerto >= 60 ? 'bg-warning-500' : 'bg-danger-500')}
                  style={{ width: `${h.acerto}%` }} />
              </div>
              <div className="mt-3 flex justify-end">
                <button className="btn-ghost btn-sm text-xs">
                  <BarChart3 className="w-3.5 h-3.5" /> Ver relatório detalhado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
