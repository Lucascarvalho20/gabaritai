'use client'

import { useState } from 'react'
import { RotateCcw, ThumbsUp, ThumbsDown, Meh, Plus, Zap, Brain, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOCK_CARDS = [
  { id: 1, frente: 'O que é o princípio da legalidade no Direito Administrativo?', verso: 'A Administração Pública só pode fazer o que a lei expressamente autoriza (art. 37, caput, CF/88). É diferente do princípio da autonomia privada, que permite ao particular fazer tudo que a lei não proíbe.', materia: 'Dir. Administrativo' },
  { id: 2, frente: 'Qual a diferença entre prisão em flagrante e prisão preventiva?', verso: 'Flagrante: ocorre no momento do crime ou logo após. Preventiva: decretada pelo juiz antes do julgamento para garantir a ordem pública, conveniência da instrução ou aplicação da lei penal (art. 312 CPP).', materia: 'Dir. Penal' },
  { id: 3, frente: 'O que é mandado de segurança?', verso: 'Remédio constitucional (art. 5º, LXIX) para proteger direito líquido e certo não amparado por habeas corpus ou habeas data, quando o responsável for autoridade pública ou agente de pessoa jurídica no exercício de atribuições do poder público.', materia: 'Dir. Constitucional' },
]

type Quality = 0 | 1 | 2 | 3 | 4 | 5

export default function FlashcardsPage() {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState<number[]>([])
  const [session, setSession] = useState({ acertos: 0, erros: 0, facil: 0 })
  const finished = done.length === MOCK_CARDS.length

  function rate(q: Quality) {
    const card = MOCK_CARDS[idx]
    setDone(d => [...d, card.id])
    setSession(s => ({
      acertos: q >= 3 ? s.acertos + 1 : s.acertos,
      erros: q < 3 ? s.erros + 1 : s.erros,
      facil: q >= 4 ? s.facil + 1 : s.facil,
    }))
    setFlipped(false)
    const remaining = MOCK_CARDS.filter(c => !done.includes(c.id) && c.id !== card.id)
    if (remaining.length > 0) setIdx(MOCK_CARDS.indexOf(remaining[0]))
  }

  function restart() {
    setIdx(0); setFlipped(false); setDone([]); setSession({ acertos: 0, erros: 0, facil: 0 })
  }

  const card = MOCK_CARDS[idx]

  if (finished) {
    const total = session.acertos + session.erros
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-in pt-10">
        <div className="w-20 h-20 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-success-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground mb-2">Sessão concluída! 🎉</h1>
          <p className="text-muted-foreground">Você revisou todos os flashcards de hoje</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[['Acertos', session.acertos, 'text-success-600'], ['Erros', session.erros, 'text-danger-500'], ['Fácil', session.facil, 'text-brand-500']].map(([l, v, c]) => (
            <div key={l as string} className="card p-4 text-center">
              <div className={`text-3xl font-black ${c}`}>{v}</div>
              <div className="text-xs text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Taxa de acerto: <strong>{total > 0 ? Math.round((session.acertos / total) * 100) : 0}%</strong>
        </p>
        <button onClick={restart} className="btn-primary btn-lg w-full">
          <RotateCcw className="w-4 h-4" /> Reiniciar sessão
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Flashcards</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{MOCK_CARDS.length - done.length} restantes • {done.length} revisados</p>
        </div>
        <button className="btn-outline btn-sm">
          <Plus className="w-3.5 h-3.5" /> Criar flashcard
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${(done.length / MOCK_CARDS.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="relative h-72 cursor-pointer" onClick={() => setFlipped(v => !v)} style={{ perspective: 1000 }}>
        <div className={cn('relative w-full h-full transition-all duration-500', flipped ? '[transform:rotateY(180deg)]'  : '')} style={{ transformStyle: 'preserve-3d' }}>
          {/* Frente */}
          <div className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
            <div className="badge-blue mb-4">{card.materia}</div>
            <p className="text-xl font-bold text-foreground leading-snug">{card.frente}</p>
            <p className="text-sm text-muted-foreground mt-6 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Clique para revelar a resposta
            </p>
          </div>
          {/* Verso */}
          <div className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] bg-brand-50 dark:bg-brand-900/20">
            <div className="badge-green mb-4">Resposta</div>
            <p className="text-base text-foreground leading-relaxed">{card.verso}</p>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="animate-slide-up space-y-3">
          <p className="text-center text-sm text-muted-foreground font-medium">Como foi essa resposta?</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => rate(1)} className="btn-danger btn-lg flex-col gap-1 h-20">
              <ThumbsDown className="w-5 h-5" />
              <span className="text-xs font-normal">Não soube</span>
            </button>
            <button onClick={() => rate(3)} className="btn-outline btn-lg flex-col gap-1 h-20">
              <Meh className="w-5 h-5" />
              <span className="text-xs font-normal">Dificuldade</span>
            </button>
            <button onClick={() => rate(5)} className="btn-primary btn-lg flex-col gap-1 h-20" style={{ background: 'linear-gradient(to right, #16a34a, #059669)' }}>
              <ThumbsUp className="w-5 h-5" />
              <span className="text-xs font-normal">Sabia bem</span>
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">O algoritmo vai ajustar quando você verá este card novamente</p>
        </div>
      )}
    </div>
  )
}
