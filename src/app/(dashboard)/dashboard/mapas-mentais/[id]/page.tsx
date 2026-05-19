'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, Printer, Brain, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Branch = {
  label: string
  icon?: string
  color?: string
  items?: Array<{ label: string; subItems?: string[] } | string>
}
type Mapa = {
  title: string
  central: { label: string; icon?: string }
  branches: Branch[]
}
type ApiResp = {
  id: string
  title: string
  createdAt: string
  subject: { name: string; slug: string } | null
  mapa: Mapa
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; line: string }> = {
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-300',   line: 'stroke-blue-400' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300', line: 'stroke-yellow-500' },
  green:  { bg: 'bg-green-500',  text: 'text-green-700 dark:text-green-300',   border: 'border-green-300',  line: 'stroke-green-500' },
  red:    { bg: 'bg-red-500',    text: 'text-red-700 dark:text-red-300',       border: 'border-red-300',    line: 'stroke-red-500' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300', line: 'stroke-purple-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300', line: 'stroke-orange-500' },
}
const FALLBACK_COLORS = ['blue', 'yellow', 'green', 'red', 'purple', 'orange']

export default function MapaMentalDetalhePage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/mapas-mentais/${params.id}`).then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }
  if (!data) {
    return <div className="text-center py-16 text-muted-foreground">Mapa mental não encontrado.</div>
  }

  const m = data.mapa
  // Divide branches em esquerda/direita pra fluxo simétrico estilo da foto
  const mid = Math.ceil((m.branches?.length ?? 0) / 2)
  const leftBranches = (m.branches ?? []).slice(0, mid).map((b, i) => ({ ...b, color: b.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }))
  const rightBranches = (m.branches ?? []).slice(mid).map((b, i) => ({ ...b, color: b.color ?? FALLBACK_COLORS[(mid + i) % FALLBACK_COLORS.length] }))

  return (
    <>
      <div className="print:hidden max-w-5xl mx-auto px-2 sm:px-4 py-3 flex items-center gap-2 flex-wrap">
        <Link href="/dashboard/mapas-mentais" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar
        </Link>
        <div className="flex-1" />
        {data.subject && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {data.subject.name}
          </span>
        )}
        <button onClick={() => window.print()}
          className="rounded-lg bg-purple-500 text-white px-3 py-1.5 text-xs font-bold hover:bg-purple-600 inline-flex items-center gap-1">
          <Printer className="w-3 h-3" /> Imprimir / PDF
        </button>
      </div>

      <div className="mapa-doc bg-white dark:bg-card text-foreground max-w-5xl mx-auto p-4 sm:p-8 rounded-2xl border border-border">
        <h1 className="text-center font-black text-xl sm:text-2xl mb-2 px-4">{m.title}</h1>

        {/* Visualização desktop: tree horizontal estilo da foto */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-4 items-center min-h-[500px] mt-6">
          {/* Esquerda */}
          <div className="space-y-8">
            {leftBranches.map((b, i) => <BranchNode key={i} b={b} side="left" />)}
          </div>
          {/* Central */}
          <div className="flex flex-col items-center gap-3 self-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center text-white shadow-2xl text-center p-4">
              <div className="text-3xl mb-1">{m.central?.icon ?? '🧠'}</div>
              <div className="font-black text-xs leading-tight">{m.central?.label}</div>
            </div>
          </div>
          {/* Direita */}
          <div className="space-y-8">
            {rightBranches.map((b, i) => <BranchNode key={i} b={b} side="right" />)}
          </div>
        </div>

        {/* Visualização mobile: lista vertical */}
        <div className="md:hidden space-y-4 mt-6">
          <div className="flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center text-white shadow-xl text-center p-3">
              <div className="text-2xl mb-1">{m.central?.icon ?? '🧠'}</div>
              <div className="font-black text-[10px] leading-tight">{m.central?.label}</div>
            </div>
          </div>
          <div className="space-y-3">
            {(m.branches ?? []).map((b, i) => (
              <BranchNode
                key={i}
                b={{ ...b, color: b.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                side="left"
                mobile
              />
            ))}
          </div>
        </div>

        <footer className="mt-12 pt-4 border-t border-border text-center text-[10px] text-muted-foreground italic">
          Gerado pela IA do Gabaritai · Estude visualmente, memorize de verdade
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .mapa-doc { border: none !important; box-shadow: none !important; }
          html, body { background: white !important; }
        }
      `}</style>
    </>
  )
}

function BranchNode({ b, side, mobile }: { b: Branch; side: 'left' | 'right'; mobile?: boolean }) {
  const c = COLOR_MAP[b.color ?? 'blue'] ?? COLOR_MAP.blue
  return (
    <div className={cn('flex gap-3', side === 'right' && !mobile && 'flex-row', side === 'left' && !mobile && 'flex-row-reverse text-right')}>
      {!mobile && (
        <div className={cn('w-1 self-stretch rounded-full', c.bg)} />
      )}
      <div className="flex-1 min-w-0">
        <div className={cn('font-bold text-sm flex items-center gap-1.5', c.text, side === 'left' && !mobile && 'justify-end')}>
          {b.icon && <span className="text-base">{b.icon}</span>}
          <span>{b.label}</span>
        </div>
        <ul className={cn('mt-1.5 space-y-0.5 text-xs text-muted-foreground', side === 'left' && !mobile && 'items-end')}>
          {(b.items ?? []).map((it, i) => {
            const isObj = typeof it === 'object'
            const label = isObj ? it.label : it
            const subs = isObj ? it.subItems : null
            return (
              <li key={i} className="leading-tight">
                <span className={cn('inline-block w-1 h-1 rounded-full mr-1.5 align-middle', c.bg)} />
                <span>{label}</span>
                {subs && subs.length > 0 && (
                  <ul className="ml-3 mt-0.5 text-[10px] opacity-80">
                    {subs.map((s, j) => (
                      <li key={j}>
                        <span className={cn('inline-block w-1 h-1 rounded-full mr-1.5 align-middle', c.bg, 'opacity-50')} />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
