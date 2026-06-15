'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, Pause, Save, RotateCcw, Plus, Trash2, Pencil, Loader2, Clock, Flame, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { useStopwatch, formatHMS, formatDuration } from '@/lib/use-stopwatch'
import SaveTimeModal from '@/components/SaveTimeModal'
import { STUDY_TIME_TYPES, StudyTimeTypeKey } from '@/lib/study-time-meta'

type Entry = {
  id: string
  type: StudyTimeTypeKey
  label: string | null
  note: string | null
  durationSec: number
  source: 'TIMER' | 'MANUAL'
  createdAt: string
}
type Stats = { todaySec: number; weekSec: number; totalSec: number; byType: Record<string, number>; byDay: Record<string, number> }

function brDateKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}
function dayLabel(key: string) {
  const today = brDateKey(new Date())
  const yest = brDateKey(new Date(Date.now() - 86400000))
  if (key === today) return 'Hoje'
  if (key === yest) return 'Ontem'
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}

export default function TempoPage() {
  const { elapsedSec, running, start, pause, reset } = useStopwatch('timer:geral')
  const [entries, setEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSaveTimer, setShowSaveTimer] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/me/time', { cache: 'no-store' })
      const d = await r.json()
      setEntries(d.entries ?? [])
      setStats(d.stats ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function del(id: string) {
    if (!confirm('Excluir este registro de tempo?')) return
    const r = await fetch(`/api/me/time/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Registro excluído'); load() }
    else toast.error('Erro ao excluir')
  }

  // Agrupa histórico por dia
  const grouped = useMemo(() => {
    const g: Record<string, Entry[]> = {}
    for (const e of entries) {
      const k = brDateKey(new Date(e.createdAt))
      ;(g[k] ??= []).push(e)
    }
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [entries])

  // Heatmap: últimas 13 semanas (91 dias)
  const heat = useMemo(() => {
    const days: { key: string; sec: number }[] = []
    for (let i = 90; i >= 0; i--) {
      const key = brDateKey(new Date(Date.now() - i * 86400000))
      days.push({ key, sec: stats?.byDay[key] ?? 0 })
    }
    return days
  }, [stats])

  function heatColor(sec: number) {
    if (sec <= 0) return 'bg-muted'
    const min = sec / 60
    if (min < 30) return 'bg-success-500/30'
    if (min < 90) return 'bg-success-500/55'
    if (min < 180) return 'bg-success-500/80'
    return 'bg-success-600'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Clock className="w-6 h-6 text-brand-500" /> Meu tempo</h1>
        <p className="text-sm text-muted-foreground">
          Cronometre seus estudos (mesmo fora do site) e veja o quanto rendeu. É só seu, não mexe no cronograma.
        </p>
      </div>

      {/* Cronômetro principal */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="text-center sm:text-left">
          <div className={`font-mono font-black text-5xl tabular-nums ${running ? 'text-success-600' : 'text-foreground'}`}>
            {formatHMS(elapsedSec)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{running ? '⏱️ rodando…' : 'cronômetro parado'}</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap justify-center">
          {running ? (
            <button onClick={pause} className="rounded-xl bg-amber-500 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-amber-600">
              <Pause className="w-4 h-4" /> Pausar
            </button>
          ) : (
            <button onClick={start} className="rounded-xl bg-success-500 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-success-600">
              <Play className="w-4 h-4" /> {elapsedSec > 0 ? 'Continuar' : 'Iniciar'}
            </button>
          )}
          {elapsedSec > 0 && (
            <>
              <button onClick={() => { pause(); setShowSaveTimer(true) }} className="rounded-xl bg-brand-500 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-brand-600">
                <Save className="w-4 h-4" /> Salvar
              </button>
              <button onClick={reset} title="Zerar" className="rounded-xl border border-border px-3 py-2.5 text-muted-foreground hover:bg-muted">
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setShowManual(true)} className="rounded-xl border-2 border-brand-500 text-brand-500 px-4 py-2.5 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/20">
            <Plus className="w-4 h-4" /> Lançar manual
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-xl font-black">{formatDuration(stats?.todaySec ?? 0)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          <p className="text-xl font-black">{formatDuration(stats?.weekSec ?? 0)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-black">{formatDuration(stats?.totalSec ?? 0)}</p>
        </div>
      </div>

      {/* Heatmap de constância */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          <h2 className="font-bold text-sm">Constância (últimas 13 semanas)</h2>
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
          {heat.map((d) => (
            <div key={d.key} title={`${dayLabel(d.key)} — ${formatDuration(d.sec)}`}
              className={`w-3 h-3 rounded-sm ${heatColor(d.sec)}`} />
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="font-bold flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Histórico</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : entries.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            Nenhum tempo registrado ainda. Use o cronômetro acima ou lance manualmente. 💪
          </div>
        ) : (
          grouped.map(([day, list]) => {
            const dayTotal = list.reduce((s, e) => s + e.durationSec, 0)
            return (
              <div key={day} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                  <span>{dayLabel(day)}</span>
                  <span>{formatDuration(dayTotal)}</span>
                </div>
                {list.map((e) => {
                  const meta = STUDY_TIME_TYPES[e.type]
                  return (
                    <div key={e.id} className="card p-3 flex items-start gap-3">
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${meta.color}`}>{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{e.label || meta.label}</span>
                          <span className="text-xs font-mono font-bold text-brand-600">{formatDuration(e.durationSec)}</span>
                          {e.source === 'MANUAL' && <span className="text-[10px] text-muted-foreground border border-border rounded px-1">manual</span>}
                        </div>
                        {e.note && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{e.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditing(e)} title="Editar" className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(e.id)} title="Excluir" className="p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* Modais */}
      {showSaveTimer && (
        <SaveTimeModal
          durationSec={elapsedSec} source="TIMER"
          onSaved={() => { setShowSaveTimer(false); reset(); load() }}
          onClose={() => setShowSaveTimer(false)}
        />
      )}
      {showManual && (
        <SaveTimeModal
          durationSec={0} source="MANUAL" editableDuration
          onSaved={() => { setShowManual(false); load() }}
          onClose={() => setShowManual(false)}
        />
      )}
      {editing && (
        <EditEntryModal entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

// Modal de edição (tipo / título / nota) — usa PATCH
function EditEntryModal({ entry, onClose, onSaved }: { entry: Entry; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<StudyTimeTypeKey>(entry.type)
  const [label, setLabel] = useState(entry.label ?? '')
  const [note, setNote] = useState(entry.note ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`/api/me/time/${entry.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label: label || null, note: note || null }),
      })
      if (!r.ok) throw new Error()
      toast.success('Atualizado')
      onSaved()
    } catch { toast.error('Erro ao atualizar') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6 space-y-4">
        <h2 className="font-bold text-lg">Editar registro</h2>
        <div>
          <label className="text-xs font-semibold">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as StudyTimeTypeKey)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {Object.entries(STUDY_TIME_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold">Título</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold">Descrição</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-bold hover:bg-muted">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
