'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, ChevronRight, BookOpen, Target, Trophy, Calendar, Shield,
  Plus, X, Pause, Play, AlertTriangle, Crown, ArrowUpRight, Search, CheckCircle2, Star, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Edital = { id: string; ano: number; titulo: string; dataProva: string | null; totalQuestoes: number | null }

type Enrollment = {
  id: string
  courseId: string
  courseSlug: string
  courseName: string
  cargo: string | null
  orgao: string | null
  uf: string | null
  parentSlug: string | null
  area: 'POLICIAL' | 'MILITAR' | 'BOMBEIRO' | 'GUARDA_MUNICIPAL' | 'OUTRO'
  description: string | null
  isActive: boolean
  isPrimary: boolean
  lastDiagnosticAt: string | null
  enrolledAt: string
  lastStudyAt: string | null
  progress: number
  expiresAt: string | null
  activeEdital: Edital | null
}

type PlanInfo = {
  hasPlan: boolean
  slug: string | null
  name: string | null
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL' | null
  maxCourses: number | null
  isBypassed: boolean
  expiresAt: string | null
}

type Usage = {
  activeCount: number
  maxCourses: number | null
  canActivateMore: boolean
}

type CatalogCourse = {
  id: string
  slug: string
  name: string
  cargo: string | null
  orgao: string | null
  parentSlug: string | null
}

const AREA_GRADIENT: Record<string, string> = {
  POLICIAL: 'from-blue-600 via-blue-700 to-indigo-900',
  MILITAR: 'from-green-700 via-green-800 to-emerald-900',
  BOMBEIRO: 'from-red-600 via-red-700 to-orange-900',
  GUARDA_MUNICIPAL: 'from-yellow-600 via-amber-700 to-orange-900',
  OUTRO: 'from-slate-600 to-slate-800',
}
const AREA_ICON: Record<string, string> = {
  POLICIAL: '🚓', MILITAR: '🪖', BOMBEIRO: '🚒', GUARDA_MUNICIPAL: '🛡️', OUTRO: '📚',
}

