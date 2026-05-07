'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Clock, Trophy, Play, BarChart3, ChevronRight, Loader2, Lock, BookOpen, Zap, CheckSquare, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import { getCursoData, getMateriasByContest } from '@/lib/curso-data'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SEMANA_ATUAL = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
const DIA_SEMANA = new Date().getDay()

type Fase = 'lista' | 'carregando' | 'simulando' | 'resultado'
interface Questao {
  id: number; materia: string; enunciado: string
  alternativas: { letra: string; texto: string }[]
  gabarito: string; explicacao?: string
}

const FALLBACK_QUESTOES: Questao[] = [
  { id: 1, materia: 'Direito Constitucional', enunciado: 'De acordo com a CF/88, são direitos e garantias fundamentais:', alternativas: [{ letra: 'A', texto: 'Apenas os previstos no art. 5º' }, { letra: 'B', texto: 'Somente os direitos individuais' }, { letra: 'C', texto: 'Os direitos individuais, coletivos, sociais, de nacionalidade e políticos' }, { letra: 'D', texto: 'Os previstos em tratados internacionais apenas' }, { letra: 'E', texto: 'Somente os direitos sociais do art. 6º' }], gabarito: 'C', explicacao: 'O Título II da CF/88 trata dos Direitos e Garantias Fundamentais, abrangendo direitos individuais e coletivos (art. 5º), sociais (art. 6º), de nacionalidade (art. 12) e políticos (art. 14).' },
  { id: 2, materia: 'Direito Penal', enunciado: 'Constitui causa de exclusão de ilicitude:', alternativas: [{ letra: 'A', texto: 'Coação moral irresistível' }, { letra: 'B', texto: 'Embriaguez voluntária' }, { letra: 'C', texto: 'Legítima defesa' }, { letra: 'D', texto: 'Erro de proibição' }, { letra: 'E', texto: 'Obediência hierárquica ilegal' }], gabarito: 'C', explicacao: 'O art. 23 do CP elenca: estado de necessidade, legítima defesa, exercício regular de direito e estrito cumprimento do dever legal.' },
  { id: 3, materia: 'Direito Administrativo', enunciado: 'O princípio da autotutela permite à Administração:', alternativas: [{ letra: 'A', texto: 'Revogar apenas atos discricionários' }, { letra: 'B', texto: 'Anular atos ilegais e revogar inconvenientes de ofício' }, { letra: 'C', texto: 'Modificar contratos a qualquer tempo' }, { letra: 'D', texto: 'Aplicar penalidades sem processo' }, { letra: 'E', texto: 'Desapropriar sem indenização' }], gabarito: 'B', explicacao: 'Súmula 473 do STF: a Administração pode anular seus atos ilegais e revogar por motivo de conveniência/oportunidade, respeitados os direitos adquiridos.' },
  { id: 4, materia: 'Língua Portuguesa', enunciado: 'Assinale a alternativa com concordância verbal CORRETA:', alternativas: [{ letra: 'A', texto: 'Fazem dez anos que ele partiu.' }, { letra: 'B', texto: 'Haviam muitos candidatos na fila.' }, { letra: 'C', texto: 'Mais de um aluno faltou à prova.' }, { letra: 'D', texto: 'A maioria dos alunos chegaram cedo.' }, { letra: 'E', texto: 'Ocorreram muita confusão no local.' }], gabarito: 'C', explicacao: 'Na expressão "mais de um + substantivo singular", o verbo fica no singular: "Mais de um aluno faltou".' },
  { id: 5, materia: 'Raciocínio Lógico', enunciado: 'Se todos os policiais são corajosos e alguns corajosos são altruístas, é CORRETO afirmar:', alternativas: [{ letra: 'A', texto: 'Todos os policiais são altruístas.' }, { letra: 'B', texto: 'Nenhum policial é altruísta.' }, { letra: 'C', texto: 'Alguns policiais podem ser altruístas.' }, { letra: 'D', texto: 'Todos os altruístas são policiais.' }, { letra: 'E', texto: 'Nenhum altruísta é policial.' }], gabarito: 'C', explicacao: 'Pela silogística: todo policial é corajoso + alguns corajosos são altruístas → é possível (mas não garantido) que alguns policiais sejam altruístas.' },
  { id: 6, materia: 'Direito Processual Penal', enunciado: 'O inquérito policial é:', alternativas: [{ letra: 'A', texto: 'Peça processual com pleno contraditório' }, { letra: 'B', texto: 'Procedimento administrativo dispensável' }, { letra: 'C', texto: 'Procedimento administrativo inquisitorial e sigiloso, visando apurar infrações penais' }, { letra: 'D', texto: 'Peça obrigatória para a denúncia' }, { letra: 'E', texto: 'Processo judicial de natureza cautelar' }], gabarito: 'C', explicacao: 'O IP é procedimento administrativo, inquisitorial (sem contraditório pleno), sigiloso, dispensável (ação penal pode ser instaurada sem ele — art. 39 CPP).' },
  { id: 7, materia: 'Direito Constitucional', enunciado: 'Segundo a CF/88, a segurança pública é exercida pelos seguintes órgãos, EXCETO:', alternativas: [{ letra: 'A', texto: 'Polícia Federal' }, { letra: 'B', texto: 'Polícia Rodoviária Federal' }, { letra: 'C', texto: 'Forças Armadas' }, { letra: 'D', texto: 'Polícias Civis' }, { letra: 'E', texto: 'Polícias Militares' }], gabarito: 'C', explicacao: 'O art. 144 da CF/88 elenca os órgãos de segurança pública: PF, PRF, Polícia Ferroviária Federal, PCs, PMs e Guardas Municipais. As Forças Armadas têm missão constitucional distinta (art. 142).' },
  { id: 8, materia: 'Direito Penal', enunciado: 'O crime consumado ocorre quando:', alternativas: [{ letra: 'A', texto: 'O agente inicia a execução do crime' }, { letra: 'B', texto: 'Nele se reúnem todos os elementos de sua definição legal' }, { letra: 'C', texto: 'O resultado ocorre por caso fortuito' }, { letra: 'D', texto: 'Há desistência voluntária do agente' }, { letra: 'E', texto: 'Ocorre o arrependimento eficaz' }], gabarito: 'B', explicacao: 'Art. 14, I do CP: diz-se o crime consumado quando nele se reúnem todos os elementos de sua definição legal.' },
  { id: 9, materia: 'Raciocínio Lógico', enunciado: 'Em uma prova com 20 questões, um candidato acertou 75%. Quantas questões acertou?', alternativas: [{ letra: 'A', texto: '12' }, { letra: 'B', texto: '13' }, { letra: 'C', texto: '14' }, { letra: 'D', texto: '15' }, { letra: 'E', texto: '16' }], gabarito: 'D', explicacao: '75% de 20 = 0,75 × 20 = 15 questões.' },
  { id: 10, materia: 'Direito Administrativo', enunciado: 'São características dos atos administrativos:', alternativas: [{ letra: 'A', texto: 'Presunção de ilegalidade e autoexecutoriedade' }, { letra: 'B', texto: 'Presunção de veracidade, imperatividade e autoexecutoriedade' }, { letra: 'C', texto: 'Consensualidade e bilateralidade' }, { letra: 'D', texto: 'Mutabilidade a critério do particular' }, { letra: 'E', texto: 'Inaplicabilidade sem autorização judicial' }], gabarito: 'B', explicacao: 'Os atributos clássicos do ato administrativo são: presunção de legitimidade/veracidade, imperatividade, autoexecutoriedade e tipicidade.' },
]

