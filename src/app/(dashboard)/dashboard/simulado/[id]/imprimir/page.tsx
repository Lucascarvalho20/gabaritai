'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Q = {
  numero: number
  id: string
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }>
  gabarito: string
  explicacao: string
  subjectName: string
  subjectSlug: string
}

type ExamPrint = {
  id: string
  title: string
  type: string
  durationMin: number
  totalQuestoes: number
  bancaSlug: string | null
  examFormat: 'CE' | 'ME_5' | 'ME_4' | 'MISTA' | null
  wrongAnnulsRight: boolean
  questions: Q[]
  minhasRespostas: Array<{ questionId: string; selected: string | null; correct: boolean }> | null
  minhaNota: { score: number; acertos: number; erros: number; brancos: number } | null
}

export default function ImprimirSimuladoPage() {
  const params = useParams<{ id: string }>()
  const [exam, setExam] = useState<ExamPrint | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGabarito, setShowGabarito] = useState(true)
  const [showExplicacoes, setShowExplicacoes] = useState(false)

  useEffect(() => {
    api.get(`/simulados/${params.id}/print`)
      .then(({ data }) => setExam(data))
      .catch((e) => toast.error(e.response?.data?.message ?? 'Sem permissão pra imprimir'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!exam) {
    return (
      <div className="max-w-md mx-auto card p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
        <Link href="/dashboard/simulados" className="text-sm text-brand-500 font-semibold">← Voltar</Link>
      </div>
    )
  }

  const isCE = exam.examFormat === 'CE'
  const respMap = new Map((exam.minhasRespostas ?? []).map((r) => [r.questionId, r]))

  return (
    <>
      {/* Controles (escondidos no print) */}
      <div className="print:hidden max-w-3xl mx-auto px-4 py-3 sticky top-0 z-10 bg-card border-b border-border flex items-center gap-2 flex-wrap">
        <Link href="/dashboard/simulados" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar
        </Link>
        <div className="flex-1" />
        <label className="text-xs inline-flex items-center gap-1.5">
          <input type="checkbox" checked={showGabarito} onChange={(e) => setShowGabarito(e.target.checked)} /> Gabarito
        </label>
        <label className="text-xs inline-flex items-center gap-1.5">
          <input type="checkbox" checked={showExplicacoes} onChange={(e) => setShowExplicacoes(e.target.checked)} /> Explicações
        </label>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-xs font-bold hover:bg-brand-600 inline-flex items-center gap-1"
        >
          <Printer className="w-3 h-3" /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="print-doc max-w-3xl mx-auto px-4 py-6 sm:py-10 text-black bg-white">
        {/* CAPA */}
        <section className="text-center border-b-2 border-black pb-6 mb-6">
          <div className="text-xs uppercase tracking-widest">Gabaritai · Simulado oficial</div>
          <h1 className="text-3xl font-black mt-2 mb-4">{exam.title}</h1>
          <div className="grid grid-cols-2 gap-3 text-sm max-w-md mx-auto">
            <Info label="Banca" value={exam.bancaSlug?.toUpperCase() ?? '—'} />
            <Info label="Formato" value={isCE ? 'Certo/Errado' : 'Múltipla escolha'} />
            <Info label="Questões" value={`${exam.totalQuestoes}`} />
            <Info label="Duração" value={`${exam.durationMin} min`} />
            {exam.wrongAnnulsRight && <Info label="Errada anula" value="SIM" />}
          </div>
          {exam.minhaNota && (
            <div className="mt-4 inline-block px-4 py-2 border-2 border-black rounded">
              <strong>Sua nota:</strong> {exam.minhaNota.score}/10 ·
              ✓ {exam.minhaNota.acertos} · ✗ {exam.minhaNota.erros} · — {exam.minhaNota.brancos}
            </div>
          )}
          <p className="text-xs mt-4 italic">
            Você tem {exam.durationMin} minutos. Não consulte materiais externos.
          </p>
        </section>

        {/* QUESTÕES agrupadas por BLOCO TEMÁTICO (estilo Ponto Juris/Cebraspe) */}
        {Object.entries(
          exam.questions.reduce<Record<string, Q[]>>((acc, q) => {
            const key = q.subjectName
            if (!acc[key]) acc[key] = []
            acc[key].push(q)
            return acc
          }, {}),
        ).map(([subjectName, qs], blockIdx) => (
          <section key={subjectName} className={blockIdx > 0 ? 'mt-8' : ''}>
            <div className="bg-gray-700 text-white text-center py-1.5 px-3 my-3 rounded-sm">
              <div className="text-[10px] uppercase tracking-widest opacity-80">Bloco {blockIdx + 1}</div>
              <div className="font-black text-base">{subjectName.toUpperCase()}</div>
            </div>
            <div className="space-y-5">
              {qs.map((q) => {
                const minhaResp = respMap.get(q.id)
                return (
                  <article key={q.id} className="break-inside-avoid">
                    <div className="font-bold text-sm mb-2">Questão {q.numero}</div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3">{q.enunciado}</p>
                    {isCE ? (
                      <div className="flex gap-6 text-sm">
                        <span>(  ) Certo</span>
                        <span>(  ) Errado</span>
                      </div>
                    ) : (
                      <ol className="space-y-1 text-sm">
                        {q.alternativas?.map((alt) => (
                          <li key={alt.letra} className="flex gap-2">
                            <span className="font-semibold">({alt.letra})</span>
                            <span>{alt.texto}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {minhaResp && (
                      <div className="text-xs mt-2 italic">
                        Sua resposta: <strong>{minhaResp.selected ?? '—'}</strong>
                        {' · '}
                        {minhaResp.correct ? '✓ correto' : minhaResp.selected ? `✗ (gabarito: ${q.gabarito})` : `em branco (gabarito: ${q.gabarito})`}
                      </div>
                    )}
                    {showExplicacoes && q.explicacao && (
                      <div className="text-xs mt-2 p-2 border-l-2 border-gray-400 bg-gray-50">
                        <strong>Explicação:</strong> {q.explicacao}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ))}

        {/* FOLHA DE RESPOSTAS */}
        <section className="page-break mt-10 pt-10 border-t-2 border-black">
          <h2 className="font-black text-lg mb-3">Folha de respostas</h2>
          <p className="text-xs mb-4">Marque a alternativa correta de cada questão.</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-xs">
            {exam.questions.map((q) => (
              <div key={q.id} className="border border-black p-1.5">
                <div className="font-bold text-center">{q.numero}</div>
                <div className="flex justify-center gap-1 mt-1">
                  {isCE ? ['C', 'E'].map((l) => (
                    <span key={l} className="w-4 h-4 border border-black inline-block text-[8px] text-center leading-3">{l}</span>
                  )) : ['A', 'B', 'C', 'D', 'E'].map((l) => (
                    <span key={l} className="w-3 h-3 border border-black inline-block text-[7px] text-center leading-3">{l}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GABARITO */}
        {showGabarito && (
          <section className="page-break mt-10 pt-10 border-t-2 border-black">
            <h2 className="font-black text-lg mb-3">Gabarito oficial</h2>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 text-xs">
              {exam.questions.map((q) => (
                <div key={q.id} className="border border-black p-1.5 text-center">
                  <div className="font-bold">{q.numero}</div>
                  <div className="font-mono mt-0.5">{q.gabarito}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-gray-400 text-center text-[10px] text-gray-600">
          Gabaritai · Plataforma de preparação pra concursos militares e policiais · gabaritai.app
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print-doc { padding: 0 !important; max-width: 100% !important; }
          .page-break { page-break-before: always; break-before: page; }
          html, body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-300 pb-1">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
