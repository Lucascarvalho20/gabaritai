'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Loader2, ArrowLeft, Sparkles, ChevronDown, Calendar, Users, Clock, Award, BookOpen, Target, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Edital = {
  id: string
  ano: number
  titulo: string
  banca: string | null
  bancaSlug: string | null
  dataProva: string | null
  totalQuestoes: number | null
  duracaoMin: number | null
  vagas: number | null
  examFormat: string | null
  hasRedacao: boolean
  isActive: boolean
}

type Materia = {
  subjectId: string
  subjectSlug: string
  subjectName: string
  weight: number
  expectedQuestions: number
  programaTopicos: string[]
  stats: {
    meusAcertos: number
    meusErros: number
    meuTotal: number
    meuAcerto: number | null
    questoesDisponiveis: number
    oficiais: number
    ia: number
  }
}

export default function EditalVerticalizadoCursoPage() {
  const params = useParams<{ courseSlug: string }>()
  const [data, setData] = useState<{
    course: { slug: string; name: string; cargo: string | null }
    edital: Edital | null
    materias: Materia[]
    message?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/edital-verticalizado/${params.courseSlug}`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [params.courseSlug])

  async function gerarSimulado(m: Materia, courseId: string) {
    setGenerating(m.subjectId)
    try {
      const { data: simulado } = await api.post('/simulados/generate', {
        type: 'MINI',
        courseId,
        subjectId: m.subjectId,
        totalQuestoes: 10,
        durationMin: 15,
      })
      toast.success('Mini-simulado dessa matéria gerado!')
      window.location.href = `/dashboard/simulados/${simulado.id}/fazer`
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao gerar')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!data) return <div className="text-center py-16 text-muted-foreground">Curso não encontrado.</div>

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <Link href="/dashboard/edital-verticalizado" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-black">{data.course.name}{data.course.cargo ? ` — ${data.course.cargo}` : ''}</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">Edital verticalizado: matérias cobradas, peso e assuntos.</p>
      </div>

      {data.edital ? (
        <div className="card p-4 bg-gradient-to-br from-brand-500/5 to-purple-500/5 border-brand-500/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {data.edital.isActive && <span className="badge badge-yellow text-[10px]">📌 EM VIGOR</span>}
            <span className="text-xs font-bold">{data.edital.titulo}</span>
            <span className="text-xs text-muted-foreground">· {data.edital.ano}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Info icon={Award} label="Banca" value={data.edital.banca ?? '—'} />
            <Info icon={Users} label="Vagas" value={data.edital.vagas ?? '—'} />
            <Info icon={Target} label="Questões" value={data.edital.totalQuestoes ?? '—'} />
            <Info icon={Clock} label="Duração" value={data.edital.duracaoMin ? `${data.edital.duracaoMin}min` : '—'} />
            {data.edital.dataProva && (
              <Info icon={Calendar} label="Data prova" value={new Date(data.edital.dataProva).toLocaleDateString('pt-BR')} />
            )}
            {data.edital.examFormat && <Info icon={FileText} label="Formato" value={data.edital.examFormat} />}
            {data.edital.hasRedacao && <Info icon={FileText} label="Redação" value="SIM" />}
          </div>
        </div>
      ) : (
        <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500/30 text-sm">
          {data.message}
        </div>
      )}

      {data.materias.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground text-sm">
          Edital ainda sem matérias detalhadas. Admin precisa importar/extrair.
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-bold mb-2">Matérias por ordem de peso ({data.materias.length})</h2>
          <div className="space-y-2">
            {data.materias.map((m) => {
              const isExpanded = expanded === m.subjectId
              const peso = Math.round((m.weight / data.materias.reduce((s, x) => s + x.weight, 0)) * 100)
              return (
                <div key={m.subjectId} className="card overflow-hidden">
                  <button onClick={() => setExpanded(isExpanded ? null : m.subjectId)}
                    className="w-full p-4 text-left hover:bg-muted/30 transition">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-sm">{m.subjectName}</h3>
                          <span className="badge badge-purple text-[10px]">peso {m.weight}</span>
                          <span className="text-[10px] text-muted-foreground">≈ {peso}% da prova</span>
                          <span className="text-[10px] text-muted-foreground">· {m.expectedQuestions} questões</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>📚 {m.stats.questoesDisponiveis} disponíveis ({m.stats.oficiais} of, {m.stats.ia} ia)</span>
                          {m.stats.meuTotal > 0 && (
                            <span className={cn(
                              m.stats.meuAcerto! >= 70 ? 'text-green-600' : m.stats.meuAcerto! >= 50 ? 'text-yellow-600' : 'text-red-600',
                            )}>
                              ✓ você: {m.stats.meuAcerto}% acerto ({m.stats.meuTotal}q)
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition shrink-0', isExpanded && 'rotate-180')} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3 bg-muted/20">
                      {m.programaTopicos.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold mb-2">📖 Assuntos cobrados</h4>
                          <ul className="grid sm:grid-cols-2 gap-1 text-xs">
                            {m.programaTopicos.map((t, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => gerarSimulado(m, '')}
                          disabled={generating === m.subjectId}
                          className="rounded-lg bg-brand-500 text-white px-3 py-2 text-xs font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-1">
                          {generating === m.subjectId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Mini-simulado dessa matéria
                        </button>
                        <Link href={`/dashboard/questoes?subjectSlug=${m.subjectSlug}`}
                          className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-bold inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Ver banco de questões
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground"><Icon className="w-3 h-3" /> {label}</div>
      <div className="font-bold mt-0.5">{value}</div>
    </div>
  )
}
