'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, ThumbsUp, ThumbsDown, Meh, Plus, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const INICIAIS = [
  { id: 1, frente: 'O que é o princípio da legalidade no Direito Administrativo?', verso: 'A Administração Pública SÓ pode fazer o que a lei expressamente autoriza (art. 37, CF/88).\n\n💡 Diferença: particular faz tudo que a lei não proíbe; Adm. Pública faz só o que a lei autoriza.', materia: 'Dir. Administrativo' },
  { id: 2, frente: 'Qual a diferença entre prisão em flagrante e prisão preventiva?', verso: 'Flagrante (art. 302 CPP): ocorre durante ou logo após o crime.\nPreventiva (art. 312 CPP): decretada pelo juiz antes do julgamento.\n\n💡 Flagrante = momento. Preventiva = antes da sentença.', materia: 'Dir. Penal' },
  { id: 3, frente: 'O que é mandado de segurança?', verso: 'Remédio constitucional (art. 5º, LXIX, CF/88) para proteger direito líquido e certo, não amparado por HC ou HD, quando o responsável for autoridade pública.\n\n💡 MS = direito LÍQUIDO e CERTO. Não é HC nem HD.', materia: 'Dir. Constitucional' },
  { id: 4, frente: 'O que são os princípios LIMPE?', verso: 'L — Legalidade | I — Impessoalidade | M — Moralidade | P — Publicidade | E — Eficiência\n\n(Art. 37, caput, CF/88)\n\n💡 Memorize: LIMPE = Limpe a administração!', materia: 'Dir. Administrativo' },
  { id: 5, frente: 'O que é o princípio da presunção de inocência?', verso: 'Ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória (art. 5º, LVII, CF/88).\n\n💡 "In dubio pro reo" — na dúvida, favorece o réu.', materia: 'Dir. Constitucional' },
]

const MATERIAS = ['Dir. Administrativo', 'Dir. Constitucional', 'Dir. Penal', 'Dir. Processual Penal', 'Língua Portuguesa', 'Raciocínio Lógico', 'Matemática Financeira', 'Informática', 'Legislação de Trânsito']

interface FC { id: number; frente: string; verso: string; materia: string }

