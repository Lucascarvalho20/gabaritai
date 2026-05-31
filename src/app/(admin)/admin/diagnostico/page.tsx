'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Brain, Loader2, RefreshCw, Sparkles, CheckCircle2, AlertTriangle,
  FileText, BookOpen, Users, Calendar, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Curso = {
  courseId: string
  slug: string
  name: string
  orgao: string | null
  cargo: string | null
  parentSlug: string | null
  area: string | null
  edital: {
    id: string
    ano: number
    titulo: string
    banca: { slug: string; name: string } | null
    materiasCount: number
  } | null
  pool: {
    size: number
    lastGeneratedAt: string | null
    complete: boolean
  }
  stats: {
    alunosDiagnosticados: number
  }
}

export default function AdminDiagnosticoPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [lastResult, setLastResult] = useState<{ slug: string; data: any } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/diagnostico/cursos')
      setCursos(data.cursos ?? [])
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao carregar')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function gerar(curso: Curso, regenerate: boolean) {
    if (!curso.edital) {
      toast.error('Curso sem edital cadastrado — adicione antes')
      return
    }
    if (regenerate && !confirm(`Regerar pool de "${curso.name}"? Pool atual (${curso.pool.size} questões) vira inactive. Histórico de respostas é preservado.`)) {
      return
    }
    setRunning((r) => ({ ...r, [curso.slug]: true }))
    try {
      const { data } = await api.post(`/admin/diagnostico/preparar/${curso.courseId}`, { regenerate })
      if (data.noChange) {
        toast(`Pool já existe (${data.poolSize}) — clique em "Regerar" pra recriar`)
      } else {
        toast.success(`✅ ${data.poolSize} questões geradas — banca ${data.banca}`, { duration: 6000 })
        setLastResult({ slug: curso.slug, data })
      }
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Falha na geração', { duration: 6000 })
    } finally {
      setRunning((r) => ({ ...r, [curso.slug]: false }))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  const comEdital = cursos.filter((c) => c.edital)
  const semEdital = cursos.filter((c) => !c.edital)
  const semPool = comEdital.filter((c) => c.pool.size === 0)
  const incompletos = comEdital.filter((c) => c.pool.size > 0 && !c.pool.complete)
  const completos = comEdital.filter((c) => c.pool.complete)

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Brain className="w-6 h-6 text-brand-500" /> Pool de Diagnóstico
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cada curso precisa de um pool de 50 questões IA pra rodar o diagnóstico inicial.
          As 20 questões que cada aluno vê são sorteadas desse pool, respeitando peso do edital
          e estilo da banca.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Cursos ativos" value={cursos.length} />
        <StatCard label="Sem edital" value={semEdital.length} color="text-yellow-600" />
        <StatCard label="Sem pool gerado" value={semPool.length} color="text-red-500" />
        <StatCard label="Completos (40+)" value={completos.length} color="text-green-600" />
      </div>

      {lastResult && (
        <div className="card p-4 bg-green-50/40 dark:bg-green-900/15 border-green-200 dark:border-green-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Última geração: {lastResult.slug}
            </h3>
            <button onClick={() => setLastResult(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {lastResult.data.porMateria?.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="truncate flex-1">{m.subjectName}</span>
                <span className={cn('font-bold tabular-nums shrink-0', m.gerado < m.planejado ? 'text-yellow-600' : 'text-green-600')}>
                  {m.gerado}/{m.planejado}
                </span>
              </div>
            ))}
          </div>
          {lastResult.data.materiasFalha?.length > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3 inline mr-1" /> Falhas: {lastResult.data.materiasFalha.join(', ')}
            </div>
          )}
        </div>
      )}

      {semEdital.length > 0 && (
        <Section title="⚠ Sem edital cadastrado" desc="Esses cursos precisam de edital ativo antes de gerar pool" color="yellow">
          {semEdital.map((c) => (
            <CursoCard key={c.slug} curso={c} onGenerate={() => {}} running={false} disabled />
          ))}
        </Section>
      )}

      {semPool.length > 0 && (
        <Section title="🔴 Sem pool — pendente" desc="Clica em 'Gerar 50' pra criar pool IA respeitando banca + peso do edital" color="red">
          {semPool.map((c) => (
            <CursoCard key={c.slug} curso={c} onGenerate={(reg) => gerar(c, reg)} running={running[c.slug]} />
          ))}
        </Section>
      )}

      {incompletos.length > 0 && (
        <Section title="🟡 Incompletos" desc="Menos de 40 questões — alguma matéria falhou. Pode regerar." color="yellow">
          {incompletos.map((c) => (
            <CursoCard key={c.slug} curso={c} onGenerate={(reg) => gerar(c, reg)} running={running[c.slug]} />
          ))}
        </Section>
      )}

      {completos.length > 0 && (
        <Section title="🟢 Prontos pra diagnóstico" desc="Pool de 40+ questões disponível. Regerar se quiser refresh do conteúdo." color="green">
          {completos.map((c) => (
            <CursoCard key={c.slug} curso={c} onGenerate={(reg) => gerar(c, reg)} running={running[c.slug]} />
          ))}
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={cn('text-2xl font-black tabular-nums', color ?? 'text-foreground')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, desc, color, children }: { title: string; desc: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function CursoCard({
  curso, onGenerate, running, disabled,
}: {
  curso: Curso
  onGenerate: (regenerate: boolean) => void
  running: boolean
  disabled?: boolean
}) {
  return (
    <div className="card p-4 space-y-3">
      <div>
        <h3 className="font-bold text-sm leading-tight">{curso.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
          {curso.orgao && <span>{curso.orgao}</span>}
          {curso.cargo && <><span>·</span><span>{curso.cargo}</span></>}
          {curso.edital?.banca && <><span>·</span><span className="badge-blue uppercase">{curso.edital.banca.name}</span></>}
        </div>
      </div>

      {curso.edital ? (
        <div className="rounded-lg bg-muted/30 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <FileText className="w-3 h-3" /> Edital
            </span>
            <span className="font-semibold tabular-nums">{curso.edital.ano} · {curso.edital.materiasCount} matérias</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Pool atual
            </span>
            <span className={cn(
              'font-bold tabular-nums',
              curso.pool.size === 0 ? 'text-red-500'
                : curso.pool.size < 40 ? 'text-yellow-600'
                : 'text-green-600',
            )}>
              {curso.pool.size} questões
            </span>
          </div>
          {curso.pool.lastGeneratedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Última geração
              </span>
              <span className="text-foreground tabular-nums">{new Date(curso.pool.lastGeneratedAt).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          {curso.stats.alunosDiagnosticados > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> Diagnósticos feitos
              </span>
              <span className="text-foreground tabular-nums">{curso.stats.alunosDiagnosticados}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground bg-yellow-50/40 dark:bg-yellow-900/15 border border-yellow-200 dark:border-yellow-800/40 rounded-lg p-2.5 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" /> Precisa cadastrar edital antes
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {curso.pool.size === 0 ? (
          <button
            onClick={() => onGenerate(false)}
            disabled={disabled || running || !curso.edital}
            className="col-span-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {running ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando…</> : <><Sparkles className="w-3 h-3" /> Gerar 50</>}
          </button>
        ) : (
          <>
            <Link
              href={`/admin/editais/${curso.edital?.id}/verticalizado`}
              className="rounded-xl border border-border bg-card hover:bg-muted py-2.5 text-xs font-semibold text-center inline-flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3 h-3" /> Verticalizado
            </Link>
            <button
              onClick={() => onGenerate(true)}
              disabled={disabled || running || !curso.edital}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {running ? <><Loader2 className="w-3 h-3 animate-spin" /> Regerando…</> : <><RefreshCw className="w-3 h-3" /> Regerar</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
