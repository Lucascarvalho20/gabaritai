'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, CheckCircle2, XCircle, Loader2, FileText, ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Review = {
  questionId: string
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }>
  selected: string | null
  gabarito: string
  correct: boolean
  explicacao: string
  materia: string
}

type ResultData = {
  id: string
  score: number
  scoreRaw: number
  acertos: number
  erros: number
  brancos: number
  timeMs: number
  redacaoText: string | null
  redacaoMin: number | null
  mockExam: { title: string; totalQuestoes: number; hasRedacao: boolean; examFormat: string | null }
  review: Review[]
}

export default function ResultadoPage() {
  const params = useParams<{ id: string; resultId: string }>()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnlyWrong, setShowOnlyWrong] = useState(false)

  useEffect(() => {
    api.get(`/simulados/${params.id}/result/${params.resultId}`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [params.id, params.resultId])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!data) return <div className="card p-6 max-w-2xl mx-auto text-center text-muted-foreground">Resultado não encontrado.</div>

  const pct = (data.acertos / data.mockExam.totalQuestoes) * 100
  const tone = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'
  const filtered = showOnlyWrong ? data.review.filter((r) => !r.correct) : data.review

  // Por matéria
  const bySubject: Record<string, { total: number; correct: number }> = {}
  for (const r of data.review) {
    if (!r.materia) continue
    const cur = bySubject[r.materia] ?? { total: 0, correct: 0 }
    cur.total++
    if (r.correct) cur.correct++
    bySubject[r.materia] = cur
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <Link href="/dashboard/simulados" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar aos simulados
      </Link>

      {/* Hero do resultado */}
      <div className={cn(
        'card p-6 text-center',
        tone === 'success' && 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200',
        tone === 'warning' && 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200',
        tone === 'danger' && 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200',
      )}>
        <Trophy className={cn('w-12 h-12 mx-auto mb-3', tone === 'success' ? 'text-green-500' : tone === 'warning' ? 'text-yellow-500' : 'text-red-500')} />
        <h1 className="text-3xl font-black mb-1">{data.score.toFixed(2)} / 10</h1>
        <p className="text-sm text-muted-foreground">{data.mockExam.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Score bruto (sem regra de banca): {data.scoreRaw.toFixed(2)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Acertos" value={data.acertos} icon={CheckCircle2} color="text-green-500" />
        <Stat label="Erros" value={data.erros} icon={XCircle} color="text-red-500" />
        <Stat label="Brancos" value={data.brancos} color="text-muted-foreground" />
        <Stat label="Tempo" value={`${Math.round(data.timeMs / 60000)}min`} />
      </div>

      {/* Por matéria */}
      {Object.keys(bySubject).length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Desempenho por matéria
          </h2>
          <div className="space-y-2.5">
            {Object.entries(bySubject)
              .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
              .map(([mat, s]) => {
                const p = (s.correct / s.total) * 100
                return (
                  <div key={mat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{mat}</span>
                      <span className="font-mono text-muted-foreground">{s.correct}/{s.total} · {p.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full', p >= 70 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Redação (se tiver) */}
      {data.redacaoText && (
        <RedacaoSection resultId={data.id} text={data.redacaoText} min={data.redacaoMin} />
      )}

      {/* Gabarito por questão */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground text-sm">Gabarito comentado</h2>
          <label className="text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showOnlyWrong} onChange={(e) => setShowOnlyWrong(e.target.checked)} />
            só erros
          </label>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((r, i) => (
            <div key={r.questionId} className="p-4">
              <div className="flex items-start gap-3 mb-2">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  r.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600',
                )}>
                  {r.correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    Questão {data.review.findIndex((rr) => rr.questionId === r.questionId) + 1} · {r.materia}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.enunciado}</p>
                </div>
              </div>
              <div className="ml-9 text-xs space-y-1.5 mt-3">
                <div>
                  Sua resposta: <span className={cn('font-semibold font-mono', r.correct ? 'text-green-600' : 'text-red-600')}>{r.selected ?? '— branco —'}</span>
                </div>
                {!r.correct && (
                  <div>Gabarito: <span className="font-semibold font-mono text-green-600">{r.gabarito}</span></div>
                )}
                {r.explicacao && (
                  <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded text-xs leading-relaxed">
                    <strong>Por quê:</strong> {r.explicacao}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RedacaoSection({ resultId, text, min }: { resultId: string; text: string; min: number | null }) {
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function corrigir() {
    setLoading(true)
    try {
      const { data } = await api.post('/redacao/corrigir', { text, resultId })
      setFeedback(data.feedback)
      toast.success('Redação corrigida!')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-500" /> Sua redação ({min ?? '—'}min)
      </h2>
      <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed max-h-64 overflow-y-auto">
        {text}
      </div>

      {!feedback ? (
        <button
          onClick={corrigir}
          disabled={loading}
          className="w-full rounded-xl bg-purple-500 text-white py-2.5 text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Corrigindo com IA…</> : <><Sparkles className="w-4 h-4" /> Corrigir com IA</>}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="text-center bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-3xl font-black text-purple-600">{feedback.scoreGlobal.toFixed(1)}/10</div>
            <div className="text-xs text-muted-foreground mt-1">Nota global</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(['estrutura', 'coesao', 'gramatica', 'argumentacao'] as const).map((k) => (
              <div key={k} className="p-3 rounded-lg bg-muted/30">
                <div className="font-bold capitalize">{k}: {feedback[k].nota}/10</div>
                <p className="text-muted-foreground mt-1">{feedback[k].comentario}</p>
              </div>
            ))}
          </div>
          {feedback.pontosFortes?.length > 0 && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="font-bold text-xs text-green-700 dark:text-green-300 mb-1">✓ Pontos fortes</div>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {feedback.pontosFortes.map((p: string, i: number) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {feedback.pontosMelhorar?.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="font-bold text-xs text-yellow-700 dark:text-yellow-300 mb-1">! Pontos a melhorar</div>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {feedback.pontosMelhorar.map((p: string, i: number) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {feedback.sugestaoReescrita && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs">
              <div className="font-bold mb-1">💡 Sugestão de reescrita:</div>
              <p className="italic">{feedback.sugestaoReescrita}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon?: any; color?: string }) {
  return (
    <div className="card p-3 text-center">
      {Icon && <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />}
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}
