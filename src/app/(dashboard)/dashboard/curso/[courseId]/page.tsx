'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { getCursoData, getMateriasByContest } from '@/lib/curso-data'
import { CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import {
  BookOpen, Zap, Target, TrendingUp, ChevronLeft, Brain,
  CheckCircle2, BarChart3, FileText,
  Trophy, Play, RotateCcw, CheckSquare
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'questoes' | 'flashcards' | 'simulados' | 'edital'

function getDefaultTopicos(materiaNome: string): string[] {
  const m = materiaNome.toLowerCase()
  if (m.includes('constitucional')) return [
    'Princípios Fundamentais (Arts. 1º-4º)', 'Direitos e Garantias Fundamentais (Art. 5º)',
    'Direitos Sociais (Arts. 6º-11)', 'Organização do Estado', 'Separação dos Poderes',
    'Administração Pública (Arts. 37-41)', 'Ordem Econômica e Social',
  ]
  if (m.includes('administrativo')) return [
    'Princípios da Administração (LIMPE)', 'Atos Administrativos', 'Poderes Administrativos',
    'Administração Direta e Indireta', 'Servidores Públicos', 'Licitações (Lei 14.133/2021)',
    'Controle da Administração', 'Responsabilidade Civil do Estado',
  ]
  if (m.includes('penal') && !m.includes('processo')) return [
    'Princípios do Direito Penal', 'Lei Penal no Tempo e Espaço', 'Teoria do Crime',
    'Culpabilidade e Antijuridicidade', 'Concurso de Pessoas e Crimes',
    'Crimes contra a Vida', 'Crimes contra o Patrimônio',
    'Crimes contra a Administração Pública',
  ]
  if (m.includes('processual') || m.includes('processo penal') || m.includes('cpp')) return [
    'Inquérito Policial', 'Ação Penal', 'Competência', 'Provas',
    'Prisão e Medidas Cautelares', 'Liberdade Provisória', 'Procedimentos', 'Recursos',
  ]
  if (m.includes('português') || m.includes('lingua')) return [
    'Interpretação de Texto', 'Ortografia e Acentuação', 'Classes de Palavras',
    'Sintaxe: sujeito e predicado', 'Concordância Nominal e Verbal',
    'Regência Nominal e Verbal', 'Crase', 'Pontuação',
  ]
  if (m.includes('lógico') || m.includes('raciocínio')) return [
    'Proposições e Conectivos', 'Tabela-Verdade', 'Silogismo e Inferências',
    'Sequências e Séries', 'Raciocínio Analítico', 'Probabilidade', 'Geometria Básica',
  ]
  if (m.includes('informática')) return [
    'Windows e Linux básico', 'Word, Excel e PowerPoint',
    'Internet e Segurança da Informação', 'Redes de Computadores', 'LGPD',
  ]
  if (m.includes('direitos humanos')) return [
    'Declaração Universal dos Direitos Humanos', 'Pacto de São José da Costa Rica',
    'Direitos Humanos na CF/88', 'Sistema Interamericano de Direitos Humanos',
  ]
  if (m.includes('matemática') || m.includes('mat.')) return [
    'Conjuntos e Operações', 'Porcentagem e Razão', 'Regra de Três',
    'Juros Simples e Compostos', 'Equações e Inequações', 'Geometria Plana',
  ]
  return [
    `${materiaNome} — Conceitos fundamentais`,
    `${materiaNome} — Legislação aplicável`,
    `${materiaNome} — Questões mais cobradas`,
    `${materiaNome} — Jurisprudência e atualidades`,
  ]
}

// Mock determinístico por matéria
function mockMateriaStats(materiaId: string, courseId: string) {
  const h = (materiaId + courseId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    acerto: 45 + (h % 48),
    questoes: 20 + (h % 80),
    revisoes: h % 5,
  }
}

function mockProgressoSemana(courseId: string) {
  const h = courseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((dia, i) => ({
    dia,
    acertos: 45 + ((h + i * 13) % 50),
    questoes: 10 + ((h + i * 7) % 25),
  }))
}

function AccuracyBar({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const color = pct >= 70 ? 'bg-success-500' : pct >= 55 ? 'bg-warning-500' : 'bg-danger-500'
  const h = size === 'sm' ? 'h-1.5' : 'h-2'
  return (
    <div className={`${h} bg-muted rounded-full overflow-hidden w-full`}>
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function QuestaoCard({
  questao, index, onResponder, respondida
}: {
  questao: { enunciado: string; tipo: 'certo_errado' | 'multipla_escolha'; gabarito: string; alternativas?: { letra: string; texto: string }[]; explicacao: string; materia: string }
  index: number
  onResponder: (resp: string, correta: boolean) => void
  respondida?: { resposta: string; correta: boolean }
}) {
  const [selected, setSelected] = useState<string | null>(respondida?.resposta ?? null)

  function responder(resp: string) {
    if (selected) return
    setSelected(resp)
    const correta = resp === questao.gabarito
    onResponder(resp, correta)
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-muted-foreground bg-muted rounded-lg px-2 py-1 shrink-0">{index + 1}</span>
        <div>
          <span className="badge badge-blue text-xs mb-2 inline-block">{questao.materia}</span>
          <p className="text-sm text-foreground leading-relaxed">{questao.enunciado}</p>
        </div>
      </div>

      {questao.tipo === 'certo_errado' ? (
        <div className="flex gap-3">
          {['C', 'E'].map(op => {
            const isSelected = selected === op
            const isCorrect = questao.gabarito === op
            const showResult = selected !== null
            return (
              <button
                key={op}
                onClick={() => responder(op)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  showResult
                    ? isCorrect
                      ? 'bg-success-100 dark:bg-success-900/30 border-success-500 text-success-700 dark:text-success-400'
                      : isSelected
                        ? 'bg-danger-100 dark:bg-danger-900/30 border-danger-500 text-danger-700 dark:text-danger-400'
                        : 'border-border text-muted-foreground opacity-50'
                    : 'border-border hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-foreground'
                }`}
              >
                {op === 'C' ? 'Certo' : 'Errado'}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {questao.alternativas?.map(alt => {
            const isSelected = selected === alt.letra
            const isCorrect = questao.gabarito === alt.letra
            const showResult = selected !== null
            return (
              <button
                key={alt.letra}
                onClick={() => responder(alt.letra)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  showResult
                    ? isCorrect
                      ? 'bg-success-50 dark:bg-success-900/20 border-success-400 text-success-700 dark:text-success-400'
                      : isSelected
                        ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-400 text-danger-700 dark:text-danger-400'
                        : 'border-border opacity-50'
                    : 'border-border hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                }`}
              >
                <span className="font-bold text-xs shrink-0 mt-0.5">{alt.letra})</span>
                <span className="text-sm">{alt.texto}</span>
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className={`rounded-xl p-3 text-xs leading-relaxed ${
          selected === questao.gabarito
            ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/30 text-success-700 dark:text-success-400'
            : 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/30 text-danger-700 dark:text-danger-400'
        }`}>
          <span className="font-bold">{selected === questao.gabarito ? '✅ Correto! ' : `❌ Errado. Gabarito: ${questao.gabarito}. `}</span>
          {questao.explicacao}
        </div>
      )}
    </div>
  )
}

export default function CursoPage({ params }: { params: { courseId: string } }) {
  const { courseId } = params
  const token = useAuthStore(s => s.token)
  const [tab, setTab] = useState<Tab>('overview')

  // Course data
  const cursoData = getCursoData(courseId)
  const cursoDisp = CURSOS_DISPONIVEIS.find(c => c.id === courseId)
  const materias = getMateriasByContest(courseId)
  const progSemana = mockProgressoSemana(courseId)

  // Questões state
  const [materiaFiltro, setMateriaFiltro] = useState('todas')
  const [questoes, setQuestoes] = useState<any[]>([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [respostas, setRespostas] = useState<Record<number, { resposta: string; correta: boolean }>>({})

  // Flashcards state
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [cardAtual, setCardAtual] = useState(0)
  const [virado, setVirado] = useState(false)
  const [loadingFC, setLoadingFC] = useState(false)

  // Edital state
  const [editalProgress, setEditalProgress] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem(`edital_${courseId}`) ?? '{}') } catch {}
    }
    return {}
  })
  function toggleTopic(key: string) {
    setEditalProgress(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`edital_${courseId}`, JSON.stringify(updated))
      return updated
    })
  }

  // Simulado state
  const [simuladoAtivo, setSimuladoAtivo] = useState(false)
  const [simuladoQuestoes, setSimuladoQuestoes] = useState<any[]>([])
  const [simuladoRespostas, setSimuladoRespostas] = useState<Record<number, string>>({})
  const [simuladoFinalizado, setSimuladoFinalizado] = useState(false)
  const [loadingSim, setLoadingSim] = useState(false)

  const semana = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const materiaStats = materias.map(m => ({ ...m, stats: mockMateriaStats(m.id, courseId) }))
  const acertoGlobal = materiaStats.length > 0
    ? Math.round(materiaStats.reduce((a, m) => a + m.stats.acerto, 0) / materiaStats.length)
    : 72
  const pontoFraco = materiaStats.reduce((a, b) => a.stats.acerto < b.stats.acerto ? a : b)

  const simuladoFormat = cursoData?.simuladoFormat

  if (!cursoData || !cursoDisp) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Curso não encontrado.</p>
        <Link href="/dashboard" className="btn-primary btn-md mt-4">Voltar ao dashboard</Link>
      </div>
    )
  }

  // cursoData is guaranteed non-null here (early return above handles null case)
  const cd = cursoData!

  // --- Questões ---
  async function gerarQuestoes() {
    setLoadingQ(true)
    setRespostas({})
    const materia = materiaFiltro === 'todas'
      ? materias[Math.floor(Math.random() * materias.length)]?.nome ?? cd.label
      : materias.find(m => m.id === materiaFiltro)?.nome ?? materiaFiltro

    try {
      const res = await fetch('/api/ai/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo: 'questoes',
          materia,
          curso: cd.label,
          quantidade: 10,
          nivel: 'medio',
          semana,
          banca: cd.banca,
          formato: cd.simuladoFormat.tipo,
        }),
      })
      const d = await res.json()
      const lista = Array.isArray(d.data) ? d.data : []
      if (lista.length > 0) {
        setQuestoes(lista.map((q: any) => ({
          ...q,
          tipo: cd.simuladoFormat.tipo,
          materia: q.materia ?? materia,
        })))
      } else {
        toast.error('IA não retornou questões. Tente novamente.')
      }
    } catch {
      toast.error('Erro ao gerar questões.')
    }
    setLoadingQ(false)
  }

  // --- Flashcards ---
  async function gerarFlashcards() {
    setLoadingFC(true)
    setCardAtual(0)
    setVirado(false)
    const materia = materias[Math.floor(Math.random() * materias.length)]?.nome ?? cd.label
    try {
      const res = await fetch('/api/ai/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: 'flashcards', materia, curso: cd.label, quantidade: 10, semana }),
      })
      const d = await res.json()
      const lista = Array.isArray(d.data) ? d.data : []
      if (lista.length > 0) {
        setFlashcards(lista)
        toast.success(`${lista.length} flashcards gerados!`)
      } else {
        toast.error('Erro ao gerar flashcards.')
      }
    } catch {
      toast.error('Erro ao conectar com a IA.')
    }
    setLoadingFC(false)
  }

  // --- Simulado ---
  async function iniciarSimulado(qtd: number) {
    setLoadingSim(true)
    setSimuladoRespostas({})
    setSimuladoFinalizado(false)
    try {
      const res = await fetch('/api/ai/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo: 'simulado',
          materia: 'todas',
          curso: cd.label,
          quantidade: qtd,
          semana,
          nivel: 'medio',
        }),
      })
      const d = await res.json()
      const lista = Array.isArray(d.data) ? d.data : []
      if (lista.length > 0) {
        setSimuladoQuestoes(lista.map((q: any) => ({ ...q, tipo: simuladoFormat?.tipo ?? 'multipla_escolha' })))
        setSimuladoAtivo(true)
      } else {
        toast.error('Erro ao gerar simulado.')
      }
    } catch {
      toast.error('Erro ao conectar com a IA.')
    }
    setLoadingSim(false)
  }

  function finalizarSimulado() {
    setSimuladoFinalizado(true)
    setSimuladoAtivo(false)
    const corretas = simuladoQuestoes.filter((q, i) => simuladoRespostas[i] === q.gabarito).length
    toast.success(`Simulado concluído! ${corretas}/${simuladoQuestoes.length} corretas`)
  }

  const corretas = simuladoFinalizado
    ? simuladoQuestoes.filter((q, i) => simuladoRespostas[i] === q.gabarito).length
    : 0
  const acertoSimulado = simuladoQuestoes.length > 0
    ? Math.round((corretas / simuladoQuestoes.length) * 100)
    : 0

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',  label: 'Visão Geral',  icon: BarChart3 },
    { id: 'questoes',  label: 'Questões',     icon: BookOpen },
    { id: 'flashcards',label: 'Flashcards',   icon: Zap },
    { id: 'simulados', label: 'Simulados',    icon: Target },
    { id: 'edital',    label: 'Edital',       icon: FileText },
  ]

  const allTopicos = materias.flatMap(m => (m.topicos ?? getDefaultTopicos(m.nome)).map((_, idx) => `${m.id}_${idx}`))
  const topicosEstudados = allTopicos.filter(k => editalProgress[k]).length

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 w-fit">
          <ChevronLeft className="w-4 h-4" /> Voltar ao dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{cursoDisp.icon}</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground">{cd.label}</h1>
              <p className="text-sm text-muted-foreground">{cd.orgao} · {cd.banca}</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-black ${acertoGlobal >= 70 ? 'text-success-600' : acertoGlobal >= 55 ? 'text-warning-500' : 'text-danger-500'}`}>
                {acertoGlobal}%
              </div>
              <div className="text-xs text-muted-foreground">acerto geral</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ VISÃO GERAL ═══ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Matérias', value: materias.length, icon: BookOpen, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
              { label: 'Acerto médio', value: `${acertoGlobal}%`, icon: TrendingUp, color: acertoGlobal >= 70 ? 'text-success-600' : 'text-warning-500', bg: 'bg-success-50 dark:bg-success-900/20' },
              { label: 'Questões respondidas', value: materiaStats.reduce((a, m) => a + m.stats.questoes, 0), icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Total na prova', value: simuladoFormat?.totalQuestoes ?? '—', icon: Target, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Formato da prova */}
          {simuladoFormat && (
            <div className="card p-5">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-500" /> Formato da prova real — {cd.banca}
              </h2>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Total de questões</div>
                  <div className="text-xl font-black text-foreground">{simuladoFormat.totalQuestoes}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Tempo de prova</div>
                  <div className="text-xl font-black text-foreground">{Math.floor(simuladoFormat.tempoMinutos / 60)}h{simuladoFormat.tempoMinutos % 60 > 0 ? `${simuladoFormat.tempoMinutos % 60}min` : ''}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Tipo de questão</div>
                  <div className="font-bold text-foreground">{simuladoFormat.tipo === 'certo_errado' ? 'Certo ou Errado' : `Múltipla escolha (${simuladoFormat.alternativas} alternativas)`}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Cancelamento</div>
                  <div className={`font-bold ${simuladoFormat.cancelamento ? 'text-danger-500' : 'text-success-600'}`}>
                    {simuladoFormat.cancelamento ? '⚠️ Sim — errada anula certa' : '✅ Não — sem cancelamento'}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Redação</div>
                  <div className={`font-bold ${simuladoFormat.temRedacao ? 'text-brand-600' : 'text-muted-foreground'}`}>
                    {simuladoFormat.temRedacao ? '📝 Sim' : '— Não'}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Banca organizadora</div>
                  <div className="font-bold text-foreground">{simuladoFormat.banca}</div>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico semanal */}
          <div className="card p-5">
            <h2 className="font-bold text-foreground mb-4 text-sm">Desempenho esta semana</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progSemana}>
                  <defs>
                    <linearGradient id="grad-acertos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Acerto']} />
                  <Area type="monotone" dataKey="acertos" name="Acerto" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad-acertos)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Matérias */}
          <div className="card p-5">
            <h2 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Desempenho por matéria
            </h2>
            {pontoFraco && (
              <div className="mb-4 p-3 rounded-xl bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30">
                <p className="text-xs text-warning-700 dark:text-warning-400">
                  <span className="font-bold">⚠️ Ponto fraco identificado: </span>
                  {pontoFraco.nome} com {pontoFraco.stats.acerto}% de acerto. Foque aqui!
                </p>
              </div>
            )}
            <div className="space-y-3">
              {materiaStats.map(m => (
                <div key={m.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-foreground">{m.nome}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{m.stats.questoes} questões</span>
                      <span className={`font-bold ${m.stats.acerto >= 70 ? 'text-success-600' : m.stats.acerto >= 55 ? 'text-warning-500' : 'text-danger-500'}`}>
                        {m.stats.acerto}%
                      </span>
                    </div>
                  </div>
                  <AccuracyBar pct={m.stats.acerto} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUESTÕES ═══ */}
      {tab === 'questoes' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <label className="label text-xs">Filtrar por matéria</label>
              <select
                className="input text-sm"
                value={materiaFiltro}
                onChange={e => setMateriaFiltro(e.target.value)}
              >
                <option value="todas">Todas as matérias</option>
                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <button
              onClick={gerarQuestoes}
              disabled={loadingQ}
              className="btn-primary btn-md shrink-0"
            >
              {loadingQ ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Gerando...</>
              ) : (
                <><Brain className="w-4 h-4" /> Gerar 10 questões com IA</>
              )}
            </button>
          </div>

          {questoes.length === 0 && !loadingQ && (
            <div className="card p-10 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-foreground">Nenhuma questão ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar questões com IA" para começar a praticar específico para {cd.label}.</p>
            </div>
          )}

          {questoes.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{questoes.length} questões geradas para <strong>{cd.label}</strong></p>
                {Object.keys(respostas).length > 0 && (
                  <span className="text-sm font-bold text-foreground">
                    {Object.values(respostas).filter(r => r.correta).length}/{Object.keys(respostas).length} corretas
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {questoes.map((q, i) => (
                  <QuestaoCard
                    key={i}
                    questao={q}
                    index={i}
                    respondida={respostas[i]}
                    onResponder={(resp, correta) => setRespostas(prev => ({ ...prev, [i]: { resposta: resp, correta } }))}
                  />
                ))}
              </div>
              {Object.keys(respostas).length === questoes.length && (
                <div className="card p-5 text-center bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800/40">
                  <div className="text-2xl font-black text-brand-600 mb-1">
                    {Object.values(respostas).filter(r => r.correta).length}/{questoes.length}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">questões corretas nesta rodada</p>
                  <button onClick={gerarQuestoes} className="btn-primary btn-md">
                    <RotateCcw className="w-4 h-4" /> Nova rodada de questões
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ FLASHCARDS ═══ */}
      {tab === 'flashcards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Flashcards — {cd.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">IA gera flashcards específicos do edital deste concurso</p>
            </div>
            <button onClick={gerarFlashcards} disabled={loadingFC} className="btn-primary btn-md">
              {loadingFC ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Gerando...</>
              ) : (
                <><Zap className="w-4 h-4" /> Gerar flashcards</>
              )}
            </button>
          </div>

          {flashcards.length === 0 && !loadingFC && (
            <div className="card p-10 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-foreground">Sem flashcards</p>
              <p className="text-sm text-muted-foreground mt-1">Gere flashcards com IA para revisar os tópicos do edital de {cd.label}.</p>
            </div>
          )}

          {flashcards.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Card {cardAtual + 1} de {flashcards.length}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setCardAtual(Math.max(0, cardAtual - 1)); setVirado(false) }} disabled={cardAtual === 0} className="btn-ghost btn-sm">Anterior</button>
                  <button onClick={() => { setCardAtual(Math.min(flashcards.length - 1, cardAtual + 1)); setVirado(false) }} disabled={cardAtual === flashcards.length - 1} className="btn-ghost btn-sm">Próximo</button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${((cardAtual + 1) / flashcards.length) * 100}%` }} />
              </div>

              {/* Card */}
              <button
                onClick={() => setVirado(v => !v)}
                className="w-full card p-8 min-h-[260px] flex flex-col items-center justify-center gap-4 hover:border-brand-400 transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                  {virado ? 'Verso (resposta)' : 'Frente (pergunta)'}
                </div>
                <p className="text-center text-foreground font-medium leading-relaxed text-base">
                  {virado ? flashcards[cardAtual]?.verso : flashcards[cardAtual]?.frente}
                </p>
                <p className="text-xs text-muted-foreground">Clique para {virado ? 'ver a pergunta' : 'ver a resposta'}</p>
              </button>

              {/* Matéria badge */}
              {flashcards[cardAtual]?.materia && (
                <div className="flex justify-center">
                  <span className="badge badge-blue text-xs">{flashcards[cardAtual].materia}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ SIMULADOS ═══ */}
      {tab === 'simulados' && (
        <div className="space-y-4">
          {/* Resultado final */}
          {simuladoFinalizado && (
            <div className="card p-6 text-center border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 space-y-3">
              <Trophy className={`w-12 h-12 mx-auto ${acertoSimulado >= 70 ? 'text-yellow-500' : acertoSimulado >= 50 ? 'text-warning-500' : 'text-danger-500'}`} />
              <div>
                <div className="text-3xl font-black text-foreground">{corretas}/{simuladoQuestoes.length}</div>
                <div className="text-muted-foreground text-sm">questões corretas ({acertoSimulado}%)</div>
              </div>
              <div className={`text-sm font-semibold ${acertoSimulado >= 70 ? 'text-success-600' : acertoSimulado >= 50 ? 'text-warning-500' : 'text-danger-500'}`}>
                {acertoSimulado >= 70 ? '✅ Excelente! Acima da média de aprovação.' : acertoSimulado >= 50 ? '⚠️ Razoável. Continue praticando!' : '❌ Abaixo da média. Revise os erros!'}
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={() => { setSimuladoFinalizado(false); setSimuladoQuestoes([]) }} className="btn-outline btn-md">
                  Novo simulado
                </button>
              </div>
            </div>
          )}

          {/* Simulado em andamento */}
          {simuladoAtivo && simuladoQuestoes.length > 0 && (
            <div className="space-y-4">
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">Simulado em andamento</span>
                  <p className="text-xs text-muted-foreground">{simuladoQuestoes.length} questões · {cd.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{Object.keys(simuladoRespostas).length}/{simuladoQuestoes.length} respondidas</span>
                  <button onClick={finalizarSimulado} className="btn-primary btn-sm">
                    <CheckSquare className="w-4 h-4" /> Finalizar
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(Object.keys(simuladoRespostas).length / simuladoQuestoes.length) * 100}%` }} />
              </div>
              <div className="space-y-4">
                {simuladoQuestoes.map((q, i) => (
                  <QuestaoCard
                    key={i}
                    questao={{ ...q, tipo: simuladoFormat?.tipo ?? 'multipla_escolha' }}
                    index={i}
                    respondida={simuladoRespostas[i] ? { resposta: simuladoRespostas[i], correta: simuladoRespostas[i] === q.gabarito } : undefined}
                    onResponder={(resp) => setSimuladoRespostas(prev => ({ ...prev, [i]: resp }))}
                  />
                ))}
              </div>
              <button onClick={finalizarSimulado} className="btn-primary btn-md w-full">
                <CheckSquare className="w-4 h-4" /> Finalizar e ver resultado
              </button>
            </div>
          )}

          {/* Tela inicial de simulados */}
          {!simuladoAtivo && !simuladoFinalizado && (
            <>
              <div className="card p-5">
                <h2 className="font-bold text-foreground mb-1">Formato oficial — {cd.banca}</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Prova real: {simuladoFormat?.totalQuestoes} questões · {Math.floor((simuladoFormat?.tempoMinutos ?? 240) / 60)}h{(simuladoFormat?.tempoMinutos ?? 0) % 60 > 0 ? `${(simuladoFormat?.tempoMinutos ?? 0) % 60}min` : ''} · {simuladoFormat?.tipo === 'certo_errado' ? 'Certo/Errado' : `Múltipla escolha ${simuladoFormat?.alternativas ?? 5} alt.`}
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: '🟢 Mini-simulado fácil', qtd: 10, desc: '10 questões · ~30min · Aquecimento' },
                    { label: '🟡 Mini-simulado médio', qtd: 20, desc: '20 questões · ~60min · Nível do concurso' },
                    { label: '🔴 Mini-simulado difícil', qtd: 30, desc: '30 questões · ~90min · Acima do nível' },
                  ].map(({ label, qtd, desc }) => (
                    <button
                      key={qtd}
                      onClick={() => iniciarSimulado(qtd)}
                      disabled={loadingSim}
                      className="card p-4 text-left hover:border-brand-400 transition-all hover:bg-brand-50/50 dark:hover:bg-brand-900/10"
                    >
                      <div className="font-bold text-sm text-foreground mb-1">{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-bold text-foreground mb-1">Simulado completo</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Simula a prova real com {simuladoFormat?.totalQuestoes} questões no estilo {cd.banca}
                </p>
                <button
                  onClick={() => iniciarSimulado(simuladoFormat?.totalQuestoes ?? 60)}
                  disabled={loadingSim}
                  className="btn-primary btn-md w-full"
                >
                  {loadingSim ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Gerando simulado...</>
                  ) : (
                    <><Play className="w-4 h-4" /> Iniciar simulado completo — {simuladoFormat?.totalQuestoes} questões</>
                  )}
                </button>
                {simuladoFormat?.cancelamento && (
                  <p className="text-xs text-warning-600 dark:text-warning-400 mt-2 text-center">
                    ⚠️ Este concurso penaliza respostas erradas. Questão errada anula uma certa.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ EDITAL VERTICALIZADO ═══ */}
      {tab === 'edital' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-foreground mb-1">Edital Verticalizado — {cd.label}</h2>
            <p className="text-xs text-muted-foreground mb-4">Marque os tópicos conforme você estuda. Seu progresso é salvo automaticamente.</p>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${allTopicos.length > 0 ? Math.round((topicosEstudados / allTopicos.length) * 100) : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                {topicosEstudados}/{allTopicos.length} tópicos
              </span>
            </div>
          </div>

          {materias.map(materia => {
            const topicos = materia.topicos ?? getDefaultTopicos(materia.nome)
            const estudados = topicos.filter((_, idx) => editalProgress[`${materia.id}_${idx}`]).length
            return (
              <div key={materia.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    {materia.nome}
                  </h3>
                  <span className={`text-xs font-bold ${estudados === topicos.length ? 'text-success-600' : 'text-muted-foreground'}`}>
                    {estudados}/{topicos.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {topicos.map((topico, idx) => {
                    const key = `${materia.id}_${idx}`
                    return (
                      <label key={key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editalProgress[key]}
                          onChange={() => toggleTopic(key)}
                          className="w-4 h-4 rounded accent-brand-500 shrink-0"
                        />
                        <span className={`text-sm flex-1 ${editalProgress[key] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {topico}
                        </span>
                        {editalProgress[key] && <CheckCircle2 className="w-3.5 h-3.5 text-success-500 shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
