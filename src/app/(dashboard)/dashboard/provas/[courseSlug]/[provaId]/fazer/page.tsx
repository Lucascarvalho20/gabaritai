'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, CloudOff, ListChecks, Loader2, Send, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  agrupar, alternativasDe, AvisoOriginal, TextoBase, TextoFormatado, fmtDuracao,
  type ItemTela, type TextoTela,
} from '@/components/provas/comum'
import { TextoMarcado } from '@/components/TextoMarcado'

/**
 * Fazer uma prova oficial com o tempo do edital.
 *
 * - O prazo é do servidor; o cronômetro só mostra (corrigido pela diferença
 *   entre o relógio do aparelho e o do servidor).
 * - Cada marcação é guardada no aparelho na hora e no servidor 1,5 s depois:
 *   recarregar, fechar a aba ou perder a conexão não perde respostas.
 * - Em zero, a prova é entregue sozinha.
 */

type Inicio = {
  agora: string
  retomada: boolean
  tentativa: { id: string; expiraEm: string; duracaoMin: number; respostas: Record<string, string> }
  prova: {
    titulo: string; banca: string | null; duracaoMin: number | null; incluiaDiscursiva: boolean
    formato: string | null; erradaAnulaCerta: boolean; caderno: string | null
  }
  textos: TextoTela[]
  itens: ItemTela[]
}