export default function FlashcardsPage() {
  const user = useAuthStore(s => s.user)
  const [cards, setCards] = useState<FC[]>(INICIAIS)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState<number[]>([])
  const [hardCards, setHardCards] = useState<number[]>([])
  const [session, setSession] = useState({ acertos: 0, erros: 0, facil: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [genMateria, setGenMateria] = useState('')
  const [genNivel, setGenNivel] = useState('medio')
  const [novaFrente, setNovaFrente] = useState('')
  const [novaVerso, setNovaVerso] = useState('')
  const [novaMateria, setNovaMateria] = useState('Dir. Constitucional')

  const cursoPrincipal = user?.concursoAlvo ?? 'concurso público'
  const pendentes = cards.filter(c => !done.includes(c.id))
  const finished = pendentes.length === 0

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_flashcards_custom')
    if (saved) {
      try {
        const custom = JSON.parse(saved) as FC[]
        setCards(prev => {
          const ids = new Set(prev.map(c => c.id))
          return [...prev, ...custom.filter(c => !ids.has(c.id))]
        })
      } catch {}
    }
  }, [])

  const card = pendentes[idx % Math.max(pendentes.length, 1)]

  function rate(q: number) {
    if (!card) return
    setDone(d => [...d, card.id])
    if (q < 3) setHardCards(e => [...e, card.id])
    setSession(s => ({
      acertos: q >= 3 ? s.acertos + 1 : s.acertos,
      erros: q < 3 ? s.erros + 1 : s.erros,
      facil: q >= 4 ? s.facil + 1 : s.facil,
    }))
    setFlipped(false)
  }

  function restart() {
    setIdx(0); setFlipped(false)
    // Keep hard cards in rotation
    setDone(prev => prev.filter(id => !hardCards.includes(id)))
    setSession({ acertos: 0, erros: 0, facil: 0 })
  }

  function salvarCard() {
    if (!novaFrente.trim() || !novaVerso.trim()) { toast.error('Preencha frente e verso'); return }
    const novo = { id: Date.now(), frente: novaFrente, verso: novaVerso, materia: novaMateria }
    const updated = [...cards, novo]
    setCards(updated)
    localStorage.setItem('gabaritai_flashcards_custom', JSON.stringify(updated.filter(c => c.id > 1000)))
    setNovaFrente(''); setNovaVerso(''); setShowCreate(false)
    toast.success('Flashcard criado!')
  }

  async function gerarComIA() {
    if (!genMateria.trim()) { toast.error('Informe a matéria'); return }
    setGerando(true)
    try {
      const semana = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
      const res = await api.post('/ai/gerar', { tipo: 'flashcards', materia: genMateria, curso: cursoPrincipal, quantidade: 10, nivel: genNivel, semana })
      const novos: FC[] = Array.isArray(res.data.data)
        ? res.data.data.map((f: any, i: number) => ({ id: Date.now() + i + 1000, frente: f.frente, verso: f.verso, materia: f.materia || genMateria }))
        : []
      if (novos.length > 0) {
        const updated = [...cards, ...novos]
        setCards(updated)
        localStorage.setItem('gabaritai_flashcards_custom', JSON.stringify(updated.filter(c => c.id > 1000)))
        setShowGenerate(false)
        toast.success(`${novos.length} novos flashcards gerados!`)
      } else {
        toast.error('IA não retornou flashcards. Verifique as chaves de IA.')
      }
    } catch { toast.error('Erro ao gerar. Verifique a conexão.') }
    finally { setGerando(false) }
  }

  if (finished) {
    const total = session.acertos + session.erros
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-in pt-10">
        <div className="w-20 h-20 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success-600" />
        </div>
        <h1 className="text-3xl font-black text-foreground">Sessão concluída! 🎉</h1>
        <div className="grid grid-cols-3 gap-4">
          {[['Acertos', session.acertos, 'text-success-600'], ['Erros', session.erros, 'text-danger-500'], ['Fácil', session.facil, 'text-brand-500']].map(([l, v, c]) => (
            <div key={l as string} className="card p-4 text-center">
              <div className={`text-3xl font-black ${c}`}>{v}</div>
              <div className="text-xs text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Taxa: <strong>{total > 0 ? Math.round((session.acertos / total) * 100) : 0}%</strong></p>
        {hardCards.length > 0 && <p className="text-xs text-warning-500">⚠️ {hardCards.length} cards difíceis voltarão na próxima sessão</p>}
        <div className="flex gap-3">
          <button onClick={restart} className="btn-outline btn-lg flex-1"><RotateCcw className="w-4 h-4" /> Reiniciar</button>
          <button onClick={() => { setShowGenerate(true); setGenMateria('') }} className="btn-primary btn-lg flex-1"><Sparkles className="w-4 h-4" /> Gerar mais com IA</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Flashcards</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{pendentes.length} restantes • {done.length} revisados • {hardCards.length} com dificuldade</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-outline btn-sm"><Plus className="w-3.5 h-3.5" /> Criar</button>
          <button onClick={() => setShowGenerate(v => !v)} className="btn-primary btn-sm"><Sparkles className="w-3.5 h-3.5" /> Gerar IA</button>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${cards.length > 0 ? (done.length / cards.length) * 100 : 0}%` }} />
      </div>

      {showGenerate && (
        <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500" /> Gerar 10 flashcards com IA</span>
            <button onClick={() => setShowGenerate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input className="input text-sm" placeholder="Matéria (ex: Direito Penal, Matemática...)" value={genMateria} onChange={e => setGenMateria(e.target.value)} />
            </div>
            <select className="input text-sm" value={genNivel} onChange={e => setGenNivel(e.target.value)}>
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
          <button onClick={gerarComIA} disabled={gerando || !genMateria.trim()} className="btn-primary btn-md w-full">
            {gerando ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...</> : <><Sparkles className="w-4 h-4" /> Gerar para {cursoPrincipal}</>}
          </button>
        </div>
      )}

      {card && (
        <>
          <div className="relative h-72 cursor-pointer" onClick={() => setFlipped(v => !v)} style={{ perspective: 1000 }}>
            <div className={cn('relative w-full h-full transition-all duration-500', flipped ? '[transform:rotateY(180deg)]' : '')} style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
                <div className="badge-blue mb-4">{card.materia}</div>
                <p className="text-xl font-bold text-foreground leading-snug">{card.frente}</p>
                <p className="text-sm text-muted-foreground mt-6 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Clique para ver a resposta</p>
              </div>
              <div className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] bg-brand-50 dark:bg-brand-900/20">
                <div className="badge-green mb-4">Resposta</div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{card.verso}</p>
              </div>
            </div>
          </div>

          {flipped && (
            <div className="animate-slide-up space-y-3">
              <p className="text-center text-sm text-muted-foreground font-medium">Como foi essa resposta?</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => rate(1)} className="btn-danger btn-lg flex-col gap-1 h-20"><ThumbsDown className="w-5 h-5" /><span className="text-xs font-normal">Não soube</span></button>
                <button onClick={() => rate(3)} className="btn-outline btn-lg flex-col gap-1 h-20"><Meh className="w-5 h-5" /><span className="text-xs font-normal">Dificuldade</span></button>
                <button onClick={() => rate(5)} className="btn-primary btn-lg flex-col gap-1 h-20" style={{ background: 'linear-gradient(to right, #16a34a, #059669)' }}><ThumbsUp className="w-5 h-5" /><span className="text-xs font-normal">Sabia bem</span></button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Cards difíceis voltarão mais cedo na próxima sessão</p>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Criar Flashcard</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="label">Matéria</label>
              <select className="input" value={novaMateria} onChange={e => setNovaMateria(e.target.value)}>
                {MATERIAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Frente (pergunta)</label>
              <textarea className="input min-h-20 resize-none" placeholder="Qual é...?" value={novaFrente} onChange={e => setNovaFrente(e.target.value)} />
            </div>
            <div>
              <label className="label">Verso (resposta)</label>
              <textarea className="input min-h-24 resize-none" placeholder="A resposta é..." value={novaVerso} onChange={e => setNovaVerso(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-outline btn-md flex-1">Cancelar</button>
              <button onClick={salvarCard} className="btn-primary btn-md flex-1">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
