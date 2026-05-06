'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Clock, Trophy, Play, BarChart3, ChevronRight, AlertCircle, Loader2, Calendar, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// Calcula semana atual
const SEMANA_ATUAL = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
const DIA_SEMANA = new Date().getDay() // 0=dom, 1=seg...6=sab

// Questões mock para quando a IA não responde
const QUESTOES_FALLBACK = [
  { id: 1, materia: 'Dir. Constitucional', enunciado: 'São direitos sociais previstos na Constituição Federal de 1988:', alternativas: [{ letra: 'A', texto: 'Educação, saúde, alimentação, trabalho, moradia, transporte, lazer, segurança, previdência social, proteção à maternidade e assistência aos desamparados.' }, { letra: 'B', texto: 'Apenas educação e saúde.' }, { letra: 'C', texto: 'Somente os direitos do art. 5º.' }, { letra: 'D', texto: 'Educação e segurança pública.' }, { letra: 'E', texto: 'Os mesmos de estrangeiros.' }], gabarito: 'A' },
  { id: 2, materia: 'Dir. Penal', enunciado: 'É causa de exclusão de ilicitude prevista no Código Penal:', alternativas: [{ letra: 'A', texto: 'Coação moral irresistível' }, { letra: 'B', texto: 'Embriaguez voluntária' }, { letra: 'C', texto: 'Legítima defesa' }, { letra: 'D', texto: 'Erro de proibição' }, { letra: 'E', texto: 'Obediência hierárquica' }], gabarito: 'C' },
  { id: 3, materia: 'Dir. Administrativo', enunciado: 'O princípio da autotutela permite à Administração Pública:', alternativas: [{ letra: 'A', texto: 'Revogar atos ilegais independentemente de ação judicial.' }, { letra: 'B', texto: 'Anular atos ilegais e revogar atos inconvenientes, de ofício.' }, { letra: 'C', texto: 'Modificar contratos unilateralmente a qualquer tempo.' }, { letra: 'D', texto: 'Aplicar penalidades sem processo.' }, { letra: 'E', texto: 'Desapropriar sem indenização.' }], gabarito: 'B' },
  { id: 4, materia: 'Língua Portuguesa', enunciado: 'Assinale a alternativa com concordância verbal CORRETA:', alternativas: [{ letra: 'A', texto: 'Fazem dez anos que ele partiu.' }, { letra: 'B', texto: 'Haviam muitos candidatos na fila.' }, { letra: 'C', texto: 'Mais de um aluno faltou à prova.' }, { letra: 'D', texto: 'A maioria dos alunos chegaram cedo.' }, { letra: 'E', texto: 'Ocorreram muita confusão no local.' }], gabarito: 'C' },
  { id: 5, materia: 'Raciocínio Lógico', enunciado: 'Se todos os policiais são corajosos e alguns corajosos são altruístas, é CORRETO afirmar que:', alternativas: [{ letra: 'A', texto: 'Todos os policiais são altruístas.' }, { letra: 'B', texto: 'Nenhum policial é altruísta.' }, { letra: 'C', texto: 'Alguns policiais podem ser altruístas.' }, { letra: 'D', texto: 'Todos os altruístas são policiais.' }, { letra: 'E', texto: 'Nenhum altruísta é policial.' }], gabarito: 'C' },
]

type Fase = 'lista' | 'carregando' | 'simulando' | 'resultado'
interface Questao { id: number; materia: string; enunciado: string; alternativas: { letra: string; texto: string }[]; gabarito: string }

