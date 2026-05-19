'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Loader2, Shield, ChevronRight, BookOpen, Calendar, Award, MapPin } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

type Course = {
  id: string
  slug: string
  name: string
  description: string | null
  area: 'POLICIAL' | 'MILITAR' | 'BOMBEIRO' | 'GUARDA_MUNICIPAL' | 'OUTRO'
  uf: string | null
  orgao: string | null
  cargo: string | null
  parentSlug: string | null
  _count: { courseSubjects: number; editais: number }
}

type Group = {
  parentSlug: string
  orgao: string | null
  area: string
  uf: string | null
  label: string
  cargos: Course[]
}

const AREAS = [
  { id: 'all', label: 'Todos', color: 'brand' },
  { id: 'POLICIAL', label: 'Polícia', color: 'blue' },
  { id: 'MILITAR', label: 'Militar', color: 'green' },
  { id: 'BOMBEIRO', label: 'Bombeiros', color: 'red' },
  { id: 'GUARDA_MUNICIPAL', label: 'Guarda Civil', color: 'yellow' },
]

export default function CursosPublicoPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [area, setArea] = useState<string>('all')

  useEffect(() => {
    fetch('/api/courses?all=true')
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (area !== 'all' && g.area !== area) return false
      if (search) {
        const q = search.toLowerCase()
        const matchesGroup = g.label?.toLowerCase().includes(q) || g.orgao?.toLowerCase().includes(q)
        const matchesCargo = g.cargos.some((c) => c.cargo?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        return matchesGroup || matchesCargo
      }
      return true
    })
  }, [groups, search, area])

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar simples */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Entrar</Link>
            <Link href="/planos" className="text-sm font-bold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero curto */}
      <section className="bg-gradient-to-b from-background to-muted/30 py-10 sm:py-14 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
            Escolha seu <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">concurso</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Mais de 50 cursos divididos por cargo específico. PF Agente, PMDF Soldado, PCDF Escrivão, etc.
            Cada curso tem cronograma adaptativo, simulados cronometrados e mentor IA.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className="sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca: PMDF, escrivão, polícia civil, GO…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {AREAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setArea(a.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border',
                  area === a.id
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-border bg-card hover:bg-muted',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de concursos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-muted-foreground">Nenhum curso encontrado pra essa busca.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <CourseCard key={g.parentSlug} group={g} />
            ))}
          </div>
        )}

        {/* CTA inferior */}
        <div className="mt-12 card p-6 sm:p-10 text-center bg-gradient-to-br from-brand-500/10 to-purple-500/10 border-brand-500/30">
          <h3 className="text-2xl font-black">Não achou seu concurso?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos focados em militares e policiais. Mas se quiser sugerir, manda mensagem que avaliamos.
          </p>
          <Link
            href="/contato"
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600"
          >
            Sugerir concurso <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  )
}

function CourseCard({ group }: { group: Group }) {
  const totalSubjects = group.cargos[0]?._count?.courseSubjects ?? 0
  const hasEdital = group.cargos.some((c) => c._count.editais > 0)

  const areaColor: Record<string, string> = {
    POLICIAL: 'from-blue-500 to-indigo-500',
    MILITAR: 'from-green-500 to-emerald-500',
    BOMBEIRO: 'from-red-500 to-orange-500',
    GUARDA_MUNICIPAL: 'from-yellow-500 to-amber-500',
    OUTRO: 'from-slate-500 to-slate-600',
  }
  const grad = areaColor[group.area] ?? areaColor.OUTRO

  return (
    <div className="card overflow-hidden hover:border-brand-500/40 transition group">
      <div className={cn('h-2 bg-gradient-to-r', grad)} />
      <div className="p-5 flex flex-col gap-3">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="font-black text-lg leading-tight">{group.label}</h2>
            {group.uf && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                <MapPin className="w-3 h-3" /> {group.uf}
              </span>
            )}
          </div>
          {group.orgao && (
            <div className="text-xs text-muted-foreground">{group.orgao}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {group.cargos.map((c) => (
            <span
              key={c.id}
              className="text-[10px] font-bold px-2 py-1 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
            >
              {c.cargo ?? 'Único'}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
          <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {totalSubjects} matérias</span>
          {hasEdital && (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <Award className="w-3 h-3" /> Edital ativo
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <Link
            href={`/cursos/${group.parentSlug}`}
            className="rounded-lg border border-border bg-background hover:bg-muted py-2 text-xs font-bold text-center transition"
          >
            Ver detalhes
          </Link>
          <Link
            href="/planos"
            className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-2 text-xs font-bold text-center transition inline-flex items-center justify-center gap-1"
          >
            Começar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
