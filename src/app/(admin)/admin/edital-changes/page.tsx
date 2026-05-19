'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, FileText, Plus, Minus, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Change = {
  id: string
  newEditalId: string
  previousEditalId: string | null
  subjectId: string | null
  changeType: 'MATERIA_ADICIONADA' | 'MATERIA_REMOVIDA' | 'PROGRAMA_ALTERADO' | 'PESO_ALTERADO' | 'FORMATO_ALTERADO'
  description: string
  diffData: any
  reviewed: boolean
  createdAt: string
}

const TYPE_META: Record<Change['changeType'], { icon: any; color: string; label: string }> = {
  MATERIA_ADICIONADA: { icon: Plus, color: 'text-green-500', label: 'Matéria adicionada' },
  MATERIA_REMOVIDA: { icon: Minus, color: 'text-red-500', label: 'Matéria removida' },
  PROGRAMA_ALTERADO: { icon: FileText, color: 'text-amber-500', label: 'Programa alterado' },
  PESO_ALTERADO: { icon: ArrowRight, color: 'text-blue-500', label: 'Peso alterado' },
  FORMATO_ALTERADO: { icon: AlertTriangle, color: 'text-purple-500', label: 'Formato da prova alterado' },
}

export default function EditalChangesPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewed, setShowReviewed] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/edital-changes', { params: { reviewed: showReviewed ? 'true' : '' } })
      setChanges(data.changes)
    } catch (e: any) {
      toast.error('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [showReviewed])

  async function markReviewed(id: string) {
    try {
      await api.patch(`/admin/edital-changes/${id}`, { reviewed: true })
      toast.success('Marcado como revisado')
      setChanges((p) => p.filter((c) => c.id !== id))
    } catch { toast.error('Erro') }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Mudanças nos editais</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Diff entre cada edital novo e o anterior. Revise pra atualizar materiais e questões.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} />
          Mostrar já revisados
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : changes.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-success-500/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {showReviewed ? 'Nenhum log de mudanças ainda.' : 'Tudo revisado ✓'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((c) => {
            const meta = TYPE_META[c.changeType]
            const Icon = meta.icon
            return (
              <div key={c.id} className={cn('card p-4 flex gap-3', c.reviewed && 'opacity-60')}>
                <div className="shrink-0">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-muted', meta.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{c.description}</p>

                  {c.diffData && (
                    <div className="mt-2 text-xs">
                      {c.changeType === 'PROGRAMA_ALTERADO' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                            <p className="text-[10px] font-semibold text-red-700 dark:text-red-300 mb-1">ANTES</p>
                            <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground max-h-32 overflow-y-auto">{c.diffData.previous ?? '— (vazio)'}</pre>
                          </div>
                          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40">
                            <p className="text-[10px] font-semibold text-green-700 dark:text-green-300 mb-1">AGORA</p>
                            <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground max-h-32 overflow-y-auto">{c.diffData.current ?? '— (vazio)'}</pre>
                          </div>
                        </div>
                      )}
                      {c.changeType === 'FORMATO_ALTERADO' && (
                        <pre className="p-2 rounded bg-muted text-[11px] overflow-x-auto">{JSON.stringify(c.diffData, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
                {!c.reviewed && (
                  <button
                    onClick={() => markReviewed(c.id)}
                    className="shrink-0 self-start rounded-lg bg-success-500 text-white text-xs font-semibold px-3 py-1.5 hover:bg-success-600 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Revisado
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
