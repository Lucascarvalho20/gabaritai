'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TextoMarcado } from '@/components/TextoMarcado'

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
  /** Caderno do item, quando a prova tem mais de um (senão vale o da prova). */
  caderno?: string | null
}

/** As alternativas de múltipla escolha do item (certo/errado não tem lista). */
export function alternativasDoItem(item: ItemTela): Array<{ letra: string; texto: string }> {
  if (!Array.isArray(item.alternativas)) return []
  return (item.alternativas as Array<{ letra?: unknown; texto?: unknown }>)
    .filter((a): a is { letra: string; texto: string } => typeof a?.letra === 'string' && typeof a?.texto === 'string' && a.texto.trim() !== '')
}

/** Alternativas com a certa marcada e, no resultado, a que o aluno escolheu. */
export function ListaAlternativas({ item, gabarito, resposta }: { item: ItemTela; gabarito?: string | null; resposta?: string | null }) {
  const alternativas = alternativasDoItem(item)
  if (alternativas.length === 0) return null
  return (
    <ul className="space-y-1">
      {alternativas.map((a) => {
        const certa = gabarito === a.letra
        const errada = resposta === a.letra && !certa
        return (
          <li key={a.letra} className={cn('flex gap-2 text-sm rounded-lg px-2 py-1', certa && 'bg-success-500/10', errada && 'bg-danger-500/10')}>
            <span className={cn('font-semibold w-5 shrink-0', certa && 'text-success-600', errada && 'text-danger-600')}>{a.letra})</span>
            <span className="leading-relaxed"><TextoMarcado texto={a.texto} /></span>
          </li>
        )
      })}
    </ul>
  )
}

export type TextoTela = { id: string; codigo: string; titulo: string; conteudo: string }

/**
 * Parágrafos separados por linha em branco; trechos entre ``` viram código com o
 * recuo original; ```linhas é texto com a numeração de linha do caderno.
 */
export function TextoFormatado({ texto, className }: { texto: string; className?: string }) {
  const partes = texto.split(/```\n?/)
  return (
    <div className={cn('space-y-2', className)}>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          p.startsWith('linhas\n') ? (
            <LinhasNumeradas key={i} texto={p.slice('linhas\n'.length)} />
          ) : (
            <pre key={i} className="text-xs bg-muted/60 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{p.replace(/\n$/, '')}</pre>
          )
        ) : (
          p.split(/\n{2,}/).filter((x) => x.trim()).map((par, j) => (
            <p key={`${i}-${j}`} className="whitespace-pre-line"><TextoMarcado texto={par.trim()} /></p>
          ))
        ),
      )}
    </div>
  )
}

/**
 * Texto que as questões citam pela linha ("ℓ.13", "ℓ. 25 a 27"): cada linha do
 * caderno com o número ao lado. Formato de cada linha: "13|texto"; recuo de
 * parágrafo vem como dois espaços; sem número é a fonte do texto, ao pé.
 */
function LinhasNumeradas({ texto }: { texto: string }) {
  const linhas = texto.replace(/\n$/, '').split('\n').map((l) => {
    const corte = l.indexOf('|')
    return { num: l.slice(0, corte), corpo: l.slice(corte + 1) }
  })
  return (
    <div className="leading-relaxed">
      {linhas.map((l, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr] gap-x-2">
          <span className="text-right text-[0.7rem] tabular-nums text-muted-foreground/70 pt-[0.15rem] select-none">{l.num}</span>
          <span className={cn(l.corpo.startsWith('  ') && 'pl-5', !l.num && 'pt-1 text-xs text-muted-foreground')}><TextoMarcado texto={l.corpo.trim()} /></span>
        </div>
      ))}
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
export function AvisoOriginal({ item, caderno: daProva }: { item: ItemTela; caderno: string | null }) {
  const caderno = item.caderno ?? daProva
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