const relogio = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function FazerProvaPage() {
  const { courseSlug, provaId } = useParams<{ courseSlug: string; provaId: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<Inicio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [restante, setRestante] = useState<number | null>(null)
  const [salvamento, setSalvamento] = useState<'salvo' | 'salvando' | 'offline'>('salvo')
  const [confirmar, setConfirmar] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [folha, setFolha] = useState(false)
  const diferencaRelogio = useRef(0)
  const espera = useRef<ReturnType<typeof setTimeout>>()
  const carregou = useRef(false)

  useEffect(() => {
    api.post(`/me/provas/${provaId}/tentativas`)
      .then(({ data }: { data: Inicio }) => {
        diferencaRelogio.current = new Date(data.agora).getTime() - Date.now()
        let r = data.tentativa.respostas ?? {}
        try {
          const local = localStorage.getItem(`gabaritai:prova:${data.tentativa.id}`)
          if (local) r = { ...r, ...JSON.parse(local) }
        } catch { /* armazenamento indisponível: vale o que veio do servidor */ }
        setRespostas(r)
        setDados(data)
      })
      .catch((e) => setErro(e.response?.data?.message ?? 'Não foi possível abrir a prova.'))
  }, [provaId])

  useEffect(() => {
    if (!dados) return
    const fim = new Date(dados.tentativa.expiraEm).getTime()
    const tick = () => setRestante(fim - (Date.now() + diferencaRelogio.current))
    tick()
    const intervalo = setInterval(tick, 1000)
    return () => clearInterval(intervalo)
  }, [dados])

  useEffect(() => {
    if (!dados) return
    try { localStorage.setItem(`gabaritai:prova:${dados.tentativa.id}`, JSON.stringify(respostas)) } catch { /* sem armazenamento local */ }
    if (!carregou.current) { carregou.current = true; return } // a 1ª vez são as respostas que acabaram de chegar
    clearTimeout(espera.current)
    espera.current = setTimeout(() => {
      setSalvamento('salvando')
      api.patch(`/me/provas/tentativas/${dados.tentativa.id}`, { respostas })
        .then(() => setSalvamento('salvo'))
        .catch(() => setSalvamento('offline'))
    }, 1500)
    return () => clearTimeout(espera.current)
  }, [respostas, dados])

  async function entregar() {
    if (!dados || entregando) return
    setEntregando(true)
    clearTimeout(espera.current)
    try {
      await api.post(`/me/provas/tentativas/${dados.tentativa.id}/entregar`, { respostas })
      try { localStorage.removeItem(`gabaritai:prova:${dados.tentativa.id}`) } catch { /* nada a limpar */ }
      router.replace(`/dashboard/provas/${courseSlug}/${provaId}/resultado/${dados.tentativa.id}`)
    } catch (e: any) {
      setEntregando(false)
      setConfirmar(false)
      setErro(e.response?.data?.message ?? 'A entrega falhou. Suas respostas estão salvas; tente de novo.')
    }
  }

  useEffect(() => {
    if (restante !== null && restante <= 0 && !entregando) entregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante])

  const grupos = useMemo(() => (dados ? agrupar(dados.itens) : []), [dados])
  const textos = useMemo(() => new Map((dados?.textos ?? []).map((t) => [t.id, t])), [dados])
  const ce = dados?.prova.formato === 'CE'

  if (erro && !dados) {
    return (
      <div className="max-w-xl mx-auto card p-6 space-y-3 text-sm">
        <p>{erro}</p>
        <Link href={`/dashboard/provas/${courseSlug}`} className="btn-ghost btn-sm">Voltar às provas</Link>
      </div>
    )
  }
  if (!dados) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  const respondiveis = dados.itens.filter((i) => !i.anulada)
  const respondidas = respondiveis.filter((i) => respostas[i.id]).length
  const textosVistos = new Set<string>()
  const escolher = (id: string, letra: string) =>
    setRespostas((r) => {
      const novo = { ...r }
      if (novo[id] === letra) delete novo[id]
      else novo[id] = letra
      return novo
    })
  const irPara = (numero: number | null) => {
    document.getElementById(`item-${numero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setFolha(false)
  }

  const FolhaDeRespostas = (
    <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-6 gap-1.5">
      {dados.itens.map((i) => (
        <button key={i.id} type="button" onClick={() => irPara(i.numero)}
          aria-label={`Item ${i.numero}${i.anulada ? ', anulado' : respostas[i.id] ? `, respondido ${respostas[i.id]}` : ', em branco'}`}
          className={cn('h-8 rounded-md text-xs font-semibold tabular-nums border transition-colors',
            i.anulada ? 'border-dashed border-border text-muted-foreground'
              : respostas[i.id] ? 'bg-brand-600 border-brand-600 text-white' : 'border-border hover:bg-muted')}>
          {i.numero}
        </button>
      ))}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <header className="sticky top-0 z-20 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center gap-3">
        <Link href={`/dashboard/provas/${courseSlug}`} aria-label="Sair (as respostas ficam salvas)" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{dados.prova.titulo}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {respondidas} de {respondiveis.length} respondidas ·{' '}
            {salvamento === 'salvando' ? 'salvando…' : salvamento === 'offline'
              ? <span className="inline-flex items-center gap-1 text-warning-600"><CloudOff className="w-3 h-3" /> sem conexão — guardado neste aparelho</span>
              : 'tudo salvo'}
          </p>
        </div>
        <span aria-live="off" className={cn('font-mono text-lg font-bold tabular-nums',
          restante !== null && restante < 5 * 60_000 ? 'text-danger-600' : restante !== null && restante < 15 * 60_000 ? 'text-warning-600' : '')}>
          {restante === null ? '–:––:––' : relogio(restante)}
        </span>
        <button type="button" onClick={() => setFolha((f) => !f)} className="lg:hidden btn-ghost btn-sm" aria-expanded={folha}>
          <ListChecks className="w-4 h-4" /><span className="sr-only">Folha de respostas</span>
        </button>
        <button type="button" onClick={() => setConfirmar(true)} className="btn-primary btn-sm">
          <Send className="w-3.5 h-3.5" /> Entregar
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6 mt-4">
        <main className="space-y-8 min-w-0">
          <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-1">
            {dados.retomada && <p className="font-semibold">Prova retomada de onde você parou.</p>}
            <p>
              Tempo do edital: <strong>{fmtDuracao(dados.tentativa.duracaoMin)}</strong>
              {dados.prova.incluiaDiscursiva ? ' (na prova real, esse tempo incluía a redação; aqui são só as questões)' : ''}.
            </p>
            {dados.prova.erradaAnulaCerta && (
              <p className="text-muted-foreground">Cada item errado anula um certo. Em branco vale zero: na dúvida, deixe em branco.</p>
            )}
          </div>

          {grupos.map((g) => {
            const texto = g.textoId ? textos.get(g.textoId) : null
            const primeira = texto ? !textosVistos.has(texto.id) : false
            if (texto) textosVistos.add(texto.id)
            return (
              <section key={g.chave} className="space-y-3">
                {texto && <TextoBase texto={texto} abertoInicial={primeira} />}
                {g.comando && <TextoFormatado texto={g.comando} className="text-sm text-muted-foreground leading-relaxed" />}
                {g.itens.map((item) => (
                  <div key={item.id} id={`item-${item.numero}`} className="card p-4 scroll-mt-28">
                    <div className="flex gap-3">
                      <span className="font-bold tabular-nums text-sm pt-0.5 w-7 shrink-0">{item.numero}</span>
                      <div className="flex-1 min-w-0 space-y-3">
                        <TextoFormatado texto={item.enunciado} className="text-sm leading-relaxed" />
                        <AvisoOriginal item={item} caderno={dados.prova.caderno} />
                        {item.anulada ? (
                          <p className="text-xs text-muted-foreground">Item anulado pela banca: o ponto vale para todos.</p>
                        ) : (
                          <div role="radiogroup" aria-label={`Resposta do item ${item.numero}`}
                            className={cn(ce ? 'flex flex-wrap gap-2' : 'space-y-1.5')}>
                            {alternativasDe(item).map((a) => {
                              const marcado = respostas[item.id] === a.letra
                              return (
                                <button key={a.letra} type="button" role="radio" aria-checked={marcado}
                                  onClick={() => escolher(item.id, a.letra)}
                                  className={cn('rounded-lg border text-sm font-semibold transition-colors text-left',
                                    ce ? 'px-5 py-2' : 'w-full px-3 py-2 flex gap-2',
                                    marcado ? 'bg-brand-600 border-brand-600 text-white' : 'border-border hover:bg-muted')}>
                                  {ce ? (a.letra === 'C' ? 'Certo' : 'Errado') : <><span>{a.letra})</span><span className="font-normal"><TextoMarcado texto={a.texto} /></span></>}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )
          })}

          <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{respondidas} de {respondiveis.length} respondidas. Você pode entregar quando quiser.</p>
            <button type="button" onClick={() => setConfirmar(true)} className="btn-primary btn-md">
              <Send className="w-4 h-4" /> Entregar a prova
            </button>
          </div>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24 card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folha de respostas</p>
            {FolhaDeRespostas}
          </div>
        </aside>
      </div>

      {folha && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[60vh] overflow-y-auto shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Folha de respostas</p>
            <button type="button" onClick={() => setFolha(false)} aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>
          {FolhaDeRespostas}
        </div>
      )}

      {erro && dados && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 card px-4 py-3 text-sm max-w-md">{erro}</div>
      )}

      {(confirmar || entregando) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-entrega">
          <div className="card p-6 max-w-sm w-full space-y-4">
            {entregando ? (
              <p id="titulo-entrega" className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> {restante !== null && restante <= 0 ? 'Tempo esgotado — entregando…' : 'Entregando…'}
              </p>
            ) : (
              <>
                <h2 id="titulo-entrega" className="font-bold">Entregar a prova?</h2>
                <p className="text-sm text-muted-foreground">
                  Você respondeu {respondidas} de {respondiveis.length}. Itens em branco valem zero. Depois de entregar, a nota sai na hora.
                </p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setConfirmar(false)} className="btn-ghost btn-sm">Voltar à prova</button>
                  <button type="button" onClick={entregar} className="btn-primary btn-sm">Entregar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
