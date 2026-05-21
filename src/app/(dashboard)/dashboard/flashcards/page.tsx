'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, Plus, CheckCircle2, Loader2, Sparkles, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Flashcard = {
  id: string
  frente: string
  verso: string
  subjectId: string | null
  subjectName: string | null
  isAI: boolean
  due: boolean
  lastReview: { quality: number; nextReview: string; interval: number } | null
}

type Materia = { subjectId: string; name: string }

export default function FlashcardsPage() {
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [filtMateria, setFiltMateria] = useState<string>('')
  const [onlyDue, setOnlyDue] = useState(false)

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [session, setSession] = useState({ facil: 0, ok: 0, dificil: 0 })

  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [novaFrente, setNovaFrente] = useState('')
  const [novaVerso, setNovaVerso] = useState('')
  const [novaSubject, setNovaSubject] = useState('')
  const [gerando, setGerando] = useState(false)
  const [genSubject, setGenSubject] = useState('')
  const [genQuantidade, setGenQuantidade] = useState(5)

  async function load() {
    setLoading(true)
    try {
      const params: any = {}
      if (filtMateria) params.subjectId = filtMateria
      if (onlyDue) params.onlyDue = 'true'
      const [{ data }, prog] = await Promise.all([
        api.get('/me/flashcards', { params }),
        api.get('/me/progresso').then((r) => r.data).catch(() => ({ byMateria: [] })),
      ])
      setCards(data.flashcards ?? [])
      setMaterias((prog.byMateria ?? []).map((m: any) => ({ subjectId: m.subjectId, name: m.name })))
      setIdx(0); setFlipped(false); setSession({ facil: 0, ok: 0, dificil: 0 })
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filtMateria, onlyDue])

  async function rate(quality: number) {
    const card = cards[idx]
    if (!card) return
    try {
      await api.post(`/me/flashcards/${card.id}/review`, { quality })
      setSession((s) => ({
        facil: quality >= 4 ? s.facil + 1 : s.facil,
        ok: quality === 3 ? s.ok + 1 : s.ok,
        dificil: quality < 3 ? s.dificil + 1 : s.dificil,
      }))
      // próximo
      if (idx + 1 >= cards.length) {
        // Terminou — recarrega (pra trazer próximos due, se houver)
        await load()
      } else {
        setIdx((i) => i + 1)
        setFlipped(false)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar revisão')
    }
  }

  async function criarCustom() {
    if (!novaFrente.trim() || !novaVerso.trim()) {
      return toast.error('Preencha frente e verso')
    }
    try {
      await api.post('/me/flashcards', {
        frente: novaFrente, verso: novaVerso,
        subjectId: novaSubject || undefined,
      })
      toast.success('Flashcard criado!')
      setNovaFrente(''); setNovaVerso(''); setShowCreate(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function gerarComIA() {
    if (!genSubject) return toast.error('Escolha a matéria')
    setGerando(true)
    try {
      const subjectName = materias.find((m) => m.subjectId === genSubject)?.name ?? ''
      const prompt = `Gere ${genQuantidade} flashcards em formato JSON pra estudo de concurso sobre a matéria "${subjectName}".

Retorne APENAS array JSON (sem markdown): [{"frente": "pergunta curta", "verso": "resposta detalhada com explicação e dica de prova"}]
Frente: pergunta direta (max 200 chars). Verso: resposta + 1-2 frases de contexto + dica memorável.`
      const { data } = await api.post('/ai/gerar', { prompt, task: 'generate' })
      const parsed = JSON.parse(data.text.replace(/^```json\s*|\s*```$/g, ''))
      if (!Array.isArray(parsed)) throw new Error('Resposta IA inesperada')
      for (const card of parsed) {
        await api.post('/me/flashcards', {
          frente: card.frente, verso: card.verso, subjectId: genSubject,
        }).catch(() => null)
      }
      toast.success(`${parsed.length} flashcards criados!`)
      setShowGenerate(false)
      load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro na geração IA')
    } finally { setGerando(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  const card = cards[idx]
  const finished = !card || idx >= cards.length

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" /> Flashcards
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {cards.length} disponíveis · {cards.filter((c) => c.due).length} pra revisar hoje
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-outline btn-sm">
            <Plus className="w-3.5 h-3.5" /> Criar
          </button>
          <button onClick={() => setShowGenerate(true)} className="btn-primary btn-sm">
            <Sparkles className="w-3.5 h-3.5" /> Gerar IA
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={filtMateria} onChange={(e) => setFiltMateria(e.target.value)}
          className="text-sm rounded-lg border border-border bg-background px-2 py-1.5">
          <option value="">Todas as matérias</option>
          {materias.map((m) => <option key={m.subjectId} value={m.subjectId}>{m.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
          Só pra revisar hoje
        </label>
      </div>

      {/* Sessão atual */}
      {session.facil + session.ok + session.dificil > 0 && (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="card p-2 text-center"><div className="font-bold text-success-600">{session.facil}</div><div className="text-muted-foreground">Fáceis</div></div>
          <div className="card p-2 text-center"><div className="font-bold text-yellow-600">{session.ok}</div><div className="text-muted-foreground">OK</div></div>
          <div className="card p-2 text-center"><div className="font-bold text-danger-500">{session.dificil}</div><div className="text-muted-foreground">Difíceis</div></div>
        </div>
      )}

      {/* Card ou empty state */}
      {finished ? (
        <div className="card p-10 text-center space-y-3 border-dashed">
          {cards.length === 0 ? (
            <>
              <Zap className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h2 className="text-lg font-bold">Você ainda não tem flashcards</h2>
              <p className="text-sm text-muted-foreground">Crie manualmente ou gere com IA.</p>
              <div className="flex justify-center gap-2 pt-2">
                <button onClick={() => setShowCreate(true)} className="btn-outline btn-md"><Plus className="w-4 h-4" /> Criar manual</button>
                <button onClick={() => setShowGenerate(true)} className="btn-primary btn-md"><Sparkles className="w-4 h-4" /> Gerar via IA</button>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 text-success-500 mx-auto" />
              <h2 className="text-lg font-bold">Sessão concluída!</h2>
              <p className="text-sm text-muted-foreground">
                Fáceis: {session.facil} · OK: {session.ok} · Difíceis: {session.dificil}
              </p>
              <button onClick={load} className="btn-primary btn-md inline-flex"><RotateCcw className="w-4 h-4" /> Recomeçar</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Card {idx + 1} de {cards.length}</span>
            <span>{card.subjectName ?? ''}</span>
          </div>
          <div onClick={() => setFlipped((v) => !v)}
            className={cn('card p-8 min-h-[300px] cursor-pointer flex items-center justify-center text-center transition-all',
              flipped ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10' : 'hover:shadow-md')}>
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{flipped ? 'Verso' : 'Frente'}</div>
              <div className="text-lg font-medium whitespace-pre-wrap leading-relaxed">{flipped ? card.verso : card.frente}</div>
              <p className="text-xs text-muted-foreground">{flipped ? '👇 Avalie sua resposta' : 'Clique pra virar'}</p>
            </div>
          </div>

          {flipped && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => rate(1)} className="rounded-xl bg-red-500 text-white py-3 text-sm font-bold">😓 Errei</button>
              <button onClick={() => rate(3)} className="rounded-xl bg-yellow-500 text-white py-3 text-sm font-bold">🙂 Acertei</button>
              <button onClick={() => rate(5)} className="rounded-xl bg-green-500 text-white py-3 text-sm font-bold">😎 Fácil</button>
            </div>
          )}
        </>
      )}

      {/* Modal criar */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Novo flashcard</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs font-bold">Frente (pergunta)</label>
              <textarea value={novaFrente} onChange={(e) => setNovaFrente(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} />
            </div>
            <div>
              <label className="text-xs font-bold">Verso (resposta)</label>
              <textarea value={novaVerso} onChange={(e) => setNovaVerso(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={4} />
            </div>
            <div>
              <label className="text-xs font-bold">Matéria (opcional)</label>
              <select value={novaSubject} onChange={(e) => setNovaSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">Nenhuma</option>
                {materias.map((m) => <option key={m.subjectId} value={m.subjectId}>{m.name}</option>)}
              </select>
            </div>
            <button onClick={criarCustom} className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-bold">Criar flashcard</button>
          </div>
        </div>
      )}

      {/* Modal gerar IA */}
      {showGenerate && (
        <div onClick={() => setShowGenerate(false)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Gerar com IA</h2>
              <button onClick={() => setShowGenerate(false)}><X className="w-4 h-4" /></button>
            </div>
            {materias.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Você ainda não tem matérias com atividade. Responda algumas questões antes de gerar flashcards.
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold">Matéria</label>
                  <select value={genSubject} onChange={(e) => setGenSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">— escolha —</option>
                    {materias.map((m) => <option key={m.subjectId} value={m.subjectId}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Quantidade</label>
                  <input type="number" min={1} max={20} value={genQuantidade}
                    onChange={(e) => setGenQuantidade(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <button onClick={gerarComIA} disabled={gerando || !genSubject}
                  className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {gerando ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</> : <><Sparkles className="w-4 h-4" /> Gerar {genQuantidade} cards</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-center">
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">← Voltar ao dashboard</Link>
      </div>
    </div>
  )
}
