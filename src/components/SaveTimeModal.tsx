'use client'

import { useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { STUDY_TIME_TYPES, STUDY_TIME_TYPE_ORDER, StudyTimeTypeKey } from '@/lib/study-time-meta'
import { formatDuration } from '@/lib/use-stopwatch'

type Props = {
  durationSec: number
  source: 'TIMER' | 'MANUAL'
  initialType?: StudyTimeTypeKey
  initialLabel?: string
  labelPresets?: string[]        // sugestões de label (ex: "Questões em geral")
  editableDuration?: boolean     // manual = pode ajustar duração (h/min)
  courseId?: string | null
  topicId?: string | null
  onSaved: (entry: any) => void
  onClose: () => void
}

export default function SaveTimeModal({
  durationSec, source, initialType = 'OUTRO', initialLabel = '', labelPresets = [],
  editableDuration = false, courseId = null, topicId = null, onSaved, onClose,
}: Props) {
  const [type, setType] = useState<StudyTimeTypeKey>(initialType)
  const [label, setLabel] = useState(initialLabel)
  const [note, setNote] = useState('')
  const [hours, setHours] = useState(Math.floor(durationSec / 3600))
  const [minutes, setMinutes] = useState(Math.round((durationSec % 3600) / 60))
  const [saving, setSaving] = useState(false)

  const finalDuration = editableDuration ? hours * 3600 + minutes * 60 : durationSec

  async function save() {
    if (finalDuration <= 0) return toast.error('Informe uma duração maior que zero.')
    setSaving(true)
    try {
      const res = await fetch('/api/me/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, label: label || null, note: note || null,
          durationSec: finalDuration, source, courseId, topicId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar')
      toast.success('Tempo salvo! 💪')
      onSaved(data.entry)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6 space-y-4 relative max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="font-bold text-lg">Salvar tempo de estudo</h2>
          {!editableDuration && (
            <p className="text-sm text-muted-foreground">
              Duração: <strong className="text-foreground">{formatDuration(finalDuration)}</strong>
            </p>
          )}
        </div>

        {/* Duração editável (lançamento manual) */}
        {editableDuration && (
          <div>
            <label className="text-xs font-semibold">Duração</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min={0} max={23} value={hours}
                onChange={(e) => setHours(Math.max(0, Math.min(23, +e.target.value)))}
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <span className="text-sm text-muted-foreground">h</span>
              <input type="number" min={0} max={59} value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, +e.target.value)))}
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        )}

        {/* Tipo */}
        <div>
          <label className="text-xs font-semibold">O que você estudou?</label>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {STUDY_TIME_TYPE_ORDER.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold transition text-left inline-flex items-center gap-1.5 ${
                  type === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-border hover:bg-muted'
                }`}>
                <span>{STUDY_TIME_TYPES[t].emoji}</span> {STUDY_TIME_TYPES[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Label + presets */}
        <div>
          <label className="text-xs font-semibold">Título curto (opcional)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Direito Penal, CESPE, Lei Seca…"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          {labelPresets.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {labelPresets.map((p) => (
                <button key={p} type="button" onClick={() => setLabel(p)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-muted">
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nota */}
        <div>
          <label className="text-xs font-semibold">Descrição (opcional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="O que você fez? Ex: resolvi 30 questões de crimes contra a vida, errei muito em dolo eventual…"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-bold hover:bg-muted">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