export default function SimuladosPage() {
  const user = useAuthStore(s => s.user)
  const concursoLabel = user?.concursoAlvo ?? 'Concurso'
  const [aba, setAba] = useState<'disponiveis' | 'historico'>('disponiveis')
  const [fase, setFase] = useState<Fase>('lista')
  const [simuladoAtual, setSimuladoAtual] = useState<any>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [idxQ, setIdxQ] = useState(0)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<{ id: number; resposta: string; certo: boolean; materia: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [historico, setHistorico] = useState<any[]>([])

  const cursoPrincipal = user?.concursoAlvo ?? 'Concurso'

  // Simulados disponíveis por dia da semana
  const MINI_SIMULADOS = [
    { id: `mini-${SEMANA_ATUAL}-facil`, tipo: 'mini', titulo: `Mini-Simulado Fácil — ${concursoLabel.split('—')[0].trim()}`, questoes: 5, tempo: 8, dificuldade: 'Fácil', disponivel: DIA_SEMANA >= 1, descricao: 'Liberado na segunda-feira' },
    { id: `mini-${SEMANA_ATUAL}-medio`, tipo: 'mini', titulo: `Mini-Simulado Médio — ${concursoLabel.split('—')[0].trim()}`, questoes: 5, tempo: 10, dificuldade: 'Médio', disponivel: DIA_SEMANA >= 1, descricao: 'Liberado na segunda-feira' },
    { id: `mini-${SEMANA_ATUAL}-dificil`, tipo: 'mini', titulo: `Mini-Simulado Difícil — ${concursoLabel.split('—')[0].trim()}`, questoes: 5, tempo: 12, dificuldade: 'Difícil', disponivel: DIA_SEMANA >= 1, descricao: 'Liberado na segunda-feira' },
  ]
  const SIMULADO_REAL = {
    id: `real-${SEMANA_ATUAL}`, tipo: 'real',
    titulo: `Simulado Real — ${concursoLabel.split('—')[0].trim()} — Semana ${SEMANA_ATUAL % 52 + 1}`,
    questoes: 10, tempo: 20, dificuldade: 'Prova Real',
    disponivel: DIA_SEMANA === 0, // Só no domingo
    descricao: DIA_SEMANA === 0 ? '🎯 Disponível hoje — Domingo!' : `🔒 Liberado todo domingo (faltam ${7 - DIA_SEMANA} dias)`,
  }

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_simulados_feitos')
    if (saved) setHistorico(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (fase !== 'simulando' || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(v => { if (v <= 1) { clearInterval(t); finalizarSimulado(); return 0 } return v - 1 }), 1000)
    return () => clearInterval(t)
  }, [fase, timeLeft])

  async function iniciarSimulado(s: any) {
    setSimuladoAtual(s)
    setFase('carregando')
    setRespostas([])
    setIdxQ(0)
    setSelecionada(null)

    try {
      const nivel = s.dificuldade.toLowerCase().includes('fácil') ? 'facil' : s.dificuldade.toLowerCase().includes('difícil') ? 'dificil' : 'medio'
      const res = await api.post('/ai/gerar', {
        tipo: 'questoes', materia: 'Todas', curso: cursoPrincipal,
        quantidade: s.questoes, nivel, semana: SEMANA_ATUAL,
      })
      const geradas: Questao[] = Array.isArray(res.data.data)
        ? res.data.data.map((q: any, i: number) => ({ id: i + 1, materia: q.materia || 'Geral', enunciado: q.enunciado, alternativas: q.alternativas, gabarito: q.gabarito }))
        : []
      setQuestoes(geradas.length >= 3 ? geradas : QUESTOES_FALLBACK.slice(0, s.questoes))
    } catch {
      setQuestoes(QUESTOES_FALLBACK.slice(0, s.questoes))
    }
    setTimeLeft(s.tempo * 60)
    setFase('simulando')
  }

  function responderEAvancar() {
    if (!selecionada || !questoes[idxQ]) return
    const q = questoes[idxQ]
    const novas = [...respostas, { id: q.id, resposta: selecionada, certo: selecionada === q.gabarito, materia: q.materia }]
    setRespostas(novas)
    if (idxQ < questoes.length - 1) { setIdxQ(i => i + 1); setSelecionada(null) }
    else finalizarComRespostas(novas)
  }

  function finalizarSimulado() { finalizarComRespostas(respostas) }

  function finalizarComRespostas(rs: typeof respostas) {
    const acertos = rs.filter(r => r.certo).length
    const taxa = rs.length > 0 ? Math.round((acertos / rs.length) * 100) : 0
    const resultado = { titulo: simuladoAtual?.titulo, data: new Date().toLocaleDateString('pt-BR'), acerto: taxa, tempo: `${Math.floor((simuladoAtual?.tempo * 60 - timeLeft) / 60)}min ${(simuladoAtual?.tempo * 60 - timeLeft) % 60}s`, questoes: questoes.length, detalhes: Object.entries(rs.reduce((acc: any, r) => { if (!acc[r.materia]) acc[r.materia] = { total: 0, acertos: 0 }; acc[r.materia].total++; if (r.certo) acc[r.materia].acertos++; return acc }, {})).map(([mat, d]: any) => ({ materia: mat, acerto: Math.round((d.acertos / d.total) * 100), questoes: d.total })) }
    const novoHistorico = [resultado, ...historico].slice(0, 20)
    setHistorico(novoHistorico)
    localStorage.setItem('gabaritai_simulados_feitos', JSON.stringify(novoHistorico))
    setFase('resultado')
    toast.success('Simulado concluído!')
  }

  const questaoAtual = questoes[idxQ]
  const acertos = respostas.filter(r => r.certo).length
  const taxa = respostas.length > 0 ? Math.round((acertos / respostas.length) * 100) : 0
  const min = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seg = (timeLeft % 60).toString().padStart(2, '0')

  if (fase === 'carregando') return (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto" />
      <h2 className="font-bold text-foreground">Gerando simulado com IA...</h2>
      <p className="text-sm text-muted-foreground">Criando questões personalizadas para {cursoPrincipal}</p>
    </div>
  )

  if (fase === 'simulando' && questaoAtual) return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">{simuladoAtual?.titulo}</h2>
          <p className="text-sm text-muted-foreground">Questão {idxQ + 1} de {questoes.length}</p>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm', timeLeft < 120 ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/20' : 'bg-muted text-foreground')}>
          <Clock className="w-4 h-4" />{min}:{seg}
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all" style={{ width: `${(idxQ / questoes.length) * 100}%` }} />
      </div>
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="badge-blue shrink-0">Q{idxQ + 1}</span>
          <span className="badge-yellow text-xs">{questaoAtual.materia}</span>
        </div>
        <p className="text-foreground font-medium leading-relaxed mb-5">{questaoAtual.enunciado}</p>
        <div className="space-y-2.5">
          {questaoAtual.alternativas.map(alt => (
            <button key={alt.letra} onClick={() => setSelecionada(alt.letra)}
              className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left', selecionada === alt.letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-border hover:border-brand-300 hover:bg-muted')}>
              <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0', selecionada === alt.letra ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground')}>{alt.letra}</span>
              <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
            </button>
          ))}
        </div>
        <button onClick={responderEAvancar} disabled={!selecionada} className="btn-primary btn-md w-full mt-5">
          {idxQ < questoes.length - 1 ? <><ChevronRight className="w-4 h-4" /> Próxima</> : <><Trophy className="w-4 h-4" /> Finalizar</>}
        </button>
      </div>
    </div>
  )

  if (fase === 'resultado') {
    const porMateria = respostas.reduce((acc: any, r) => { if (!acc[r.materia]) acc[r.materia] = { total: 0, acertos: 0 }; acc[r.materia].total++; if (r.certo) acc[r.materia].acertos++; return acc }, {})
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4', taxa >= 70 ? 'bg-success-100 dark:bg-success-900/30' : 'bg-warning-100 dark:bg-warning-900/30')}>
            <Trophy className={cn('w-10 h-10', taxa >= 70 ? 'text-success-600' : 'text-warning-500')} />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-1">Simulado concluído!</h1>
          <p className="text-muted-foreground text-sm">{simuladoAtual?.titulo}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[['Acertos', acertos, 'text-success-600'], ['Erros', respostas.length - acertos, 'text-danger-500'], ['Taxa', `${taxa}%`, taxa >= 70 ? 'text-success-600' : 'text-warning-500']].map(([l, v, c]) => (
            <div key={l as string} className="card p-4 text-center"><div className={`text-2xl font-black ${c}`}>{v}</div><div className="text-xs text-muted-foreground mt-1">{l}</div></div>
          ))}
        </div>
        {Object.keys(porMateria).length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-foreground mb-4 text-sm">Por matéria</h3>
            <div className="space-y-3">
              {Object.entries(porMateria).map(([mat, d]: any) => {
                const pct = Math.round((d.acertos / d.total) * 100)
                return (
                  <div key={mat}>
                    <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">{mat}</span><span className={cn('font-bold', pct >= 70 ? 'text-success-600' : pct >= 50 ? 'text-warning-500' : 'text-danger-500')}>{pct}%</span></div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', pct >= 70 ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {taxa < 70 && (
          <div className="card p-4 border-warning-200 dark:border-warning-800/40 bg-warning-50/50 dark:bg-warning-900/10">
            <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" /><p className="text-xs text-muted-foreground">Taxa abaixo de 70%. Revise as matérias com menor acerto antes do próximo simulado.</p></div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setFase('lista')} className="btn-outline btn-md flex-1">Ver simulados</button>
          <button onClick={() => iniciarSimulado(simuladoAtual)} className="btn-primary btn-md flex-1"><Play className="w-4 h-4" /> Repetir</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Simulados</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Questões geradas pela IA no estilo da sua banca</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {[['disponiveis', 'Disponíveis'], ['historico', 'Histórico']].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v as any)} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', aba === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
        ))}
      </div>

      {aba === 'disponiveis' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 p-4 text-sm text-muted-foreground">
            📅 <strong className="text-foreground">Calendário semanal:</strong> Mini-simulados liberados toda <strong>segunda-feira</strong>. Simulado Real liberado todo <strong>domingo</strong>. Questões novas todo ciclo.
          </div>

          <h3 className="font-bold text-foreground text-sm">Mini-Simulados da Semana (5 questões cada)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {MINI_SIMULADOS.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('badge text-xs', s.dificuldade === 'Fácil' ? 'badge-green' : s.dificuldade === 'Médio' ? 'badge-yellow' : 'badge-red')}>{s.dificuldade}</span>
                </div>
                <h4 className="font-semibold text-sm text-foreground mb-1">{s.titulo}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Target className="w-3.5 h-3.5" />{s.questoes} questões
                  <Clock className="w-3.5 h-3.5 ml-1" />{s.tempo} min
                </div>
                <button onClick={() => s.disponivel && iniciarSimulado(s)} disabled={!s.disponivel}
                  className={cn('btn-sm w-full', s.disponivel ? 'btn-primary' : 'btn-outline opacity-50 cursor-not-allowed')}>
                  {s.disponivel ? <><Play className="w-3.5 h-3.5" /> Iniciar</> : <><Lock className="w-3.5 h-3.5" /> {s.descricao}</>}
                </button>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-foreground text-sm mt-2">Simulado Real — Domingo</h3>
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-blue text-xs">Prova Completa</span>
                  {SIMULADO_REAL.disponivel && <span className="badge-green text-xs">Disponível hoje!</span>}
                </div>
                <h3 className="font-bold text-foreground mb-1">{SIMULADO_REAL.titulo}</h3>
                <p className="text-sm text-muted-foreground mb-3">{SIMULADO_REAL.descricao}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{SIMULADO_REAL.questoes} questões</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{SIMULADO_REAL.tempo} minutos</span>
                </div>
              </div>
              <button onClick={() => SIMULADO_REAL.disponivel && iniciarSimulado(SIMULADO_REAL)}
                disabled={!SIMULADO_REAL.disponivel}
                className={cn('btn-md shrink-0', SIMULADO_REAL.disponivel ? 'btn-primary' : 'btn-outline opacity-50 cursor-not-allowed')}>
                {SIMULADO_REAL.disponivel ? <><Play className="w-4 h-4" /> Iniciar</> : <><Lock className="w-4 h-4" /> Domingo</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {historico.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum simulado realizado ainda.</p>
              <button onClick={() => setAba('disponiveis')} className="btn-outline btn-sm mt-3">Ver simulados disponíveis</button>
            </div>
          ) : historico.map((h, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-foreground mb-1">{h.titulo}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{h.data}</span>
                    <span><Clock className="w-3 h-3 inline mr-0.5" />{h.tempo}</span>
                    <span><Target className="w-3 h-3 inline mr-0.5" />{h.questoes} questões</span>
                  </div>
                </div>
                <div className={cn('text-2xl font-black', h.acerto >= 75 ? 'text-success-600' : h.acerto >= 60 ? 'text-warning-500' : 'text-danger-500')}>{h.acerto}%</div>
              </div>
              {h.detalhes?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {h.detalhes.map((d: any) => (
                    <div key={d.materia} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-36 truncate">{d.materia}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', d.acerto >= 70 ? 'bg-success-500' : d.acerto >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${d.acerto}%` }} />
                      </div>
                      <span className={cn('font-bold w-8 text-right', d.acerto >= 70 ? 'text-success-600' : d.acerto >= 50 ? 'text-warning-500' : 'text-danger-500')}>{d.acerto}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