export default function MeusCursosPage() {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [primaryModal, setPrimaryModal] = useState<{ courseName: string; shouldReDiagnose: boolean } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/me/enrollments')
      setEnrollments(data.enrollments ?? [])
      setPlan(data.plan ?? null)
      setUsage(data.usage ?? null)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao carregar cursos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const ativos = enrollments.filter((e) => e.isActive)
  const inativos = enrollments.filter((e) => !e.isActive)

  async function deactivate(courseId: string) {
    try {
      await api.delete(`/me/enrollments/${courseId}`)
      toast.success('Curso pausado. Progresso preservado, pode reativar quando quiser.')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao desativar')
    }
  }

  async function setPrimary(courseId: string, courseName: string) {
    try {
      const { data } = await api.post(`/me/enrollments/${courseId}/primary`)
      if (data.noChange) {
        toast(`"${courseName}" já é seu curso principal`)
        return
      }
      toast.success(`"${courseName}" agora é seu curso principal`)
      setPrimaryModal({ courseName, shouldReDiagnose: data.shouldReDiagnose })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao trocar curso principal')
    }
  }

  async function activate(courseId: string, name: string) {
    try {
      await api.post(`/me/enrollments/${courseId}`)
      toast.success(`"${name}" ativado!`)
      load()
    } catch (err: any) {
      const data = err.response?.data
      if (err.response?.status === 403 && data?.limit) {
        toast.error(data.message, { duration: 6000 })
        // O modal de upgrade aparece naturalmente — o usuário pode clicar
        // no botão "Trocar de curso" pra abrir o catálogo com a info do limite.
      } else {
        toast.error(data?.message ?? 'Erro ao ativar')
      }
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Meus cursos</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Gerencie os cursos que você está estudando. Troca de curso é livre — progresso fica salvo pra sempre.
        </p>
      </div>

      {/* Banner do plano + uso */}
      {plan && <PlanBanner plan={plan} usage={usage} onAddCourse={() => setBrowserOpen(true)} />}

      {/* Ativos */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Cursos ativos {usage && usage.maxCourses != null && `(${ativos.length}/${usage.maxCourses})`}
        </h2>
        {ativos.length === 0 ? (
          <div className="card p-8 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Você não tem curso ativo no momento.</p>
            {plan?.hasPlan ? (
              <button onClick={() => setBrowserOpen(true)} className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Ativar um curso
              </button>
            ) : (
              <Link href="/planos" className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold inline-block">
                Ver planos
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {ativos.map((e) => (
              <ActiveCourseCard
                key={e.id}
                e={e}
                canChoosePrimary={ativos.length > 1}
                onDeactivate={() => deactivate(e.courseId)}
                onSetPrimary={() => setPrimary(e.courseId, e.courseName)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inativos */}
      {inativos.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Cursos pausados — progresso preservado
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {inativos.map((e) => (
              <InactiveCourseCard
                key={e.id}
                e={e}
                canReactivate={usage?.canActivateMore ?? false}
                onActivate={() => activate(e.courseId, e.courseName)}
              />
            ))}
          </div>
        </div>
      )}

      {browserOpen && (
        <CourseBrowserModal
          enrollments={enrollments}
          usage={usage}
          onClose={() => setBrowserOpen(false)}
          onActivated={() => { setBrowserOpen(false); load() }}
        />
      )}

      {primaryModal && (
        <PrimaryChangeModal
          courseName={primaryModal.courseName}
          shouldReDiagnose={primaryModal.shouldReDiagnose}
          onClose={() => setPrimaryModal(null)}
          onDiagnose={() => { setPrimaryModal(null); router.push('/dashboard/diagnostico') }}
          onJustRecalc={async () => {
            setPrimaryModal(null)
            try {
              await api.post('/schedule/recalculate-for-primary')
              toast.success('Cronograma recalculado pro novo curso principal')
              router.push('/dashboard/cronograma')
            } catch (err: any) {
              toast.error(err.response?.data?.message ?? 'Não consegui recalcular agora — tenta no /dashboard/cronograma')
            }
          }}
        />
      )}
    </div>
  )
}

function PrimaryChangeModal({
  courseName, shouldReDiagnose, onClose, onDiagnose, onJustRecalc,
}: {
  courseName: string
  shouldReDiagnose: boolean
  onClose: () => void
  onDiagnose: () => void
  onJustRecalc: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card max-w-md w-full p-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h3 className="font-black text-lg">Curso principal atualizado</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>"{courseName}"</strong> agora é seu curso principal — cronograma e diagnóstico passam a se basear nele.
        </p>
        {shouldReDiagnose ? (
          <div className="rounded-xl bg-brand-50/40 dark:bg-brand-900/15 border border-brand-300/40 p-3 text-xs space-y-1">
            <div className="font-bold inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-brand-500" /> Quer fazer o diagnóstico inicial?</div>
            <p className="text-muted-foreground">
              20 questões nivelando suas fraquezas no edital deste curso, em ~10 minutos. Cronograma fica priorizando o que você mais precisa.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Você já fez o diagnóstico deste curso antes. Pode refazer pra atualizar (recomendado se faz tempo) ou só recalcular o cronograma sem refazer.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onDiagnose}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> {shouldReDiagnose ? 'Fazer diagnóstico' : 'Refazer'}
          </button>
          <button
            onClick={onJustRecalc}
            className="rounded-xl border border-border bg-card hover:bg-muted py-2.5 text-sm font-bold"
          >
            Só recalcular cronograma
          </button>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
          Decidir depois
        </button>
      </div>
    </div>
  )
}

// ─── Banner do plano + status de uso ─────────────────────────────────────────

function PlanBanner({
  plan, usage, onAddCourse,
}: { plan: PlanInfo; usage: Usage | null; onAddCourse: () => void }) {
  if (!plan.hasPlan) {
    return (
      <div className="card p-4 sm:p-5 border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-900/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-sm">Sem plano ativo</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pra estudar é só escolher um plano. 7 dias grátis, sem cartão.
            </p>
          </div>
          <Link href="/planos" className="rounded-xl bg-amber-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-600 shrink-0">
            Ver planos <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  const cheio = usage?.canActivateMore === false
  const ilimitado = plan.maxCourses == null

  return (
    <div className={cn(
      'card p-4 sm:p-5',
      cheio ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-brand-500',
    )}>
      <div className="flex items-start gap-3">
        <Crown className={cn('w-5 h-5 mt-0.5 shrink-0', cheio ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400')} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
            Plano: {plan.name}
            {plan.expiresAt && (
              <span className="text-[10px] font-normal text-muted-foreground">
                · renova em {new Date(plan.expiresAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ilimitado
              ? 'Você tem acesso a TODOS os cursos da plataforma. Sem limite.'
              : `${usage?.activeCount ?? 0} de ${plan.maxCourses} cursos ativos. Pra trocar, pause um e ative outro — sem perder progresso.`}
          </p>
        </div>
        {!ilimitado && usage?.canActivateMore && (
          <button onClick={onAddCourse} className="rounded-xl bg-brand-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600 shrink-0">
            <Plus className="w-3 h-3" /> Ativar curso
          </button>
        )}
        {!ilimitado && !usage?.canActivateMore && (
          <Link href="/planos" className="rounded-xl bg-amber-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-600 shrink-0">
            <ArrowUpRight className="w-3 h-3" /> Upgrade
          </Link>
        )}
        {ilimitado && (
          <button onClick={onAddCourse} className="rounded-xl bg-brand-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600 shrink-0">
            <Plus className="w-3 h-3" /> Explorar cursos
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Card de curso ATIVO ─────────────────────────────────────────────────────

function ActiveCourseCard({
  e, canChoosePrimary, onDeactivate, onSetPrimary,
}: {
  e: Enrollment
  canChoosePrimary: boolean
  onDeactivate: () => void
  onSetPrimary: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const grad = AREA_GRADIENT[e.area] ?? AREA_GRADIENT.OUTRO
  const icon = AREA_ICON[e.area] ?? '📚'

  return (
    <div className={cn('card overflow-hidden flex flex-col relative', e.isPrimary && 'ring-2 ring-yellow-400/70 ring-offset-2 ring-offset-background')}>
      {e.isPrimary && (
        <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 shadow">
          <Crown className="w-3 h-3" /> PRINCIPAL
        </div>
      )}
      <div className={cn('h-28 sm:h-32 relative bg-gradient-to-br flex items-center justify-center', grad)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="relative z-10 text-center px-3">
          <div className="text-4xl sm:text-5xl mb-1">{icon}</div>
          <div className="text-white font-black text-lg sm:text-xl drop-shadow-lg uppercase tracking-wide line-clamp-1">
            {e.orgao ?? e.courseName}
          </div>
          {e.cargo && (
            <div className="inline-block mt-1 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              {e.cargo}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex-1">
          <h2 className="font-bold text-sm">{e.courseName}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            {e.lastStudyAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(e.lastStudyAt).toLocaleDateString('pt-BR')}
              </span>
            )}
            {e.activeEdital?.dataProva && (
              <span className="inline-flex items-center gap-1">
                <Target className="w-3 h-3" /> prova em {new Date(e.activeEdital.dataProva).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {/* Progresso */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold">{Math.round(e.progress)}%</span>
              <span className="text-[10px] text-muted-foreground">Concluído</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn(
                'h-full transition-all',
                e.progress >= 75 ? 'bg-green-500' : e.progress >= 40 ? 'bg-yellow-500' : 'bg-brand-500',
              )} style={{ width: `${e.progress}%` }} />
            </div>
          </div>
        </div>

        {!confirming ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/dashboard/cronograma?courseSlug=${e.courseSlug}`}
                className="rounded-xl bg-brand-500 text-white py-2.5 text-xs font-bold text-center hover:bg-brand-600 inline-flex items-center justify-center gap-1.5"
              >
                Continuar <ChevronRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-xl border border-border bg-card hover:bg-muted py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                title="Pausa o curso (mantém progresso) pra liberar vaga e ativar outro"
              >
                <Pause className="w-3 h-3" /> Pausar
              </button>
            </div>
            {canChoosePrimary && !e.isPrimary && (
              <button
                onClick={onSetPrimary}
                className="w-full rounded-xl border border-yellow-300 dark:border-yellow-700/60 bg-yellow-50/40 dark:bg-yellow-900/15 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 py-2 text-[11px] font-bold inline-flex items-center justify-center gap-1.5"
                title="Cronograma e diagnóstico passam a se basear neste curso"
              >
                <Star className="w-3 h-3" /> Definir como principal
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/15 p-3 space-y-2">
            <p className="text-[11px] leading-relaxed">
              <strong>Tem certeza?</strong> O progresso fica salvo, mas o curso some do dashboard até você reativar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onDeactivate(); setConfirming(false) }}
                className="rounded-lg bg-amber-500 text-white py-1.5 text-[11px] font-bold hover:bg-amber-600"
              >
                Sim, pausar
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-border bg-card py-1.5 text-[11px] font-bold hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card de curso INATIVO ───────────────────────────────────────────────────

function InactiveCourseCard({
  e, canReactivate, onActivate,
}: { e: Enrollment; canReactivate: boolean; onActivate: () => void }) {
  return (
    <div className="card p-4 flex items-center gap-3 opacity-80">
      <div className="text-2xl shrink-0">{AREA_ICON[e.area] ?? '📚'}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{e.orgao ?? e.courseName}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {e.cargo ?? e.courseName} · {Math.round(e.progress)}% feito
        </div>
      </div>
      {canReactivate ? (
        <button
          onClick={onActivate}
          className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-brand-600 shrink-0"
        >
          <Play className="w-3 h-3" /> Reativar
        </button>
      ) : (
        <Link
          href="/planos"
          className="rounded-lg border border-amber-300 text-amber-700 dark:text-amber-300 px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 shrink-0"
          title="Plano lotado — faça upgrade pra reativar"
        >
          Upgrade
        </Link>
      )}
    </div>
  )
}

// ─── Modal: catálogo de cursos pra adicionar ─────────────────────────────────

function CourseBrowserModal({
  enrollments, usage, onClose, onActivated,
}: {
  enrollments: Enrollment[]
  usage: Usage | null
  onClose: () => void
  onActivated: () => void
}) {
  const [catalog, setCatalog] = useState<CatalogCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    api.get('/courses?all=true')
      .then(({ data }) => {
        const flat: CatalogCourse[] = []
        for (const g of data.groups ?? []) {
          for (const c of g.cargos) flat.push(c)
        }
        setCatalog(flat)
      })
      .catch(() => toast.error('Erro ao carregar catálogo'))
      .finally(() => setLoading(false))
  }, [])

  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return catalog
    return catalog.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.cargo ?? '').toLowerCase().includes(q) ||
      (c.orgao ?? '').toLowerCase().includes(q),
    )
  }, [catalog, search])

  const enrollmentMap = useMemo(() => {
    const m = new Map<string, { isActive: boolean }>()
    for (const e of enrollments) m.set(e.courseId, { isActive: e.isActive })
    return m
  }, [enrollments])

  async function activate(courseId: string, name: string) {
    setActivating(courseId)
    try {
      await api.post(`/me/enrollments/${courseId}`)
      toast.success(`"${name}" ativado!`)
      onActivated()
    } catch (err: any) {
      const data = err.response?.data
      toast.error(data?.message ?? 'Erro ao ativar', { duration: 5000 })
    } finally {
      setActivating(null)
    }
  }

  const lotado = usage?.canActivateMore === false

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-bold text-base">Adicionar curso</h2>
            <p className="text-xs text-muted-foreground">
              {lotado
                ? 'Limite atingido — pause um curso ativo ou faça upgrade do plano.'
                : 'Escolha um curso pra ativar. Você pode pausar e reativar quando quiser.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por concurso, cargo ou órgão"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-brand-500 mx-auto" /></div>
          ) : filteredCatalog.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Nenhum curso encontrado.</div>
          ) : (
            filteredCatalog.map((c) => {
              const status = enrollmentMap.get(c.id)
              const jaAtivo = status?.isActive
              const pausado = status && !status.isActive
              const podeAtivar = !jaAtivo && (!lotado || pausado === true)
              return (
                <div
                  key={c.id}
                  className={cn(
                    'p-3 rounded-lg border flex items-center gap-3',
                    jaAtivo ? 'border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-900/15' : 'border-border bg-card',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.orgao ?? c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {c.cargo ?? c.name}
                      {pausado && <span className="ml-2 text-amber-700 dark:text-amber-400 font-semibold">· pausado</span>}
                    </div>
                  </div>
                  {jaAtivo ? (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                    </span>
                  ) : !podeAtivar && lotado ? (
                    <Link href="/planos" className="text-[11px] font-bold text-amber-700 hover:underline shrink-0">
                      Upgrade
                    </Link>
                  ) : (
                    <button
                      onClick={() => activate(c.id, c.orgao ?? c.name)}
                      disabled={activating === c.id}
                      className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
                    >
                      {activating === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {pausado ? 'Reativar' : 'Ativar'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
