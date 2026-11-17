'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, ExternalLink, Loader2, Play } from 'lucide-react'
import { api } from '@/lib/api'
import { agrupar, AvisoOriginal, ListaAlternativas, TextoBase, TextoFormatado, fmtDuracao, type ItemTela, type TextoTela } from '@/components/provas/comum'

/** Modo leitura: a prova inteira, como no caderno, com a resposta oficial de cada item. */

type ItemGabarito = ItemTela & { gabarito: string | null; explicacao: string | null }
type Gabarito = {
  prova: {
    titulo: string; banca: string | null; duracaoMin: number | null; formato: string | null; caderno: string | null
    fonte: { pagina?: string; caderno?: string; gabarito?: string; aviso?: string; cadernos?: Array<{ de: number; ate: number; url: string; rotulo?: string }> } | null
  }
  textos: TextoTela[]
  itens: ItemGabarito[]
}

export default function GabaritoProvaPage() {
  const { courseSlug, provaId } = useParams<{ courseSlug: string; provaId: string }>()
  const [g, setG] = useState<Gabarito | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/me/provas/${provaId}/gabarito`)
      .then(({ data }) => setG(data))
      .catch((e) => setErro(e.response?.data?.message ?? 'Não foi possível carregar o gabarito.'))
  }, [provaId])

  const grupos = useMemo(() => (g ? agrupar(g.itens) : []), [g])
  const textos = useMemo(() => new Map((g?.textos ?? []).map((t) => [t.id, t])), [g])

  if (erro) {
    return (
      <div className="max-w-xl mx-auto card p-6 space-y-3 text-sm">
        <p>{erro}</p>
        <Link href="/planos" className="btn-primary btn-sm">Ver planos</Link>
      </div>
    )
  }
  if (!g) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  const ce = g.prova.formato === 'CE'
  const vistos = new Set<string>()
  const fonte = g.prova.fonte

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/provas/${courseSlug}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Provas anteriores
        </Link>
        <h1 className="text-xl font-bold">{g.prova.titulo} — com gabarito</h1>
        <p className="text-sm text-muted-foreground">
          {g.prova.banca}{g.prova.duracaoMin ? ` · ${fmtDuracao(g.prova.duracaoMin)}` : ''} · {g.itens.length} itens
        </p>
      </div>

      {fonte?.aviso && (
        <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
          <p>{fonte.aviso}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {fonte.cadernos?.length
              ? fonte.cadernos.map((c) => (
                <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline">
                  {c.rotulo ?? `Caderno — itens ${c.de} a ${c.ate}`} (PDF) <ExternalLink className="w-3 h-3" />
                </a>
              ))
              : fonte.caderno && <a href={fonte.caderno} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline">Caderno oficial{ehPdf(fonte.caderno) ? ' (PDF)' : ''} <ExternalLink className="w-3 h-3" /></a>}
            {fonte.gabarito && <a href={fonte.gabarito} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline">Gabarito definitivo{ehPdf(fonte.gabarito) ? ' (PDF)' : ' no site da banca'} <ExternalLink className="w-3 h-3" /></a>}
          </p>
        </div>
      )}

      {grupos.map((grupo) => {
        const texto = grupo.textoId ? textos.get(grupo.textoId) : null
        const primeira = texto ? !vistos.has(texto.id) : false
        if (texto) vistos.add(texto.id)
        return (
          <section key={grupo.chave} className="space-y-3">
            {texto && <TextoBase texto={texto} abertoInicial={primeira} />}
            {grupo.comando && <TextoFormatado texto={grupo.comando} className="text-sm text-muted-foreground leading-relaxed" />}
            {grupo.itens.map((i) => (
              <div key={i.id} className="card p-4 flex gap-3">
                <span className="font-bold tabular-nums text-sm pt-0.5 w-7 shrink-0">{i.numero}</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <TextoFormatado texto={i.enunciado} className="text-sm leading-relaxed" />
                  {!ce && <ListaAlternativas item={i} gabarito={i.anulada ? null : i.gabarito} />}
                  <AvisoOriginal item={i} caderno={g.prova.caderno} />
                  <p className="text-sm">
                    {i.anulada
                      ? <span className="text-muted-foreground">Anulado pela banca</span>
                      : <>Gabarito: <strong>{ce ? (i.gabarito === 'C' ? 'Certo' : 'Errado') : i.gabarito}</strong></>}
                    {i.materia && <span className="text-xs text-muted-foreground"> · {i.materia}</span>}
                  </p>
                  {i.explicacao && <TextoFormatado texto={i.explicacao} className="text-sm text-muted-foreground border-t border-border pt-2" />}
                </div>
              </div>
            ))}
          </section>
        )
      })}

      <Link href={`/dashboard/provas/${courseSlug}/${provaId}/fazer`} className="btn-primary btn-md"><Play className="w-4 h-4" /> Fazer esta prova</Link>
    </div>
  )
}

/** O AOCP mostra o gabarito numa página, não num PDF: o rótulo do link diz qual é. */
function ehPdf(url: string): boolean {
  return /\.pdf$/i.test(url.split(/[?#]/)[0])
}
