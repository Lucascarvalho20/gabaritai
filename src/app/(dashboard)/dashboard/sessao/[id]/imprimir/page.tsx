'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

type SessionData = {
  course: { name: string; cargo: string | null }
  subject: { name: string } | null
  topic: { name: string; parentName: string | null } | null
  resumo: string | null
  officialQuestions: Array<any>
  flashcards: Array<{ frente: string; verso: string }>
}

export default function ImprimirSessaoPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/sessao/${params.id}`).then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!data) return <div className="text-center py-20 text-muted-foreground">Sessão não encontrada</div>

  return (
    <>
      <div className="print:hidden max-w-3xl mx-auto px-4 py-3 sticky top-0 z-10 bg-card border-b border-border flex items-center gap-2 flex-wrap">
        <Link href={`/dashboard/sessao/${params.id}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar à sessão
        </Link>
        <div className="flex-1" />
        <button onClick={() => window.print()}
          className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
          <Printer className="w-3 h-3" /> Salvar como PDF
        </button>
      </div>

      <div className="print-doc max-w-3xl mx-auto px-6 py-8 sm:py-12 text-black bg-white">
        <header className="text-center border-b-2 border-black pb-4 mb-6">
          <div className="text-xs uppercase tracking-widest">Gabaritai · Material de estudo</div>
          <h1 className="text-2xl font-black mt-2">{data.subject?.name ?? 'Conteúdo'}</h1>
          {data.topic && (
            <h2 className="text-base font-bold text-gray-700 mt-1">
              {data.topic.parentName && <span>{data.topic.parentName} → </span>}
              {data.topic.name}
            </h2>
          )}
          <div className="text-xs text-gray-600 mt-2">{data.course.name}{data.course.cargo ? ` · ${data.course.cargo}` : ''}</div>
        </header>

        {data.resumo && (
          <section className="mb-8">
            <h2 className="text-lg font-black border-b border-black mb-3 pb-1">📚 Resumo</h2>
            <div className="prose prose-sm max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{data.resumo}</ReactMarkdown>
            </div>
          </section>
        )}

        {data.flashcards && data.flashcards.length > 0 && (
          <section className="mb-8 page-break-before">
            <h2 className="text-lg font-black border-b border-black mb-3 pb-1">⚡ Flashcards ({data.flashcards.length})</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.flashcards.map((f, i) => (
                <div key={i} className="border border-black rounded p-3 break-inside-avoid">
                  <div className="text-[10px] uppercase font-bold mb-1">Pergunta</div>
                  <p className="text-xs mb-2 font-semibold">{f.frente}</p>
                  <div className="text-[10px] uppercase font-bold border-t border-gray-300 pt-1 mt-1">Resposta</div>
                  <p className="text-xs">{f.verso}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.officialQuestions && data.officialQuestions.length > 0 && (
          <section className="page-break-before">
            <h2 className="text-lg font-black border-b border-black mb-3 pb-1">📄 Questões oficiais ({data.officialQuestions.length})</h2>
            <div className="space-y-5">
              {data.officialQuestions.map((q, i) => (
                <article key={i} className="break-inside-avoid">
                  <div className="font-bold text-sm">Questão {i + 1}</div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{q.enunciado}</p>
                  {q.alternativas && q.alternativas.length > 0 ? (
                    <ol className="mt-2 space-y-1 text-sm">
                      {q.alternativas.map((alt: any) => (
                        <li key={alt.letra} className="flex gap-2">
                          <span className="font-bold">({alt.letra})</span>
                          <span>{alt.texto}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="flex gap-6 mt-2 text-sm">
                      <span>(  ) Certo</span>
                      <span>(  ) Errado</span>
                    </div>
                  )}
                  <div className="text-xs mt-2 italic">Gabarito: <strong>{q.gabarito}</strong></div>
                  {q.explicacao && (
                    <div className="text-xs mt-1 p-2 border-l-2 border-gray-400 bg-gray-50">
                      {q.explicacao}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t border-gray-400 text-center text-[10px] text-gray-600">
          Gabaritai · gabaritai.app · gerado em {new Date().toLocaleString('pt-BR')}
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print-doc { padding: 0 !important; max-width: 100% !important; }
          .page-break-before { page-break-before: always; break-before: page; }
          html, body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  )
}