export default function SimuladosPage() {
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)

  // Resolve cursos do usuário
  const userCourseIds: string[] = user?.courses === 'all'
    ? CURSOS_DISPONIVEIS.slice(0, 6).map(c => c.id)
    : (Array.isArray(user?.courses) ? user.courses as string[] : [])
  const userCursos = CURSOS_DISPONIVEIS.filter(c => userCourseIds.includes(c.id))
  const [cursoPrincipalId, setCursoPrincipalId] = useState(userCourseIds[0] ?? '')

  const cursoPrincipalData = getCursoData(cursoPrincipalId)
  const cursoPrincipalDisp = CURSOS_DISPONIVEIS.find(c => c.id === cursoPrincipalId)
  const simuladoFormat = cursoPrincipalData?.simuladoFormat

  // Estado do simulado
  const [aba, setAba] = useState<'disponiveis' | 'historico'>('disponiveis')
  const [fase, setFase] = useState<Fase>('lista')
  const [simuladoAtual, setSimuladoAtual] = useState<any>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [idxQ, setIdxQ] = useState(0)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<{ id: number; resposta: string; certo: boolean; materia: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [historico, setHistorico] = useState<any[]>([])
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_simulados_feitos')
    if (saved) setHistorico(JSON.parse(saved))
  }, [])

  // Timer
  useEffect(() => {
    if (fase !== 'simulando' || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(v => {
      if (v <= 1) { clearInterval(t); finalizarComRespostas(respostas); return 0 }
      return v - 1
    }), 1000)
    return () => clearInterval(t)
  }, [fase, timeLeft])

  const miniSimulados = [
    { id: `mini-${SEMANA_ATUAL}-facil`, tipo: 'mini', nivel: 'facil', titulo: `Mini-Simulado Fácil`, qtdQ: 15, tempo: 25, dificuldade: 'Fácil', cor: 'bg-success-100 dark:bg-success-900/20 border-success-300', corBadge: 'text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/30 border-success-200' },
    { id: `mini-${SEMANA_ATUAL}-medio`, tipo: 'mini', nivel: 'medio', titulo: `Mini-Simulado Médio`, qtdQ: 25, tempo: 40, dificuldade: 'Médio', cor: 'bg-warning-50 dark:bg-warning-900/10 border-warning-300', corBadge: 'text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30 border-warning-200' },
    { id: `mini-${SEMANA_ATUAL}-dificil`, tipo: 'mini', nivel: 'dificil', titulo: `Mini-Simulado Difícil`, qtdQ: 35, tempo: 55, dificuldade: 'Difícil', cor: 'bg-danger-50 dark:bg-danger-900/10 border-danger-300', corBadge: 'text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 border-danger-200' },
  ]

  const realQtd = simuladoFormat?.totalQuestoes ?? 80
  const realTempo = simuladoFormat?.tempoMinutos ?? 240

  async function iniciarSimulado(s: typeof miniSimulados[0]) {
    setSimuladoAtual(s)
    setFase('carregando')
    setRespostas([])
    setIdxQ(0)
    setSelecionada(null)
    setMostrarExplicacao(false)

    const materias = getMateriasByContest(cursoPrincipalId)
    const materiaRand = materias.length > 0
      ? materias[Math.floor(Math.random() * materias.length)].nome
      : cursoPrincipalData?.label ?? 'Concurso público'

    try {
      const res = await api.post('/ai/gerar', {
        tipo: 'questoes',
        materia: materiaRand,
        curso: cursoPrincipalData?.label ?? user?.concursoAlvo ?? 'Concurso',
        quantidade: s.qtdQ,
        nivel: s.nivel,
        semana: SEMANA_ATUAL,
        banca: cursoPrincipalData?.banca,
        formato: cursoPrincipalData?.simuladoFormat.tipo ?? 'multipla_escolha',
      })
      const geradas: Questao[] = Array.isArray(res.data.data)
        ? res.data.data.map((q: any, i: number) => ({
            id: i + 1, materia: q.materia ?? materiaRand,
            enunciado: q.enunciado, alternativas: q.alternativas ?? [],
            gabarito: q.gabarito, explicacao: q.explicacao,
          })).filter((q: Questao) => q.enunciado && q.alternativas?.length > 0)
        : []
      const questoesFinais = geradas.length >= 3
        ? geradas
        : FALLBACK_QUESTOES.slice(0, s.qtdQ)
      setQuestoes(questoesFinais)
    } catch {
      setQuestoes(FALLBACK_QUESTOES.slice(0, s.qtdQ))
    }
    setTimeLeft(s.tempo * 60)
    setFase('simulando')
  }

  function responderEAvancar() {
    if (!selecionada || !questoes[idxQ]) return
    const q = questoes[idxQ]
    const nova = { id: q.id, resposta: selecionada, certo: selecionada === q.gabarito, materia: q.materia }
    const novas = [...respostas, nova]
    setRespostas(novas)

    if (idxQ < questoes.length - 1) {
      setTimeout(() => { setIdxQ(i => i + 1); setSelecionada(null); setMostrarExplicacao(false) }, mostrarExplicacao ? 800 : 0)
      setMostrarExplicacao(true)
    } else {
      finalizarComRespostas(novas)
    }
  }

  function finalizarComRespostas(rs: typeof respostas) {
    const acertos = rs.filter(r => r.certo).length
    const taxa = rs.length > 0 ? Math.round((acertos / rs.length) * 100) : 0
    const detalhes = Object.entries(
      rs.reduce((acc: any, r) => {
        if (!acc[r.materia]) acc[r.materia] = { total: 0, acertos: 0 }
        acc[r.materia].total++
        if (r.certo) acc[r.materia].acertos++
        return acc
      }, {})
    ).map(([mat, d]: any) => ({ materia: mat, acerto: Math.round((d.acertos / d.total) * 100), questoes: d.total }))

    const resultado = {
      id: Date.now(),
      titulo: `${simuladoAtual?.titulo} — ${cursoPrincipalData?.label ?? user?.concursoAlvo}`,
      curso: cursoPrincipalId,
      data: new Date().toLocaleDateString('pt-BR'),
      acerto: taxa, corretas: acertos,
      questoes: rs.length, detalhes,
    }
    const novo = [resultado, ...historico].slice(0, 20)
    setHistorico(novo)
    localStorage.setItem('gabaritai_simulados_feitos', JSON.stringify(novo))
    setFase('resultado')
    toast.success(`Simulado concluído! ${acertos}/${rs.length} corretas`)
  }

  const questaoAtual = questoes[idxQ]
  const acertosTotais = respostas.filter(r => r.certo).length
  const min = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seg = (timeLeft % 60).toString().padStart(2, '0')

  // ═══ CARREGANDO ═══
  if (fase === 'carregando') return (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto" />
      <h2 className="font-bold text-foreground text-lg">Gerando simulado com IA...</h2>
      <p className="text-sm text-muted-foreground">Criando questões do estilo {cursoPrincipalData?.banca} para {cursoPrincipalData?.label}</p>
    </div>
  )

  // ═══ SIMULANDO ═══
  if (fase === 'simulando' && questaoAtual) return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">{simuladoAtual?.titulo}</h2>
          <p className="text-sm text-muted-foreground">{cursoPrincipalData?.label} · Questão {idxQ + 1} de {questoes.length}</p>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm', timeLeft < 120 ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/20' : 'bg-muted text-foreground')}>
          <Clock className="w-4 h-4" />{min}:{seg}
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all" style={{ width: `${((idxQ) / questoes.length) * 100}%` }} />
      </div>

      {/* Questão */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="badge badge-blue text-xs">Q{idxQ + 1}</span>
          <span className="badge badge-yellow text-xs">{questaoAtual.materia}</span>
          {cursoPrincipalData?.banca && <span className="text-xs text-muted-foreground">{cursoPrincipalData.banca}</span>}
        </div>
        <p className="text-foreground leading-relaxed">{questaoAtual.enunciado}</p>

        {/* Alternativas */}
        <div className="space-y-2">
          {questaoAtual.alternativas.map(alt => {
            const respondida = selecionada !== null && mostrarExplicacao
            const isCorreta = alt.letra === questaoAtual.gabarito
            const isSelecionada = alt.letra === selecionada
            return (
              <button key={alt.letra} onClick={() => !mostrarExplicacao && setSelecionada(alt.letra)}
                className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                  respondida
                    ? isCorreta ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                      : isSelecionada ? 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
                        : 'border-border opacity-50'
                    : isSelecionada ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-border hover:border-brand-300 hover:bg-muted'
                )}>
                <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5',
                  respondida && isCorreta ? 'border-success-500 bg-success-500 text-white'
                    : respondida && isSelecionada ? 'border-danger-500 bg-danger-500 text-white'
                      : isSelecionada ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground text-muted-foreground'
                )}>{alt.letra}</span>
                <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
              </button>
            )
          })}
        </div>

        {/* Explicação */}
        {mostrarExplicacao && questaoAtual.explicacao && (
          <div className={cn('rounded-xl p-3 text-xs leading-relaxed', selecionada === questaoAtual.gabarito
            ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 text-success-700 dark:text-success-400'
            : 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 text-danger-700 dark:text-danger-400'
          )}>
            <span className="font-bold">{selecionada === questaoAtual.gabarito ? '✅ Correto! ' : `❌ Gabarito: ${questaoAtual.gabarito}. `}</span>
            {questaoAtual.explicacao}
          </div>
        )}

        <button onClick={responderEAvancar} disabled={!selecionada}
          className="btn-primary btn-md w-full">
          {idxQ < questoes.length - 1
            ? <><ChevronRight className="w-4 h-4" /> {mostrarExplicacao ? 'Próxima questão' : 'Responder'}</>
            : <><CheckSquare className="w-4 h-4" /> Finalizar simulado</>}
        </button>
      </div>

      <button onClick={() => finalizarComRespostas(respostas)} className="btn-ghost btn-sm w-full text-muted-foreground">
        Encerrar simulado agora
      </button>
    </div>
  )

  // ═══ RESULTADO ═══
  if (fase === 'resultado') {
    const acertoFinal = respostas.length > 0 ? Math.round((acertosTotais / respostas.length) * 100) : 0
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 text-center space-y-4">
          <Trophy className={cn('w-14 h-14 mx-auto', acertoFinal >= 70 ? 'text-yellow-500' : acertoFinal >= 50 ? 'text-warning-500' : 'text-danger-500')} />
          <div>
            <div className="text-3xl font-black text-foreground">{acertosTotais}/{respostas.length}</div>
            <div className="text-lg font-bold text-muted-foreground">{acertoFinal}% de acerto</div>
            <div className="text-sm text-muted-foreground mt-1">{cursoPrincipalData?.label} · {cursoPrincipalData?.banca}</div>
          </div>
          <div className={cn('text-sm font-semibold', acertoFinal >= 70 ? 'text-success-600' : acertoFinal >= 50 ? 'text-warning-500' : 'text-danger-500')}>
            {acertoFinal >= 70 ? '✅ Excelente! Acima da média de aprovação.' : acertoFinal >= 50 ? '⚠️ Razoável. Revise os pontos fracos.' : '❌ Abaixo da média. Estude mais antes da prova!'}
          </div>
        </div>

        {/* Desempenho por matéria */}
        {historico[0]?.detalhes?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-foreground mb-3 text-sm">Desempenho por matéria</h3>
            <div className="space-y-2">
              {historico[0].detalhes.map((d: any) => (
                <div key={d.materia}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{d.materia}</span>
                    <span className={cn('font-bold', d.acerto >= 70 ? 'text-success-600' : d.acerto >= 50 ? 'text-warning-500' : 'text-danger-500')}>
                      {d.acerto}% ({d.questoes}q)
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', d.acerto >= 70 ? 'bg-success-500' : d.acerto >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${d.acerto}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setFase('lista'); setRespostas([]); setQuestoes([]) }} className="btn-outline btn-md">
            <RotateCcw className="w-4 h-4" /> Novo simulado
          </button>
          <Link href={`/dashboard/curso/${cursoPrincipalId}`} className="btn-primary btn-md text-center flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" /> Ver curso completo
          </Link>
        </div>
      </div>
    )
  }

  // ═══ LISTA ═══
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">Questões no estilo real da sua banca — com gabarito e explicação</p>
      </div>

      {/* Seletor de curso */}
      {userCursos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {userCursos.map(c => (
            <button key={c.id} onClick={() => setCursoPrincipalId(c.id)}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                cursoPrincipalId === c.id ? 'bg-brand-600 text-white border-brand-600' : 'border-border text-muted-foreground hover:border-brand-400'
              )}>
              {c.icon} {c.label.split(' — ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Info do formato real */}
      {cursoPrincipalData && (
        <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{cursoPrincipalDisp?.icon}</span>
            <div>
              <div className="font-bold text-foreground text-sm">{cursoPrincipalData.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Banca: <strong>{cursoPrincipalData.banca}</strong> ·
                Prova real: <strong>{simuladoFormat?.totalQuestoes} questões</strong> ·
                Tipo: <strong>{simuladoFormat?.tipo === 'certo_errado' ? 'Certo/Errado' : `Múltipla escolha (${simuladoFormat?.alternativas} alt.)`}</strong> ·
                Tempo: <strong>{Math.floor((simuladoFormat?.tempoMinutos ?? 240) / 60)}h{(simuladoFormat?.tempoMinutos ?? 0) % 60 > 0 ? `${(simuladoFormat?.tempoMinutos ?? 0) % 60}min` : ''}</strong>
                {simuladoFormat?.cancelamento && <span className="text-warning-600 dark:text-warning-400"> · ⚠️ Errada anula certa</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
        {(['disponiveis', 'historico'] as const).map(t => (
          <button key={t} onClick={() => setAba(t)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              aba === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'disponiveis' ? '▶ Disponíveis' : '📊 Histórico'}
          </button>
        ))}
      </div>

      {aba === 'disponiveis' && (
        <div className="space-y-6">
          {/* Mini-Simulados */}
          <div>
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Mini-Simulados — {cursoPrincipalData?.label?.split(' — ')[0]}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {miniSimulados.map(s => (
                <div key={s.id} className={cn('card p-5 border-2 flex flex-col gap-4', s.cor)}>
                  <div>
                    <span className={cn('text-xs font-bold px-2 py-1 rounded-lg border', s.corBadge)}>{s.dificuldade}</span>
                    <div className="font-bold text-foreground mt-2">{s.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-1">{cursoPrincipalData?.label?.split(' — ')[0]}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{s.qtdQ} questões</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.tempo} min</span>
                  </div>
                  <button onClick={() => iniciarSimulado(s)} className="btn-primary btn-sm mt-auto w-full">
                    <Play className="w-3.5 h-3.5" /> Iniciar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Simulado Real */}
          <div>
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Simulado Real — {cursoPrincipalData?.banca}
            </h2>
            <div className="card p-5 border-2 border-yellow-400 dark:border-yellow-600/50 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-foreground">{cursoPrincipalData?.label} — Prova Completa</div>
                  <div className="text-sm text-muted-foreground mt-1">{realQtd} questões · {Math.floor(realTempo / 60)}h{realTempo % 60 > 0 ? `${realTempo % 60}min` : ''} · {cursoPrincipalData?.banca}</div>
                  {simuladoFormat?.temRedacao && <div className="text-xs text-brand-600 dark:text-brand-400 mt-1">📝 Inclui redação</div>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link href={`/dashboard/curso/${cursoPrincipalId}`}
                    className="btn-primary btn-md text-center flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Acessar simulado completo
                  </Link>
                  <p className="text-xs text-muted-foreground text-center">Disponível na página do curso</p>
                </div>
              </div>
            </div>
          </div>

          {/* Acesso rápido aos outros cursos */}
          {userCursos.length > 1 && (
            <div>
              <h2 className="font-bold text-foreground mb-3 text-sm">Simulados dos outros seus cursos</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {userCursos.filter(c => c.id !== cursoPrincipalId).map(c => {
                  const cd = getCursoData(c.id)
                  return (
                    <Link key={c.id} href={`/dashboard/curso/${c.id}`}
                      className="card p-4 hover:border-brand-400 transition-all flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{c.label}</div>
                        <div className="text-xs text-muted-foreground">{cd?.banca} · {cd?.simuladoFormat.totalQuestoes}q</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'historico' && (
        <div className="space-y-3">
          {historico.length === 0 ? (
            <div className="card p-10 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-foreground">Nenhum simulado realizado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Faça um simulado para ver seu histórico aqui.</p>
            </div>
          ) : (
            historico.map((h: any) => (
              <div key={h.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{h.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{h.data} · {h.questoes} questões</div>
                  </div>
                  <div className={cn('text-xl font-black shrink-0', h.acerto >= 70 ? 'text-success-600' : h.acerto >= 50 ? 'text-warning-500' : 'text-danger-500')}>
                    {h.acerto}%
                  </div>
                </div>
                {h.detalhes && h.detalhes.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {h.detalhes.map((d: any) => (
                      <div key={d.materia} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-36 truncate">{d.materia}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', d.acerto >= 70 ? 'bg-success-500' : d.acerto >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${d.acerto}%` }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-9 text-right">{d.acerto}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
