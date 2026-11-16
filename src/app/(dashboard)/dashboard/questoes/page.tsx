'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight, Filter, Brain, X, Sparkles, Loader2, BookOpen, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import InlineStudyTimer from '@/components/InlineStudyTimer'
import { AvisoOriginal, TextoBase, TextoFormatado } from '@/components/provas/comum'

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
  topic?: { id: string; name: string } | null
  prova?: { id?: string; titulo: string; pdfUrl: string | null } | null
  // Item de prova oficial: o comando e o texto-base sem os quais ele não se responde.
  comando?: string | null
  provaTexto?: { titulo: string; conteudo: string } | null
  temFigura?: boolean
  temFormula?: boolean
  paginaProva?: number | null
}

type Curso = { courseId: string; slug: string; name: string }
type Opcao = { id: string; name: string; total: number }
type ProvaOpcao = { id: string; titulo: string; ano: number; total: number }
type BancaOpcao = { slug: string; name: string }

type Situacao = 'nao-feitas' | 'erradas' | 'todas'
// `curso` guarda o slug: a busca não precisa esperar a lista de cursos chegar.
type Filtros = {
  curso: string; materia: string; assunto: string; prova: string; banca: string; ano: string
  origem: '' | 'OFFICIAL' | 'AI_GENERATED'; dificuldade: '' | 'EASY' | 'MEDIUM' | 'HARD'
}
type Estado = 'pendente' | 'enviando' | 'gabarito'
type Explicacao = { texto: string; origem: 'cadastrada' | 'cache' | 'ia' }

const SEM_FILTROS: Filtros = { curso: '', materia: '', assunto: '', prova: '', banca: '', ano: '', origem: '', dificuldade: '' }
const CHAVE_PREFERENCIAS = 'questoes:preferencias:v1'
// Faltando esta quantidade para o fim do que já veio, a próxima página já é
// buscada em segundo plano: o aluno nunca espera ao clicar em "Próxima".
const PREBUSCA = 5

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'nao-feitas', rotulo: 'Não feitas' },
  { valor: 'erradas', rotulo: 'Que errei' },
  { valor: 'todas', rotulo: 'Todas' },
]

function lerPreferencias(): { filtros: Filtros; situacao: Situacao } {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? 'null')
    if (salvo && typeof salvo === 'object') {
      return {
        filtros: { ...SEM_FILTROS, ...(salvo.filtros ?? {}) },
        situacao: SITUACOES.some((s) => s.valor === salvo.situacao) ? salvo.situacao : 'nao-feitas',
      }
    }
  } catch {}
  return { filtros: SEM_FILTROS, situacao: 'nao-feitas' }
}

function guardarPreferencias(filtros: Filtros, situacao: Situacao) {
  try { localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ filtros, situacao })) } catch {}
}

const ehCertoErrado = (q: Questao) =>
  q.alternativas.length === 0 || (q.alternativas.length === 2 && q.alternativas.every((a) => a.letra === 'C' || a.letra === 'E'))

