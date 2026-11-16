'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Peças compartilhadas pelas telas de prova (fazer, gabarito, resultado):
 * o texto com parágrafos e código, o agrupamento dos itens por comando como no
 * caderno, e o aviso de figura/fórmula que aponta a página da prova original.
 */

export type ItemTela = {
  id: string
  numero: number | null
  materia: string | null
  comando: string | null
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }> | unknown
  textoId: string | null
  figura: boolean
  formula: boolean
  pagina: number | null
  anulada: boolean
}

export type TextoTela = { id: string; codigo: string; titulo: string; conteudo: string }

/** Parágrafos separados por linha em branco; trechos entre ``` viram código com o recuo original. */
export function TextoFormatado({ texto, className }: { texto: string; className?: string }) {
  const partes = texto.split(/```\n?/)
  return (
    <div className={cn('space-y-2', className)}>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="text-xs bg-muted/60 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{p.replace(/\n$/, '')}</pre>
        ) : (
          p.split(/\n{2,}/).filter((x) => x.trim()).map((par, j) => (
            <p key={`${i}-${j}`} className="whitespace-pre-line">{par.trim()}</p>
          ))
        ),
      )}
    </div>
  )
}

/** Itens seguidos com o mesmo comando e o mesmo texto formam um grupo, como no caderno. */
export function agrupar<T extends ItemTela>(itens: T[]): Array<{ chave: string; comando: string | null; textoId: string | null; itens: T[] }> {
  const grupos: Array<{ chave: string; comando: string | null; textoId: string | null; itens: T[] }> = []
  for (const i of itens) {
    const ult = grupos[grupos.length - 1]
    if (ult && ult.comando === i.comando && ult.textoId === i.textoId) ult.itens.push(i)
    else grupos.push({ chave: i.id, comando: i.comando, textoId: i.textoId, itens: [i] })
  }
  return grupos
}

/** Texto-base recolhível: aberto na primeira vez que aparece, fechado nas seguintes. */
export function TextoBase({ texto, abertoInicial }: { texto: TextoTela; abertoInicial: boolean }) {
  const [aberto, setAberto] = useState(abertoInicial)
  return (
    <div className="rounded-xl border border-border bg-muted/20">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold">
        {texto.titulo}
        <ChevronDown className={cn('w-4 h-4 transition-transform', aberto && 'rotate-180')} />
      </button>
      {aberto && <TextoFormatado texto={texto.conteudo} className="px-4 pb-4 text-sm leading-relaxed" />}
    </div>
  )
}

/** Item com figura ou fórmula: a extração do PDF não reproduz bem — aponta a página oficial. */
export function AvisoOriginal({ item, caderno }: { item: ItemTela; caderno: string | null }) {
  if (!(item.figura || item.formula) || !caderno) return null
  const href = item.pagina ? `${caderno}#page=${item.pagina}` : caderno
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline">
      <ImageIcon className="w-3.5 h-3.5" />
      {item.figura ? 'Tem figura ou tabela' : 'Tem fórmula'} — ver na prova original{item.pagina ? `, página ${item.pagina}` : ''}
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

export function alternativasDe(item: ItemTela): Array<{ letra: string; texto: string }> {
  return Array.isArray(item.alternativas) ? (item.alternativas as Array<{ letra: string; texto: string }>) : []
}

export const fmtDuracao = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`
export const fmtPct = (p: number) => `${Math.round(p * 100)}%`
