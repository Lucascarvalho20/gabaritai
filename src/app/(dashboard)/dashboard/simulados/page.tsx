'use client'

import { useState, useEffect } from 'react'
import { Target, Clock, Trophy, Play, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

// 5 mock questions for the simulation
const QUESTOES_SIMULADO = [
  {
    id: 1, materia: 'Direito Constitucional',
    enunciado: 'A Constituição Federal de 1988 estabelece que são direitos sociais:',
    alternativas: [
      { letra: 'A', texto: 'Educação, saúde, alimentação, trabalho, moradia, transporte, lazer, segurança, previdência social, proteção à maternidade e à infância, assistência aos desamparados.' },
      { letra: 'B', texto: 'Apenas educação, saúde e trabalho.' },
      { letra: 'C', texto: 'Somente os direitos previstos no art. 5º.' },
      { letra: 'D', texto: 'Educação, saúde e segurança pública.' },
      { letra: 'E', texto: 'Os mesmos direitos dos estrangeiros residentes no Brasil.' },
    ],
    gabarito: 'A',
  },
  {
    id: 2, materia: 'Direito Penal',
    enunciado: 'Segundo o Código Penal, é causa de exclusão de ilicitude:',
    alternativas: [
      { letra: 'A', texto: 'A coação moral irresistível.' },
      { letra: 'B', texto: 'A embriaguez voluntária.' },
      { letra: 'C', texto: 'A legítima defesa.' },
      { letra: 'D', texto: 'O erro de proibição.' },
      { letra: 'E', texto: 'A obediência hierárquica.' },
    ],
    gabarito: 'C',
  },
  {
    id: 3, materia: 'Direito Administrativo',
    enunciado: 'O princípio da autotutela permite à Administração Pública:',
    alternativas: [
      { letra: 'A', texto: 'Revogar atos ilegais independentemente de ação judicial.' },
      { letra: 'B', texto: 'Anular atos ilegais e revogar atos inconvenientes, de ofício.' },
      { letra: 'C', texto: 'Modificar contratos administrativos unilateralmente a qualquer tempo.' },
      { letra: 'D', texto: 'Aplicar penalidades sem processo administrativo.' },
      { letra: 'E', texto: 'Desapropriar bens sem qualquer indenização.' },
    ],
    gabarito: 'B',
  },
  {
    id: 4, materia: 'Língua Portuguesa',
    enunciado: 'Assinale a alternativa em que a palavra está corretamente grafada:',
    alternativas: [
      { letra: 'A', texto: 'Excessão' },
      { letra: 'B', texto: 'Privilégio' },
      { letra: 'C', texto: 'Beneficência' },
      { letra: 'D', texto: 'Consciência' },
      { letra: 'E', texto: 'Prerrrogativa' },
    ],
    gabarito: 'D',
  },
  {
    id: 5, materia: 'Raciocínio Lógico',
    enunciado: 'Se todos os policiais são corajosos e alguns corajosos são altruístas, então:',
    alternativas: [
      { letra: 'A', texto: 'Todos os policiais são altruístas.' },
      { letra: 'B', texto: 'Nenhum policial é altruísta.' },
      { letra: 'C', texto: 'Alguns policiais podem ser altruístas.' },
      { letra: 'D', texto: 'Todos os altruístas são policiais.' },
      { letra: 'E', texto: 'Nenhum altruísta é policial.' },
    ],
    gabarito: 'C',
  },
]

type Fase = 'lista' | 'simulando' | 'resultado'

export default function SimuladosPage() {
  const user = useAuthStore(s => s.user)
  const concursoLabel = user?.concursoAlvo ?? 'Concurso'

  const SIMULADOS_DISPONIVEIS = [
    { id: 1, titulo: `Simulado ${concursoLabel} — Módulo 1`, questoes: 5, tempo: 10, materia: 'Dir. Constitucional + Penal + Admin.', dificuldade: 'Médio', novo: false },
    { id: 2, titulo: `Simulado ${concursoLabel} — Módulo 2`, questoes: 5, tempo: 10, materia: 'Português + Raciocínio Lógico', dificuldade: 'Médio', novo: false },
    { id: 3, titulo: `Mini-Simulado — Pontos Fracos`, questoes: 5, tempo: 8, materia: 'Gerado pela IA com seus erros', dificuldade: 'Personalizado', novo: true },
  ]

  const HISTORICO = [
    { titulo: `Simulado ${concursoLabel} — Módulo 1`, data: '05/05/2026', acerto: 72, tempo: '8min 30s', questoes: 5,
      detalhes: [
        { materia: 'Direito Constitucional', acerto: 80, questoes: 2 },
        { materia: 'Direito Penal', acerto: 60, questoes: 1 },
        { materia: 'Direito Administrativo', acerto: 100, questoes: 1 },
        { materia: 'Língua Portuguesa', acerto: 50, questoes: 1 },
      ]
    },
    { titulo: `Mini-Simulado Adaptativo`, data: '03/05/2026', acerto: 58, tempo: '6min 12s', questoes: 5,
      detalhes: [
        { materia: 'Direito Penal', acerto: 50, questoes: 2 },
        { materia: 'Raciocínio Lógico', acerto: 60, questoes: 2 },
        { materia: 'Língua Portuguesa', acerto: 66, questoes: 1 },
      ]
    },
  ]

  const [aba, setAba] = useState<'disponiveis' | 'historico'>('disponiveis')
  const [fase, setFase] = useState<Fase>('lista')
  const [simuladoAtual, setSimuladoAtual] = useState<typeof SIMULADOS_DISPONIVEIS[0] | null>(null)
  const [idxQuestao, setIdxQuestao] = useState(0)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<{ id: number; resposta: string; certo: boolean; materia: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(0)

  const questao = QUESTOES_SIMULADO[idxQuestao]

  function finalizarComRespostas(rs: { id: number; resposta: string; certo: boolean; materia: string }[]) {
    setRespostas(rs)
    setFase('resultado')
    toast.success('Simulado concluído!')
  }

  // Timer
  useEffect(() => {
    if (fase !== 'simulando' || timeLeft <= 0) return
    const t = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 1) {
          clearInterval(t)
          setFase('resultado')
          toast.success('Simulado concluído!')
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [fase, timeLeft])

  function iniciarSimulado(s: typeof SIMULADOS_DISPONIVEIS[0]) {
    setSimuladoAtual(s)
    setIdxQuestao(0)
    setSelecionada(null)
    setRespostas([])
    setTimeLeft(s.tempo * 60)
    setFase('simulando')
  }

  function responderEAvancar() {
    if (!selecionada) return
    const novas = [...respostas, { id: questao.id, resposta: selecionada, certo: selecionada === questao.gabarito, materia: questao.materia }]
    setRespostas(novas)
    if (idxQuestao < QUESTOES_SIMULADO.length - 1) {
      setIdxQuestao(i => i + 1)
      setSelecionada(null)
    } else {
      finalizarComRespostas(novas)
    }
  }

  const minutosRestantes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const segundosRestantes = (timeLeft % 60).toString().padStart(2, '0')
  const acertos = respostas.filter(r => r.certo).length
  const taxaAcerto = respostas.length > 0 ? Math.round((acertos / respostas.length) * 100) : 0

  // Agrupado por matéria
  const porMateria = respostas.reduce((acc, r) => {
    if (!acc[r.materia]) acc[r.materia] = { total: 0, acertos: 0 }
    acc[r.materia].total++
    if (r.certo) acc[r.materia].acertos++
    return acc
  }, {} as Record<string, { total: number; acertos: number }>)

  // ── Tela de simulação ──
  if (fase === 'simulando') {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground">{simuladoAtual?.titulo}</h2>
            <p className="text-sm text-muted-foreground">Questão {idxQuestao + 1} de {QUESTOES_SIMULADO.length}</p>
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm', timeLeft < 120 ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/20' : 'bg-muted text-foreground')}>
            <Clock className="w-4 h-4" />
            {minutosRestantes}:{segundosRestantes}
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${((idxQuestao) / QUESTOES_SIMULADO.length) * 100}%` }} />
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-blue shrink-0">Q{idxQuestao + 1}</span>
            <span className="badge-yellow text-xs">{questao.materia}</span>
          </div>
          <p className="text-foreground font-medium leading-relaxed mb-5">{questao.enunciado}</p>

          <div className="space-y-2.5">
            {questao.alternativas.map(alt => (
              <button
                key={alt.letra}
                onClick={() => setSelecionada(alt.letra)}
                className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                  selecionada === alt.letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-border hover:border-brand-300 hover:bg-muted'
                )}
              >
                <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0',
                  selecionada === alt.letra ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground'
                )}>{alt.letra}</span>
                <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
              </button>
            ))}
          </div>

          <button onClick={responderEAvancar} disabled={!selecionada} className="btn-primary btn-md w-full mt-5">
            {idxQuestao < QUESTOES_SIMULADO.length - 1 ? <><ChevronRight className="w-4 h-4" /> Próxima questão</> : <><Trophy className="w-4 h-4" /> Finalizar simulado</>}
          </button>
        </div>
      </div>
    )
  }

  // ── Tela de resultado ──
  if (fase === 'resultado') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4', taxaAcerto >= 70 ? 'bg-success-100 dark:bg-success-900/30' : 'bg-warning-100 dark:bg-warning-900/30')}>
            <Trophy className={cn('w-10 h-10', taxaAcerto >= 70 ? 'text-success-600' : 'text-warning-500')} />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-1">Simulado concluído!</h1>
          <p className="text-muted-foreground">{simuladoAtual?.titulo}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Acertos', value: acertos, color: 'text-success-600' },
            { label: 'Erros', value: respostas.length - acertos, color: 'text-danger-500' },
            { label: 'Taxa', value: `${taxaAcerto}%`, color: taxaAcerto >= 70 ? 'text-success-600' : 'text-warning-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-foreground mb-4 text-sm">Desempenho por matéria</h3>
          <div className="space-y-3">
            {Object.entries(porMateria).map(([mat, d]) => {
              const pct = Math.round((d.acertos / d.total) * 100)
              return (
                <div key={mat}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{mat}</span>
                    <span className={cn('font-bold', pct >= 70 ? 'text-success-600' : pct >= 50 ? 'text-warning-500' : 'text-danger-500')}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', pct >= 70 ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {taxaAcerto < 70 && (
          <div className="card p-4 border-warning-200 dark:border-warning-800/40 bg-warning-50/50 dark:bg-warning-900/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-warning-700 dark:text-warning-400">Recomendação do Mentor IA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa abaixo de 70%. Foque em {Object.entries(porMateria).filter(([, d]) => d.acertos / d.total < 0.7).map(([m]) => m).join(', ')} antes do próximo simulado.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setFase('lista')} className="btn-outline btn-md flex-1">
            Ver simulados
          </button>
          <button onClick={() => iniciarSimulado(simuladoAtual!)} className="btn-primary btn-md flex-1">
            <Play className="w-4 h-4" /> Repetir
          </button>
        </div>
      </div>
    )
  }

  // ── Tela principal (lista) ──
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Simulados</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Simulados no estilo da sua banca com cronômetro e relatório detalhado</p>
      </div>

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
                <button onClick={() => iniciarSimulado(s)} className="btn-primary btn-md shrink-0">
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
                <div className={cn('text-2xl font-black', h.acerto >= 75 ? 'text-success-600' : h.acerto >= 60 ? 'text-warning-500' : 'text-danger-500')}>
                  {h.acerto}%
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', h.acerto >= 75 ? 'bg-success-500' : h.acerto >= 60 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${h.acerto}%` }} />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Por matéria:</p>
                {h.detalhes.map(d => (
                  <div key={d.materia} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-36 truncate">{d.materia}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', d.acerto >= 70 ? 'bg-success-500' : d.acerto >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${d.acerto}%` }} />
                    </div>
                    <span className={cn('font-bold w-8 text-right', d.acerto >= 70 ? 'text-success-600' : d.acerto >= 50 ? 'text-warning-500' : 'text-danger-500')}>{d.acerto}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
