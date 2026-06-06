'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, Loader2, BookOpen, AlertCircle, ChevronRight, CheckCircle2, Circle, Pencil,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type CourseCoverage = {
  courseSlug: string
  courseName: string
  area: string | null
  hasEdital: boolean
  totalTopicos: number
  comMaterialPublished: number
  comMaterialDraft: number
  comResumo: number
  coverage: number
}

type DetalheMateria = {
  subjectId: string
  slug: string
  name: string
  ordem: number
  pesoEdital: number
  totalTopicos: number
  comMaterialPublished: number
  coverage: number
  topicos: Array<{
    topicId: string
    name: string
    order: number
    materialId: string | null
    status: string | null
    origin: string | null
    hasResumo: boolean
    updatedAt: string | null
  }>
}

function pctColor(p: number) {
  if (p >= 75) return 'text-success-600'
  if (p >= 30) return 'text-warning-500'
  return 'text-danger-500'
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-success-500' : pct >= 30 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function AdminMaterialsPage() {
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState<CourseCoverage[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<DetalheMateria[] | null>(null)
  const [loadingDet, setLoadingDet] = useState(false)

  useEffect(() => {
    api
      .get('/admin/materials/coverage')
      .then(({ data }) => setCursos(data.cursos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selecionado) return
    setLoadingDet(true)
    setDetalhe(null)
    api
      .get(`/admin/materials/coverage?courseSlug=${selecionado}`)
      .then(({ data }) => setDetalhe(data.materias ?? []))
      .catch(() => setDetalhe([]))
      .finally(() => setLoadingDet(false))
  }, [selecionado])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" /> Materiais por curso
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Cobertura de conteúdo completo + resumo por tópico do edital de cada curso.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lista de cursos */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
            Cursos ({cursos.length})
          </h2>
          {cursos.map((c) => (
            <button
              key={c.courseSlug}
              onClick={() => setSelecionado(c.courseSlug)}
              className={cn(
                'w-full text-left card p-3 hover:border-brand-300 dark:hover:border-brand-700 transition',
                selecionado === c.courseSlug && 'border-brand-500 ring-1 ring-brand-500/30'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.courseName}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {c.area ?? '—'}
                  </p>
                </div>
                <div className={`text-base font-black ${pctColor(c.coverage)}`}>
                  {c.coverage}%
                </div>
              </div>
              {c.hasEdital ? (
                <>
                  <Bar pct={c.coverage} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                    <span>
                      {c.comMaterialPublished}/{c.totalTopicos} publicados
                    </span>
                    {c.comMaterialDraft > 0 && (
                      <span className="text-warning-600">{c.comMaterialDraft} rascunhos</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-warning-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Sem edital ativo
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Detalhe do curso selecionado */}
        <div className="lg:col-span-2">
          {!selecionado ? (
            <div className="card p-12 text-center border-dashed">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecione um curso à esquerda pra ver matérias e tópicos com material.
              </p>
            </div>
          ) : loadingDet ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : !detalhe || detalhe.length === 0 ? (
            <div className="card p-12 text-center border-dashed">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Esse curso ainda não tem edital ativo ou matérias cadastradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detalhe.map((m) => (
                <div key={m.subjectId} className="card p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-bold text-sm">{m.name}</h3>
                    <span className={`text-sm font-black ${pctColor(m.coverage)}`}>
                      {m.comMaterialPublished}/{m.totalTopicos}
                    </span>
                  </div>
                  <Bar pct={m.coverage} />

                  <ul className="mt-3 space-y-1">
                    {m.topicos.map((t) => (
                      <li
                        key={t.topicId}
                        className="flex items-center gap-2 text-xs py-1 hover:bg-muted/30 -mx-2 px-2 rounded"
                      >
                        {t.status === 'PUBLISHED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success-500 shrink-0" />
                        ) : t.status === 'DRAFT' ? (
                          <Circle className="w-3.5 h-3.5 text-warning-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                        )}
                        <span className="flex-1 min-w-0 truncate">{t.name}</span>
                        {t.materialId ? (
                          <>
                            {t.origin && (
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60 shrink-0">
                                {t.origin}
                              </span>
                            )}
                            {t.hasResumo && (
                              <span className="text-[9px] uppercase tracking-wide font-bold text-brand-600 dark:text-brand-400 shrink-0">
                                Resumo
                              </span>
                            )}
                            <Link
                              href={`/admin/materials/${t.materialId}`}
                              className="text-brand-600 hover:underline shrink-0 inline-flex items-center gap-0.5"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>editar</span>
                            </Link>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 shrink-0">
                            sem material
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
