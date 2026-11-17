'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Loader2, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AvisoOriginal, ListaAlternativas, TextoFormatado, fmtDuracao, fmtPct, type ItemTela } from '@/components/provas/comum'
import type { DesempenhoMateria } from '@/lib/provas/correcao'

type ItemResultado = ItemTela & { gabarito: string | null; explicacao: string | null; resposta: string | null; situacao: 'certo' | 'errado' | 'branco' | 'anulada' }
type Resultado = {
  prova: { titulo: string; formato: string | null; erradaAnulaCerta: boolean; caderno: string | null }
  tentativa: {
    status: string; entregueEm: string | null; tempoMs: number | null; duracaoMin: number
    acertos: number; erros: number; brancos: number; anuladas: number; pontos: number; pontosMax: number
    porMateria: DesempenhoMateria[]; revisar: DesempenhoMateria[]; emBranco: string[]
  }
  anterior: { pontos: number; pontosMax: number } | null
  itens: ItemResultado[]
}

const nomeResposta = (r: string | null, ce: boolean) => (r == null ? 'em branco' : ce ? (r === 'C' ? 'Certo' : 'Errado') : r)
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export default function ResultadoProvaPage() {
  const { courseSlug, provaId, tentativaId } = useParams<{ courseSlug: string; provaId: string; tentativaId: string }>()
  const [r, setR] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'errado' | 'branco' | 'todos'>('errado')

  useEffect(() => {
    api.get(`/me/provas/tentativas/${tentativaId}`)
      .then(({ data }) => setR(data))
      .catch((e) => setErro(e.response?.data?.message ?? 'Não foi possível carregar o resultado.'))
  }, [tentativaId])

  const itens = useMemo(() => (r?.itens ?? []).filter((i) => filtro === 'todos' || i.situacao === filtro), [r, filtro])

  if (erro) return <div className="max-w-xl mx-auto card p-6 text-sm">{erro}</div>
  if (!r) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  const t = r.tentativa
  const ce = r.prova.formato === 'CE'
  const delta = r.anterior ? t.pontos - r.anterior.pontos : null
  const usado = t.tempoMs != null ? Math.round(t.tempoMs / 60_000) : null
  const quando = t.entregueEm ? new Date(t.entregueEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  const contagem = { errado: t.erros, branco: t.brancos, todos: r.itens.length }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/provas/${courseSlug}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Provas anteriores
        </Link>
        <h1 className="text-xl font-bold">{r.prova.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          Entregue em {quando}{usado != null ? ` · usou ${fmtDuracao(Math.min(usado, t.duracaoMin))} de ${fmtDuracao(t.duracaoMin)}` : ''}
          {t.status === 'EXPIRADA' ? ' · entregue pelo cronômetro' : ''}
        </p>
      </div>

      <div className="card p-5 sm:p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{r.prova.erradaAnulaCerta ? 'Pontos líquidos' : 'Pontos'}</p>
          <p className="text-5xl font-bold tabular-nums">{fmtNum(t.pontos)}</p>
          <p className="text-sm text-muted-foreground">de {t.pontosMax} · {fmtPct(t.pontosMax ? t.pontos / t.pontosMax : 0)}</p>
        </div>
        <div className="space-y-3">
          <dl className="grid grid-cols-4 gap-2 text-center text-sm">
            {[['Certos', t.acertos], ['Errados', t.erros], ['Em branco', t.brancos], ['Anulados', t.anuladas]].map(([rot, n]) => (
              <div key={rot as string} className="rounded-lg bg-muted/40 py-2">
                <dd className="font-bold tabular-nums">{n}</dd>
                <dt className="text-xs text-muted-foreground">{rot}</dt>
              </div>
            ))}
          </dl>
          {delta !== null && (
            <p className={cn('text-sm inline-flex items-center gap-1.5', delta >= 0 ? 'text-success-600' : 'text-danger-600')}>
              {delta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {delta >= 0 ? '+' : ''}{fmtNum(delta)} pontos em relação à tentativa anterior
            </p>
          )}
          {r.prova.erradaAnulaCerta && <p className="text-xs text-muted-foreground">Certos menos errados, mais os anulados (o ponto do item anulado vale para todos).</p>}
        </div>
      </div>

      {t.emBranco.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Você deixou em branco todas as questões de: {t.emBranco.join(', ')}. Sem resposta não dá para medir essas matérias — a análise fica mais certeira numa prova completa.
        </p>
      )}

      {t.revisar.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-sm">Revise primeiro</h2>
          <p className="text-xs text-muted-foreground mb-3">As matérias em que você ficou abaixo de 60% nesta prova, da pior para a melhor.</p>
          <ul className="space-y-1.5 text-sm">
            {t.revisar.map((m) => (
              <li key={m.materia} className="flex justify-between gap-3">
                <span>{m.materia}</span>
                <span className="tabular-nums text-muted-foreground">{fmtPct(m.percentual)} · {m.acertos} certos, {m.erros} errados de {m.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5 overflow-x-auto">
        <h2 className="font-bold text-sm mb-3">Por matéria</h2>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground text-left">
            <tr><th className="py-1.5 pr-3 font-medium">Matéria</th><th className="py-1.5 pr-3 font-medium text-right">Itens</th><th className="py-1.5 pr-3 font-medium text-right">Certos</th><th className="py-1.5 pr-3 font-medium text-right">Errados</th><th className="py-1.5 font-medium text-right">Aproveitamento</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...t.porMateria].sort((a, b) => a.percentual - b.percentual).map((m) => (
              <tr key={m.materia}>
                <td className="py-1.5 pr-3">{m.materia}</td>
                <td className="py-1.5 pr-3 text-right">{m.total}</td>
                <td className="py-1.5 pr-3 text-right">{m.acertos}</td>
                <td className="py-1.5 pr-3 text-right">{m.erros}</td>
                <td className={cn('py-1.5 text-right font-semibold', m.percentual < 0.6 ? 'text-danger-600' : 'text-success-600')}>{fmtPct(m.percentual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-sm">Revisão dos itens</h2>
          <div role="tablist" className="inline-flex rounded-lg border border-border p-0.5 text-xs">
            {(['errado', 'branco', 'todos'] as const).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)}
                className={cn('px-3 py-1.5 rounded-md font-semibold', filtro === f ? 'bg-muted' : 'text-muted-foreground')}>
                {f === 'errado' ? 'Errados' : f === 'branco' ? 'Em branco' : 'Todos'} ({contagem[f]})
              </button>
            ))}
          </div>
        </div>
        {itens.length === 0 && <p className="card p-5 text-sm text-muted-foreground">Nenhum item aqui.</p>}
        {itens.map((i) => (
          <div key={i.id} className="card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Item {i.numero}{i.materia ? ` · ${i.materia}` : ''}</p>
            {i.comando && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Comando</summary>
                <TextoFormatado texto={i.comando} className="mt-1.5 leading-relaxed" />
              </details>
            )}
            <TextoFormatado texto={i.enunciado} className="text-sm leading-relaxed" />
            {!ce && <ListaAlternativas item={i} gabarito={i.situacao === 'anulada' ? null : i.gabarito} resposta={i.resposta} />}
            <AvisoOriginal item={i} caderno={r.prova.caderno} />
            {i.situacao === 'anulada' ? (
              <p className="text-sm text-muted-foreground">Anulado pela banca: o ponto vale para todos.</p>
            ) : (
              <p className="text-sm">
                Sua resposta: <strong className={cn(i.situacao === 'certo' ? 'text-success-600' : i.situacao === 'errado' ? 'text-danger-600' : '')}>{nomeResposta(i.resposta, ce)}</strong>
                {' · '}Gabarito: <strong>{nomeResposta(i.gabarito, ce)}</strong>
              </p>
            )}
            {i.explicacao && <TextoFormatado texto={i.explicacao} className="text-sm text-muted-foreground border-t border-border pt-2" />}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/provas/${courseSlug}/${provaId}/fazer`} className="btn-primary btn-md"><RotateCcw className="w-4 h-4" /> Refazer a prova</Link>
        <Link href={`/dashboard/provas/${courseSlug}/${provaId}/gabarito`} className="btn-ghost btn-md">Ver gabarito completo</Link>
      </div>
    </div>
  )
}
