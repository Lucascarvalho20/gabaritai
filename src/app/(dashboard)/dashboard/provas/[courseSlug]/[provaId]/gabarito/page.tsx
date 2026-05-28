'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Question = {
  id: string
  enunciado: string
  alternativas: any
  gabarito: string
  explicacao: string
  subject: { name: string; slug: string } | null
  topic: { name: string } | null
  difficulty: string
  anulada: boolean
  ano: number | null
}

type Data = {
  prova: {
    id: string
    titulo: string
    ano: number
    etapa: string | null
    cargo: string | null
    banca: string | null
    course: { slug: string; name: string }
    wrongAnnulsRight: boolean
    examFormat: string | null
  }
  questions: Question[]
}

export default function GabaritoPage() {
  const params = useParams<{ courseSlug: string; provaId: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [openExp, setOpenExp] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.get(`/me/provas/${params.provaId}/gabarito`)
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar prova'))
      .finally(() => setLoading(false))
  }, [params.provaId])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!data) return null

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div>
        <Link href={`/dashboard/provas/${params.courseSlug}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Provas
        </Link>
        <h1 className="text-xl font-black inline-flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" /> {data.prova.titulo}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data.prova.banca && `${data.prova.banca} · `}{data.prova.ano}
          {data.prova.etapa && ` · ${data.prova.etapa}`}
          {data.prova.wrongAnnulsRight && <span className="ml-2 text-xs text-warning-600">⚠ Errada anula certa</span>}
        </p>
      </div>

      <div className="card p-3 text-xs text-muted-foreground flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          Modo leitura: você está vendo a prova inteira com gabarito e comentários. Pra fazer cronometrado e
          ter sua nota, volta e clica em <strong>"Fazer prova"</strong>.
        </div>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, idx) => {
          const alts = Array.isArray(q.alternativas) ? q.alternativas
            : typeof q.alternativas === 'object' ? Object.entries(q.alternativas).map(([letra, texto]) => ({ letra, texto }))
            : []
          const gabaritoCorreto = q.gabarito
          return (
            <div key={q.id} className={cn('card p-5 space-y-3', q.anulada && 'opacity-70 border-amber-300')}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-sm">
                  Questão {idx + 1}
                  {q.subject?.name && <span className="text-xs text-muted-foreground font-normal ml-2">· {q.subject.name}{q.topic?.name ? ` · ${q.topic.name}` : ''}</span>}
                </h3>
                {q.anulada && (
                  <span className="text-xs text-amber-600 font-bold inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> ANULADA
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.enunciado}</p>

              <div className="space-y-1.5">
                {alts.map((a: any) => {
                  const letra = a.letra ?? a.id ?? a.label ?? ''
                  const texto = a.texto ?? a.text ?? a.value ?? ''
                  const correta = String(letra).toUpperCase() === String(gabaritoCorreto).toUpperCase()
                  return (
                    <div key={letra} className={cn(
                      'flex gap-2 p-2.5 rounded-lg text-sm',
                      correta
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300'
                        : 'bg-muted/30',
                    )}>
                      <span className={cn('font-bold w-5 shrink-0', correta && 'text-emerald-700 dark:text-emerald-400')}>
                        {String(letra).toUpperCase()})
                      </span>
                      <span className={cn(correta && 'font-semibold')}>{texto}</span>
                      {correta && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                    </div>
                  )
                })}
              </div>

              {q.explicacao && (
                <details
                  open={openExp[q.id]}
                  onToggle={(e) => setOpenExp((s) => ({ ...s, [q.id]: (e.target as HTMLDetailsElement).open }))}
                  className="rounded-lg border border-border bg-card/50 overflow-hidden"
                >
                  <summary className="cursor-pointer px-3 py-2 text-xs font-bold hover:bg-muted/30">
                    💬 Comentário Gabaritai
                  </summary>
                  <div className="px-3 py-3 text-sm border-t border-border whitespace-pre-wrap">
                    {q.explicacao}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
