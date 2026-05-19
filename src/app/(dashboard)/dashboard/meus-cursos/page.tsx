'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight, BookOpen, Target, Trophy, Calendar, Shield, Flame } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Curso = {
  id: string
  slug: string
  name: string
  cargo: string | null
  orgao: string | null
  uf: string | null
  area: 'POLICIAL' | 'MILITAR' | 'BOMBEIRO' | 'GUARDA_MUNICIPAL' | 'OUTRO'
  progress: number
  avgMastery: number
  totalAttempts: number
  totalCorrect: number
  simuladosFeitos: number
  enrolledAt: string
  expiresAt: string | null
  lastStudyAt: string | null
  _count: { courseSubjects: number; editais: number }
}

const AREA_GRADIENT: Record<string, string> = {
  POLICIAL: 'from-blue-600 via-blue-700 to-indigo-900',
  MILITAR: 'from-green-700 via-green-800 to-emerald-900',
  BOMBEIRO: 'from-red-600 via-red-700 to-orange-900',
  GUARDA_MUNICIPAL: 'from-yellow-600 via-amber-700 to-orange-900',
  OUTRO: 'from-slate-600 to-slate-800',
}

const AREA_ICON: Record<string, string> = {
  POLICIAL: '🚓',
  MILITAR: '🪖',
  BOMBEIRO: '🚒',
  GUARDA_MUNICIPAL: '🛡️',
  OUTRO: '📚',
}

export default function MeusCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/me/cursos').then(({ data }) => setCursos(data.cursos ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Meus cursos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Continue de onde parou em cada concurso que você tá estudando.
        </p>
      </div>

      {cursos.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Você ainda não tem nenhum curso ativo.</p>
          <Link href="/planos" className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold inline-block">
            Ver planos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cursos.map((c) => <CursoCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}

function CursoCard({ c }: { c: Curso }) {
  const grad = AREA_GRADIENT[c.area] ?? AREA_GRADIENT.OUTRO
  const icon = AREA_ICON[c.area] ?? '📚'

  return (
    <div className="card overflow-hidden">
      {/* Cover */}
      <div className={cn('h-32 sm:h-40 relative bg-gradient-to-br flex items-center justify-center', grad)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="relative z-10 text-center">
          <div className="text-5xl sm:text-6xl mb-1">{icon}</div>
          <div className="text-white font-black text-xl sm:text-2xl drop-shadow-lg uppercase tracking-wide">
            {c.orgao ?? c.name}
          </div>
          {c.cargo && (
            <div className="inline-block mt-1 bg-black/40 text-white text-xs font-bold px-3 py-0.5 rounded">
              {c.cargo}
            </div>
          )}
          {c.uf && (
            <div className="text-white/80 text-xs mt-1">{c.uf}</div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="font-bold text-base">{c.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {c._count.courseSubjects} matérias</span>
            <span className="inline-flex items-center gap-1"><Target className="w-3 h-3" /> {c.totalAttempts} questões</span>
            <span className="inline-flex items-center gap-1"><Trophy className="w-3 h-3" /> {c.simuladosFeitos} simulados</span>
            {c.lastStudyAt && (
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> última atividade: {new Date(c.lastStudyAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>

        {/* Progresso */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">{c.progress}%</span>
            <span className="text-[10px] text-muted-foreground">Concluído</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full transition-all', c.progress >= 75 ? 'bg-green-500' : c.progress >= 40 ? 'bg-yellow-500' : 'bg-brand-500')}
              style={{ width: `${c.progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href={`/dashboard/cronograma?courseSlug=${c.slug}`}
            className="rounded-xl bg-brand-500 text-white py-2.5 text-xs font-bold text-center hover:bg-brand-600 inline-flex items-center justify-center gap-1.5">
            Continuar estudando <ChevronRight className="w-3 h-3" />
          </Link>
          <Link href={`/dashboard/edital-verticalizado/${c.slug}`}
            className="rounded-xl border border-border bg-card hover:bg-muted py-2.5 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" /> Edital
          </Link>
        </div>
      </div>
    </div>
  )
}