export default function QuestoesPage() {
  // Lista: o que já chegou + o cursor da próxima página.
  const [carregando, setCarregando] = useState(true)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [buscandoMais, setBuscandoMais] = useState(false)
  const buscandoMaisRef = useRef(false)
  // Cada busca nova ganha um número; resposta de busca antiga (filtro trocado
  // no meio do caminho) é descartada em vez de sobrescrever a atual.
  const geracao = useRef(0)

  // Filtros aplicados, rascunho do painel e opções disponíveis.
  const [situacao, setSituacao] = useState<Situacao>('nao-feitas')
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [rascunho, setRascunho] = useState<Filtros>(SEM_FILTROS)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [materias, setMaterias] = useState<Opcao[]>([])
  const [assuntos, setAssuntos] = useState<Opcao[]>([])
  const [provas, setProvas] = useState<ProvaOpcao[]>([])
  const [bancas, setBancas] = useState<BancaOpcao[]>([])
  const [anos, setAnos] = useState<number[]>([])

  // Questão atual.
  const [idx, setIdx] = useState(0)
  const [estado, setEstado] = useState<Estado>('pendente')
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [gabarito, setGabarito] = useState<string | null>(null)
  const [comentario, setComentario] = useState<string | null>(null)
  const [respondidas, setRespondidas] = useState<{ id: string; correct: boolean }[]>([])
  const inicioRef = useRef(Date.now())

  // Explicação (IA com cache por questão).
  const [explicacao, setExplicacao] = useState<Explicacao | null>(null)
  const [carregandoExplicacao, setCarregandoExplicacao] = useState(false)

  const cartaoRef = useRef<HTMLDivElement>(null)
  const proximaRef = useRef<HTMLButtonElement>(null)

  const questao: Questao | undefined = questoes[idx]
  const certoErrado = questao ? ehCertoErrado(questao) : false
  const filtrosAtivos = Object.values(filtros).some(Boolean)

  function paramsDe(f: Filtros, s: Situacao, depoisDe: string | null) {
    const p: Record<string, string | number> = { limit: 30, situacao: s }
    if (f.curso) p.courseSlug = f.curso
    if (f.materia) p.subjectId = f.materia
    if (f.assunto) p.topicId = f.assunto
    if (f.prova) p.provaId = f.prova
    if (f.banca) p.bancaSlug = f.banca
    if (f.ano) p.ano = f.ano
    if (f.origem) p.source = f.origem
    if (f.dificuldade) p.difficulty = f.dificuldade
    if (depoisDe) p.cursor = depoisDe
    return p
  }

  function limparQuestao() {
    setEstado('pendente'); setSelecionada(null); setGabarito(null); setComentario(null)
    setExplicacao(null); setCarregandoExplicacao(false)
    inicioRef.current = Date.now()
  }

  async function buscar(f: Filtros, s: Situacao) {
    const minha = ++geracao.current
    buscandoMaisRef.current = false
    setBuscandoMais(false)
    setCarregando(true)
    try {
      const { data } = await api.get('/me/questoes', { params: paramsDe(f, s, null) })
      if (minha !== geracao.current) return
      setQuestoes(data.questions ?? [])
      setCursor(data.nextCursor ?? null)
      setTotal(data.total ?? 0)
      setIdx(0)
      limparQuestao()
    } catch {
      if (minha === geracao.current) toast.error('Erro ao carregar questões')
    } finally {
      if (minha === geracao.current) setCarregando(false)
    }
  }

  async function buscarMais() {
    if (!cursor || buscandoMaisRef.current) return
    buscandoMaisRef.current = true
    setBuscandoMais(true)
    const minha = geracao.current
    try {
      const { data } = await api.get('/me/questoes', { params: paramsDe(filtros, situacao, cursor) })
      if (minha !== geracao.current) return
      setQuestoes((atuais) => {
        const vistas = new Set(atuais.map((q) => q.id))
        return [...atuais, ...((data.questions ?? []) as Questao[]).filter((q) => !vistas.has(q.id))]
      })
      setCursor(data.nextCursor ?? null)
    } catch {
      // Sem toast: é busca de fundo; a próxima troca de questão tenta de novo.
    } finally {
      if (minha === geracao.current) { buscandoMaisRef.current = false; setBuscandoMais(false) }
    }
  }

  // Primeira carga: preferências salvas + opções dos filtros, tudo em paralelo.
  useEffect(() => {
    const salvas = lerPreferencias()
    setFiltros(salvas.filtros)
    setRascunho(salvas.filtros)
    setSituacao(salvas.situacao)
    api.get('/me/questoes/filtros').then(({ data }) => {
      setMaterias(data.materias ?? []); setProvas(data.provas ?? []); setBancas(data.bancas ?? []); setAnos(data.anos ?? [])
    }).catch(() => {})
    api.get('/me/cursos').then(({ data }) => setCursos(data.cursos ?? [])).catch(() => {})
    buscar(salvas.filtros, salvas.situacao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Assuntos dependem da matéria escolhida no painel.
  useEffect(() => {
    if (!rascunho.materia) { setAssuntos([]); return }
    let vivo = true
    api.get('/me/questoes/filtros', { params: { subjectId: rascunho.materia } })
      .then(({ data }) => { if (vivo) setAssuntos(data.assuntos ?? []) })
      .catch(() => { if (vivo) setAssuntos([]) })
    return () => { vivo = false }
  }, [rascunho.materia])

  // Pré-busca: perto do fim do que já chegou, traz a próxima página.
  useEffect(() => {
    if (!carregando && cursor && questoes.length - idx <= PREBUSCA) buscarMais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questoes.length, cursor, carregando])

  // Depois de corrigir, o foco vai para "Próxima": Enter segue, e no celular a tela rola até ele.
  useEffect(() => {
    if (estado === 'gabarito') proximaRef.current?.focus()
  }, [estado])

  async function responder() {
    if (!selecionada || !questao || estado !== 'pendente') return
    setEstado('enviando')
    try {
      const { data } = await api.post(`/me/questoes/${questao.id}/attempt`, {
        selected: selecionada,
        timeMs: Date.now() - inicioRef.current,
      })
      setGabarito(data.gabarito)
      setComentario(data.explicacao?.trim() ? data.explicacao : null)
      setRespondidas((r) => [...r, { id: questao.id, correct: data.correct }])
      setEstado('gabarito')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao enviar resposta')
      setEstado('pendente')
    }
  }

  function proxima() {
    limparQuestao()
    setIdx((i) => i + 1)
    const topo = cartaoRef.current?.getBoundingClientRect().top ?? 0
    if (topo < 0) cartaoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  async function pedirExplicacao() {
    if (!questao || estado !== 'gabarito' || carregandoExplicacao) return
    if (explicacao) { setExplicacao(null); return }
    setCarregandoExplicacao(true)
    try {
      const { data } = await api.post(`/me/questoes/${questao.id}/explicacao`)
      setExplicacao({ texto: data.texto, origem: data.origem })
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível gerar a explicação agora.')
    } finally {
      setCarregandoExplicacao(false)
    }
  }

  function aplicar(f: Filtros, s: Situacao) {
    setFiltros(f); setRascunho(f); setSituacao(s)
    guardarPreferencias(f, s)
    setMostrarFiltros(false)
    buscar(f, s)
  }

  // Atalhos: letra marca a alternativa (C/E no certo-ou-errado), Enter confirma
  // e depois avança, → avança, X abre a explicação.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || !questao) return
      const alvo = e.target as HTMLElement | null
      if (alvo && (['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo.tagName) || alvo.isContentEditable)) return
      // Botão ou link fora do cartão (filtros, menu) segue com o comportamento normal.
      if (alvo && ['BUTTON', 'A'].includes(alvo.tagName) && !cartaoRef.current?.contains(alvo)) return
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
      if (estado === 'pendente') {
        const letras = certoErrado ? ['C', 'E'] : questao.alternativas.map((a) => a.letra.toUpperCase())
        if (letras.includes(k)) { e.preventDefault(); setSelecionada(k); return }
        if (k === 'Enter' && selecionada) { e.preventDefault(); responder() }
      } else if (estado === 'gabarito') {
        if (k === 'Enter' || k === 'ArrowRight' || k === 'N') { e.preventDefault(); proxima() }
        else if (k === 'X') { e.preventDefault(); pedirExplicacao() }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const acertos = respondidas.filter((r) => r.correct).length
  const taxa = respondidas.length > 0 ? Math.round((acertos / respondidas.length) * 100) : 0

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
      {/* Cronômetro de questões (registra no "Meu tempo") */}
      <InlineStudyTimer
        storageKey="timer:questoes"
        defaultType="QUESTOES"
        title="🎯 Cronômetro de questões"
        labelPresets={['Questões em geral', 'Questões específicas']}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-foreground">Banco de Questões</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {carregando ? 'Carregando…' : `${total} no filtro`} • {respondidas.length} respondidas agora{respondidas.length > 0 ? ` • ${taxa}% de acerto` : ''}
          </p>
        </div>
        <button onClick={() => setMostrarFiltros((v) => !v)} aria-expanded={mostrarFiltros}
          className={cn('btn-outline btn-sm shrink-0', filtrosAtivos && 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-900/20')}>
          <Filter className="w-3.5 h-3.5" /> Filtros {filtrosAtivos && '●'}
        </button>
      </div>

      {/* Situação: o atalho mais usado fica fora do painel */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quais questões mostrar">
        {SITUACOES.map((s) => (
          <button key={s.valor} onClick={() => s.valor !== situacao && aplicar(filtros, s.valor)} aria-pressed={situacao === s.valor}
            className={cn('px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
              situacao === s.valor ? 'border-brand-500 bg-brand-500 text-white' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted')}>
            {s.rotulo}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="card p-5 space-y-4 border-brand-200 dark:border-brand-800/40 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Filtrar questões</h3>
            <button onClick={() => setMostrarFiltros(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar filtros">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-curso">Curso</label>
              <select id="f-curso" className="input" value={rascunho.curso} onChange={(e) => setRascunho((r) => ({ ...r, curso: e.target.value }))}>
                <option value="">Todos meus cursos</option>
                {cursos.map((c) => <option key={c.courseId} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-materia">Matéria</label>
              <select id="f-materia" className="input" value={rascunho.materia} onChange={(e) => setRascunho((r) => ({ ...r, materia: e.target.value, assunto: '' }))}>
                <option value="">Todas</option>
                {materias.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.total})</option>)}
              </select>
            </div>
            {rascunho.materia && assuntos.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label" htmlFor="f-assunto">Assunto</label>
                <select id="f-assunto" className="input" value={rascunho.assunto} onChange={(e) => setRascunho((r) => ({ ...r, assunto: e.target.value }))}>
                  <option value="">Todos os assuntos da matéria</option>
                  {assuntos.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.total})</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-prova">Prova de origem</label>
              <select id="f-prova" className="input" value={rascunho.prova} onChange={(e) => setRascunho((r) => ({ ...r, prova: e.target.value }))}>
                <option value="">Qualquer prova</option>
                {provas.map((p) => <option key={p.id} value={p.id}>{p.titulo} ({p.total})</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-banca">Banca</label>
              <select id="f-banca" className="input" value={rascunho.banca} onChange={(e) => setRascunho((r) => ({ ...r, banca: e.target.value }))}>
                <option value="">Todas</option>
                {bancas.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-ano">Ano</label>
              <select id="f-ano" className="input" value={rascunho.ano} onChange={(e) => setRascunho((r) => ({ ...r, ano: e.target.value }))}>
                <option value="">Todos</option>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-origem">Origem</label>
              <select id="f-origem" className="input" value={rascunho.origem} onChange={(e) => setRascunho((r) => ({ ...r, origem: e.target.value as Filtros['origem'] }))}>
                <option value="">Qualquer origem</option>
                <option value="OFFICIAL">📜 Oficial (prova real)</option>
                <option value="AI_GENERATED">🤖 Gerada por IA</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-dific">Dificuldade</label>
              <select id="f-dific" className="input" value={rascunho.dificuldade} onChange={(e) => setRascunho((r) => ({ ...r, dificuldade: e.target.value as Filtros['dificuldade'] }))}>
                <option value="">Todas</option>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Média</option>
                <option value="HARD">Difícil</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => aplicar(rascunho, situacao)} className="btn-primary btn-md flex-1">Aplicar filtros</button>
            <button onClick={() => setRascunho(SEM_FILTROS)} className="btn-ghost btn-md">Limpar</button>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="card p-5 space-y-3 animate-pulse" aria-busy="true" aria-label="Carregando questões">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="h-14 rounded-xl bg-muted" />
            <div className="h-14 rounded-xl bg-muted" />
          </div>
        </div>
      ) : !questao ? (
        cursor ? (
          // Ainda há página no servidor: ou está chegando, ou a busca de fundo falhou.
          <div className="card p-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            {buscandoMais
              ? <><Loader2 className="w-5 h-5 animate-spin text-brand-500" /> Carregando mais questões…</>
              : <>Não deu para carregar as próximas. <button onClick={buscarMais} className="btn-outline btn-sm">Tentar de novo</button></>}
          </div>
        ) : (
          <FimDaLista
            situacao={situacao}
            vazio={questoes.length === 0}
            filtrosAtivos={filtrosAtivos}
            onSituacao={(s) => aplicar(filtros, s)}
            onLimpar={() => aplicar(SEM_FILTROS, situacao)}
          />
        )
      ) : (
        <>
          {/* Metadata da questão */}
          <div className="flex flex-wrap gap-2 text-xs">
            {questao.bancaSlug && <span className="badge-blue uppercase">{questao.bancaSlug}</span>}
            {questao.orgao && <span className="badge-purple">{questao.orgao}{questao.ano ? ` ${questao.ano}` : ''}</span>}
            {questao.subject && <span className="badge-yellow">{questao.subject.name}</span>}
            {questao.topic && <span className="badge py-0.5 px-2 bg-muted text-muted-foreground">{questao.topic.name}</span>}
            <span className={cn('badge', questao.difficulty === 'EASY' ? 'badge-green' : questao.difficulty === 'MEDIUM' ? 'badge-yellow' : 'badge-red')}>
              {questao.difficulty === 'EASY' ? 'Fácil' : questao.difficulty === 'MEDIUM' ? 'Médio' : 'Difícil'}
            </span>
            <span className={cn('badge', questao.source === 'OFFICIAL' ? 'badge-green' : 'badge py-0.5 px-2 bg-muted text-muted-foreground')}>
              {questao.source === 'OFFICIAL' ? '📜 Oficial' : '🤖 IA'}
            </span>
          </div>

          {/* Enunciado + alternativas */}
          <div ref={cartaoRef} className="card p-5 scroll-mt-4">
            {questao.prova && <p className="text-xs text-muted-foreground mb-3">{questao.prova.titulo}</p>}
            {questao.provaTexto && (
              <div className="mb-3">
                <TextoBase key={questao.id} texto={{ id: questao.id, codigo: '', titulo: questao.provaTexto.titulo, conteudo: questao.provaTexto.conteudo }} abertoInicial />
              </div>
            )}
            {questao.comando && <TextoFormatado texto={questao.comando} className="text-sm text-muted-foreground leading-relaxed mb-3" />}
            <div className="flex items-start gap-2 mb-4">
              <span className="badge-blue shrink-0">Q{idx + 1}</span>
              <TextoFormatado texto={questao.enunciado} className="text-foreground font-medium leading-relaxed" />
            </div>
            {(questao.temFigura || questao.temFormula) && (
              <div className="mb-4">
                <AvisoOriginal caderno={questao.prova?.pdfUrl ?? null} item={{ id: questao.id, numero: null, materia: null, comando: null, enunciado: '', alternativas: [], textoId: null, figura: !!questao.temFigura, formula: !!questao.temFormula, pagina: questao.paginaProva ?? null, anulada: false }} />
              </div>
            )}

            {certoErrado ? (
              // CERTO/ERRADO (Cebraspe)
              <div className="grid grid-cols-2 gap-3">
                {[{ l: 'C', label: 'CERTO' }, { l: 'E', label: 'ERRADO' }].map(({ l, label }) => (
                  <button key={l} disabled={estado !== 'pendente'} onClick={() => setSelecionada(l)} aria-pressed={selecionada === l}
                    className={cn('p-4 rounded-xl border-2 font-bold transition-all', corAlternativa(l))}>
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {questao.alternativas.map((alt) => (
                  <button key={alt.letra} disabled={estado !== 'pendente'} aria-pressed={selecionada === alt.letra}
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

            {estado === 'gabarito' && (
              <p className={cn('mt-4 text-sm font-semibold flex items-center gap-1.5', selecionada === gabarito ? 'text-success-600' : 'text-danger-600')} role="status">
                {selecionada === gabarito ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {selecionada === gabarito
                  ? 'Você acertou.'
                  : `Gabarito: ${certoErrado ? (gabarito === 'C' ? 'Certo' : 'Errado') : gabarito}.`}
              </p>
            )}

            <div className="mt-5 flex gap-3 flex-wrap">
              {estado === 'pendente' ? (
                <button onClick={responder} disabled={!selecionada} className="btn-primary btn-md flex-1">
                  Confirmar resposta
                </button>
              ) : estado === 'enviando' ? (
                <button disabled className="btn-primary btn-md flex-1"><Loader2 className="w-4 h-4 animate-spin" /> Corrigindo…</button>
              ) : (
                <>
                  <button onClick={pedirExplicacao} className="btn-outline btn-md flex-1" aria-expanded={!!explicacao}>
                    {carregandoExplicacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    {explicacao ? 'Ocultar explicação' : 'Por que?'}
                  </button>
                  <button ref={proximaRef} onClick={proxima} className="btn-primary btn-md flex-1">
                    Próxima <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="hidden sm:block mt-3 text-xs text-muted-foreground">
              Atalhos: <kbd className="px-1 rounded border border-border">{certoErrado ? 'C' : 'A'}</kbd>–<kbd className="px-1 rounded border border-border">E</kbd> marca ·{' '}
              <kbd className="px-1 rounded border border-border">Enter</kbd> confirma e avança · <kbd className="px-1 rounded border border-border">X</kbd> explicação
            </p>
          </div>

          {/* Comentário cadastrado: aparece na hora, sem IA */}
          {estado === 'gabarito' && comentario && !explicacao && (
            <div className="card p-5">
              <p className="font-semibold text-sm text-foreground mb-2">Comentário</p>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 text-muted-foreground">
                <ReactMarkdown>{comentario}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Explicação */}
          {estado === 'gabarito' && (carregandoExplicacao || explicacao) && (
            <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm text-foreground">Por que esse é o gabarito</span>
              </div>
              {carregandoExplicacao ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  <span className="text-sm text-muted-foreground">Gerando a explicação… (só a primeira vez demora; depois fica salva para todos)</span>
                </div>
              ) : explicacao && (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-strong:text-foreground text-muted-foreground">
                    <ReactMarkdown>{explicacao.texto}</ReactMarkdown>
                  </div>
                  {explicacao.origem !== 'cadastrada' && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Explicação gerada por IA a partir do gabarito oficial. Confira sempre na lei e no seu material.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FimDaLista({ situacao, vazio, filtrosAtivos, onSituacao, onLimpar }: {
  situacao: Situacao
  vazio: boolean
  filtrosAtivos: boolean
  onSituacao: (s: Situacao) => void
  onLimpar: () => void
}) {
  const titulo = situacao === 'nao-feitas'
    ? (vazio ? 'Você já respondeu todas as questões deste filtro' : 'Você chegou ao fim das questões que ainda não tinha feito')
    : situacao === 'erradas'
      ? (vazio ? 'Nenhuma questão errada pendente aqui' : 'Fim das questões que você tinha errado')
      : (vazio ? 'Nenhuma questão disponível ainda' : 'Você chegou ao fim deste filtro')
  return (
    <div className="card py-12 px-6 text-center space-y-4">
      <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
      <h2 className="text-lg font-bold">{titulo}</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {situacao !== 'erradas' && (
          <button onClick={() => onSituacao('erradas')} className="btn-primary btn-md">
            <RotateCcw className="w-4 h-4" /> Refazer as que errei
          </button>
        )}
        {situacao !== 'todas' && <button onClick={() => onSituacao('todas')} className="btn-outline btn-md">Ver todas</button>}
        {filtrosAtivos && <button onClick={onLimpar} className="btn-outline btn-md">Limpar filtros</button>}
        <Link href="/dashboard/cronograma" className="btn-ghost btn-md">Voltar ao cronograma</Link>
      </div>
    </div>
  )
}
