'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Loader2, Play, Eye, Trophy, Calendar, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Prova = {
  id: string
  titulo: string
  ano: number
  etapa: string | null
  cargo: string | null
  banca: string | null
  bancaSlug: string | null
  totalQuestoes: number
  stats: {
    tentativas: number
    ultimaNota: number | null
    melhorNota: number | null
    ultimaTentativaEm: string | null
  }
}

type Data = {
  course: { id: string; name: string; slug: string; cargo: string | null; orgao: string | null }
  provasPorAno: Array<{ ano: number; provas: Prova[] }>
  message?: string
}

export default function ProvasDoCursoPage() {
  const router = useRouter()
  const params = useParams<{ courseSlug: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/me/provas/curso/${params.courseSlug}`)
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar provas'))
      .finally(() => setLoading(false))
  }, [params.courseSlug])

  async function fazerProva(provaId: string) {
    setStarting(provaId)
    try {
      const { data } = await api.post(`/me/provas/${provaId}/start`)
      router.push(`/dashboard/simulados/${data.mockExamId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao iniciar prova')
      setStarting(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!data) return null

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black inline-flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Provas anteriores
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data.course.name}{data.course.cargo ? ` · ${data.course.cargo}` : ''}{data.course.orgao ? ` · ${data.course.orgao}` : ''}
        </p>
      </div>

      {data.message && (
        <div className="card p-6 bg-yellow-50/40 dark:bg-yellow-900/15 border-yellow-200 dark:border-yellow-800/40 text-sm">
          {data.message}
        </div>
      )}

      {data.provasPorAno.length === 0 && !data.message && (
        <div className="card p-8 text-center text-muted-foreground text-sm">
          Nenhuma prova cadastrada ainda.
        </div>
      )}

      <div className="space-y-6">
        {data.provasPorAno.map(({ ano, provas }) => (
          <div key={ano}>
            <h2 className="text-sm font-bold mb-2 inline-flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-brand-500" /> {ano}
              <span className="text-xs text-muted-foreground font-normal">({provas.length} prova{provas.length === 1 ? '' : 's'})</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {provas.map((p) => (
                <div key={p.id} className="card p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{p.titulo}</h3>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
                      {p.banca && <span>{p.banca}</span>}
                      {p.etapa && <><span>·</span><span>{p.etapa}</span></>}
                      <span>·</span>
                      <span>{p.totalQuestoes} questões</span>
                    </div>
                  </div>

                  {p.stats.tentativas > 0 && (
                    <div className="rounded-lg bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Melhor nota
                        </span>
                        <span className="font-bold tabular-nums">{p.stats.melhorNota?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Tentativas
                        </span>
                        <span className="font-bold tabular-nums">{p.stats.tentativas}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => fazerProva(p.id)}
                      disabled={starting === p.id || p.totalQuestoes === 0}
                      className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {starting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {p.stats.tentativas > 0 ? 'Refazer' : 'Fazer prova'}
                    </button>
                    <Link
                      href={`/dashboard/provas/${params.courseSlug}/${p.id}/gabarito`}
                      className={cn(
                        'flex-1 rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5',
                        p.totalQuestoes === 0 && 'opacity-60 pointer-events-none',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver com gabarito
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Como funciona:</strong> "Fazer prova" abre simulado cronometrado com a duração oficial do edital, regra de errada-anula-certa se aplicável, e calcula sua nota no final.
        "Ver com gabarito" mostra todas as questões com resposta correta + comentário Gabaritai. Você pode refazer ilimitado e todo histórico fica salvo.
      </div>
    </div>
  )
}
