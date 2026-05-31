'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ChevronRight, Filter, Brain, X, Sparkles, Loader2, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

type Alt = { letra: string; texto: string }

type Questao = {
  id: string
  enunciado: string
  alternativas: Alt[]
  source: 'OFFICIAL' | 'AI_GENERATED' | 'ADAPTED'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  bancaSlug: string | null
  orgao: string | null
  ano: number | null
  subject: { id: string; name: string; slug: string } | null
}

type Curso = { courseId: string; slug: string; name: string }
type Materia = { subjectId: string; name: string; pct: number; total: number }
type BancaOpt = { slug: string; name: string }

type Estado = 'pendente' | 'enviando' | 'gabarito'

export default function QuestoesPage() {
  const [loading, setLoading] = useState(true)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [bancas, setBancas] = useState<BancaOpt[]>([])
  const [anos, setAnos] = useState<number[]>([])

  // Filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtCurso, setFiltCurso] = useState('')
  const [filtMateria, setFiltMateria] = useState('')
  const [filtSource, setFiltSource] = useState<'' | 'OFFICIAL' | 'AI_GENERATED'>('')
  const [filtDific, setFiltDific] = useState<'' | 'EASY' | 'MEDIUM' | 'HARD'>('')
  const [filtBanca, setFiltBanca] = useState('')
  const [filtAno, setFiltAno] = useState('')

  // Sessão
  const [idxAtual, setIdxAtual] = useState(0)
  const [estado, setEstado] = useState<Estado>('pendente')
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [gabarito, setGabarito] = useState<string | null>(null)
  const [explicacao, setExplicacao] = useState<string | null>(null)
  const [respondidas, setRespondidas] = useState<{ id: string; correct: boolean }[]>([])
  const [startedAt, setStartedAt] = useState<number>(Date.now())

  // IA
  const [loadingIA, setLoadingIA] = useState(false)
  const [respostaIA, setRespostaIA] = useState('')
  const [mostrarExplicacaoIA, setMostrarExplicacaoIA] = useState(false)

  // Carrega cursos + matérias + bancas/anos disponíveis pros filtros
  useEffect(() => {
    Promise.all([
      api.get('/me/cursos').then((r) => r.data).catch(() => ({ cursos: [] })),
      api.get('/me/progresso').then((r) => r.data).catch(() => ({ byMateria: [] })),
      api.get('/me/questoes/filtros').then((r) => r.data).catch(() => ({ bancas: [], anos: [] })),
    ]).then(([c, p, f]) => {
      setCursos(c.cursos ?? [])
      setMaterias(p.byMateria ?? [])
      setBancas(f.bancas ?? [])
      setAnos(f.anos ?? [])
    })
  }, [])

  // Carrega questões (re-fetch quando filtros mudam)
  async function fetchQuestoes() {
    setLoading(true)
    try {
      const params: any = { limit: 30 }
      if (filtCurso) params.courseSlug = cursos.find((c) => c.courseId === filtCurso)?.slug
      if (filtMateria) params.subjectId = filtMateria
      if (filtSource) params.source = filtSource
      if (filtDific) params.difficulty = filtDific
      if (filtBanca) params.bancaSlug = filtBanca
      if (filtAno) params.ano = filtAno
      const { data } = await api.get('/me/questoes', { params })
      setQuestoes(data.questions ?? [])
      setIdxAtual(0)
      setEstado('pendente')
      setSelecionada(null)
      setGabarito(null)
      setExplicacao(null)
      setRespostaIA('')
      setStartedAt(Date.now())
    } catch {
      toast.error('Erro ao carregar questões')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchQuestoes() }, [])

  function aplicarFiltros() {
    setMostrarFiltros(false)
    fetchQuestoes()
  }
  function limparFiltros() {
    setFiltCurso(''); setFiltMateria(''); setFiltSource(''); setFiltDific(''); setFiltBanca(''); setFiltAno('')
  }

  const questao = questoes[idxAtual]

  async function responder() {
    if (!selecionada || !questao) return
    setEstado('enviando')
    try {
      const timeMs = Date.now() - startedAt
      const { data } = await api.post(`/me/questoes/${questao.id}/attempt`, { selected: selecionada, timeMs })
      setGabarito(data.gabarito)
      setExplicacao(data.explicacao)
      setRespondidas((r) => [...r, { id: questao.id, correct: data.correct }])
      setEstado('gabarito')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao enviar resposta')
      setEstado('pendente')
    }
  }

  function proximaQuestao() {
    setEstado('pendente'); setSelecionada(null); setGabarito(null); setExplicacao(null)
    setRespostaIA(''); setMostrarExplicacaoIA(false)
    setStartedAt(Date.now())
    if (idxAtual + 1 >= questoes.length) {
      // Ao final do batch, refetch pra trazer questões novas (e talvez não respondidas)
      fetchQuestoes()
    } else {
      setIdxAtual((i) => i + 1)
    }
  }

  async function pedirExplicacaoIA() {
    if (!questao) return
    if (respostaIA) { setMostrarExplicacaoIA((v) => !v); return }
    setMostrarExplicacaoIA(true)
    setLoadingIA(true)
    try {
      const prompt = `Explique de forma didática essa questão de concurso (${questao.bancaSlug ?? '?'} ${questao.ano ?? '?'}):

Enunciado: ${questao.enunciado}

Alternativas:
${questao.alternativas.map((a) => `${a.letra}) ${a.texto}`).join('\n')}

Gabarito: ${gabarito ?? '?'}
Matéria: ${questao.subject?.name ?? '?'}

1. Por que a alternativa correta está certa
2. Por que as outras estão erradas
3. Uma dica de memorização`
      const res = await api.post('/ai/chat', { message: prompt, history: [] })
      setRespostaIA(res.data.response)
    } catch {
      setRespostaIA(explicacao ?? 'Não foi possível gerar explicação agora.')
    } finally {
      setLoadingIA(false)
    }
  }

  const acertos = respondidas.filter((r) => r.correct).length
  const taxa = respondidas.length > 0 ? Math.round((acertos / respondidas.length) * 100) : 0
  const filtrosAtivos = !!(filtCurso || filtMateria || filtSource || filtDific || filtBanca || filtAno)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  // EMPTY STATE: nenhuma questão no banco
  if (questoes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4 animate-fade-in">
        <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h1 className="text-2xl font-black">Nenhuma questão disponível ainda</h1>
        <p className="text-muted-foreground text-sm">
          {filtrosAtivos
            ? <>Os filtros que você escolheu não retornaram nada. Tenta limpar os filtros ou ajustar.</>
            : <>Ainda não importamos questões oficiais pra essas matérias. Avisa o admin pra subir provas anteriores.</>
          }
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {filtrosAtivos && (
            <button onClick={() => { limparFiltros(); fetchQuestoes() }} className="btn-primary btn-md">
              Limpar filtros
            </button>
          )}
          <Link href="/dashboard/cronograma" className="btn-outline btn-md">
            Voltar ao cronograma
          </Link>
        </div>
      </div>
    )
  }

  const corAlternativa = (letra: string) => {
    if (estado !== 'gabarito') {
      return selecionada === letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-border hover:border-brand-300 hover:bg-muted'
    }
    if (letra === gabarito) return 'border-success-500 bg-success-50 dark:bg-success-900/20'
    if (letra === selecionada && letra !== gabarito) return 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
    return 'border-border opacity-60'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Banco de Questões</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {questoes.length} disponíveis • {respondidas.length} respondidas{respondidas.length > 0 ? ` • ${taxa}% acerto` : ''}
          </p>
        </div>
        <button onClick={() => setMostrarFiltros((v) => !v)}
          className={cn('btn-outline btn-sm', filtrosAtivos && 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-900/20')}>
          <Filter className="w-3.5 h-3.5" /> Filtros {filtrosAtivos && '●'}
        </button>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="card p-5 space-y-4 border-brand-200 dark:border-brand-800/40 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Filtrar questões</h3>
            <button onClick={() => setMostrarFiltros(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Curso</label>
              <select className="input" value={filtCurso} onChange={(e) => setFiltCurso(e.target.value)}>
                <option value="">Todos meus cursos</option>
                {cursos.map((c) => <option key={c.courseId} value={c.courseId}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Matéria</label>
              <select className="input" value={filtMateria} onChange={(e) => setFiltMateria(e.target.value)}>
                <option value="">Todas</option>
                {materias.map((m) => <option key={m.subjectId} value={m.subjectId}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={filtSource} onChange={(e) => setFiltSource(e.target.value as any)}>
                <option value="">Qualquer origem</option>
                <option value="OFFICIAL">📜 Oficial (prova real)</option>
                <option value="AI_GENERATED">🤖 Gerada por IA</option>
              </select>
            </div>
            <div>
              <label className="label">Dificuldade</label>
              <select className="input" value={filtDific} onChange={(e) => setFiltDific(e.target.value as any)}>
                <option value="">Todas</option>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Média</option>
                <option value="HARD">Difícil</option>
              </select>
            </div>
            <div>
              <label className="label">Banca</label>
              <select className="input" value={filtBanca} onChange={(e) => setFiltBanca(e.target.value)}>
                <option value="">Todas</option>
                {bancas.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ano</label>
              <select className="input" value={filtAno} onChange={(e) => setFiltAno(e.target.value)}>
                <option value="">Todos</option>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={aplicarFiltros} className="btn-primary btn-md flex-1">Aplicar filtros</button>
            <button onClick={() => { limparFiltros() }} className="btn-ghost btn-md">Limpar</button>
          </div>
        </div>
      )}

      {/* Metadata da questão */}
      <div className="flex flex-wrap gap-2 text-xs">
        {questao.bancaSlug && <span className="badge-blue uppercase">{questao.bancaSlug}</span>}
        {questao.orgao && <span className="badge-purple">{questao.orgao}{questao.ano ? ` ${questao.ano}` : ''}</span>}
        {questao.subject && <span className="badge-yellow">{questao.subject.name}</span>}
        <span className={cn('badge', questao.difficulty === 'EASY' ? 'badge-green' : questao.difficulty === 'MEDIUM' ? 'badge-yellow' : 'badge-red')}>
          {questao.difficulty === 'EASY' ? 'Fácil' : questao.difficulty === 'MEDIUM' ? 'Médio' : 'Difícil'}
        </span>
        <span className={cn('badge', questao.source === 'OFFICIAL' ? 'badge-green' : 'badge py-0.5 px-2 bg-muted text-muted-foreground')}>
          {questao.source === 'OFFICIAL' ? '📜 Oficial' : '🤖 IA'}
        </span>
      </div>

      {/* Progresso do batch */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${Math.max(((idxAtual + 1) / Math.max(questoes.length, 1)) * 100, 3)}%` }} />
      </div>

      {/* Enunciado + alternativas */}
      <div className="card p-5">
        <div className="flex items-start gap-2 mb-4">
          <span className="badge-blue shrink-0">Q{idxAtual + 1}/{questoes.length}</span>
          <p className="text-foreground font-medium leading-relaxed whitespace-pre-wrap">{questao.enunciado}</p>
        </div>

        {questao.alternativas.length === 0 ? (
          // CERTO/ERRADO (Cebraspe)
          <div className="grid grid-cols-2 gap-3">
            {[{ l: 'C', label: 'CERTO' }, { l: 'E', label: 'ERRADO' }].map(({ l, label }) => (
              <button key={l} disabled={estado !== 'pendente'} onClick={() => setSelecionada(l)}
                className={cn('p-4 rounded-xl border-2 font-bold transition-all', corAlternativa(l))}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {questao.alternativas.map((alt) => (
              <button key={alt.letra} disabled={estado !== 'pendente'}
                onClick={() => setSelecionada(alt.letra)}
                className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left', corAlternativa(alt.letra))}>
                <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0',
                  estado === 'gabarito' && alt.letra === gabarito ? 'border-success-500 bg-success-500 text-white' :
                    estado === 'gabarito' && alt.letra === selecionada && alt.letra !== gabarito ? 'border-danger-500 bg-danger-500 text-white' :
                      selecionada === alt.letra ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground')}>
                  {estado === 'gabarito' && alt.letra === gabarito ? <CheckCircle2 className="w-4 h-4" /> :
                    estado === 'gabarito' && alt.letra === selecionada && alt.letra !== gabarito ? <XCircle className="w-4 h-4" /> :
                      alt.letra}
                </span>
                <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-3 flex-wrap">
          {estado === 'pendente' ? (
            <button onClick={responder} disabled={!selecionada} className="btn-primary btn-md flex-1">
              Confirmar resposta
            </button>
          ) : estado === 'enviando' ? (
            <button disabled className="btn-primary btn-md flex-1"><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</button>
          ) : (
            <>
              <button onClick={pedirExplicacaoIA} className="btn-outline btn-md flex-1">
                {loadingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {mostrarExplicacaoIA ? 'Ocultar' : 'Explicação'} IA
              </button>
              <button onClick={proximaQuestao} className="btn-primary btn-md flex-1">
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Explicação da IA */}
      {mostrarExplicacaoIA && estado === 'gabarito' && (
        <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm text-foreground">Explicação do Mentor IA</span>
          </div>
          {loadingIA ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-sm text-muted-foreground">Gerando explicação…</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-strong:text-foreground text-muted-foreground">
              <ReactMarkdown>{respostaIA || explicacao || 'Sem explicação cadastrada.'}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
