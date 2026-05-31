'use client'

import { useEffect, useState } from 'react'
import { Play, Pause, Square, Timer, BookOpen, X, ChevronUp } from 'lucide-react'
import { useStudyTimer, elapsedSeconds, formatTimer, TimerMode } from '@/store/study-timer'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Cronômetro flutuante de estudo. Persistente entre páginas via Zustand+localStorage.
 *
 * Dois modos:
 *  - "estudo": ao parar, grava StudySession no histórico
 *  - "livre": só cronometra, não registra (útil pra leitura externa, prova de outro site)
 */
export function StudyTimerWidget() {
  const s = useStudyTimer()
  const [now, setNow] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => setMounted(true), [])

  // Tick — re-render a cada segundo só quando rodando ou widget aberto
  useEffect(() => {
    if (!s.running && !s.open) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [s.running, s.open])

  const elapsed = elapsedSeconds(s)
  const display = formatTimer(elapsed)

  if (!mounted) return null

  async function handleStop() {
    const result = s.stop()
    if (!result) {
      toast('Cronômetro zerado')
      return
    }
    const minutes = Math.round(result.totalSec / 60)
    if (result.mode === 'livre') {
      toast(`Cronômetro livre: ${formatTimer(result.totalSec)} (não registrado no histórico)`, { icon: '⏱️', duration: 4000 })
      return
    }
    // Modo estudo → salva no histórico
    if (minutes < 1) {
      toast('Menos de 1 minuto — não vou registrar')
      return
    }
    setSaving(true)
    try {
      await api.post('/me/study-time', {
        durationMin: minutes,
        type: 'ESTUDO',
        source: 'TIMER_FLUTUANTE',
      })
      toast.success(`+${minutes} min de estudo registrados`)
    } catch (err: any) {
      toast.error('Não consegui salvar a sessão')
    } finally {
      setSaving(false)
    }
  }

  // Pílula mínima (fechada) → click pra abrir
  if (!s.open) {
    return (
      <button
        onClick={s.toggleOpen}
        className={cn(
          'fixed bottom-4 right-4 z-40 rounded-full shadow-lg backdrop-blur-md',
          'flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold',
          s.running
            ? 'bg-brand-500 text-white animate-pulse'
            : 'bg-card border border-border text-foreground hover:bg-muted',
        )}
        title="Cronômetro de estudo"
      >
        <Timer className="w-3.5 h-3.5" />
        {s.running ? <span className="tabular-nums">{display}</span> : 'Cronômetro'}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Timer className="w-3.5 h-3.5 text-brand-500" />
          Cronômetro
        </div>
        <button onClick={s.toggleOpen} className="p-1 rounded-md hover:bg-muted" title="Minimizar">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Toggle de modo (só quando NÃO rodando) */}
      {!s.running && s.accumulatedSec === 0 && (
        <div className="px-4 pt-3 flex gap-1.5">
          <ModeButton mode="estudo" current={s.mode} onClick={() => s.setMode('estudo')} />
          <ModeButton mode="livre" current={s.mode} onClick={() => s.setMode('livre')} />
        </div>
      )}

      <div className="px-4 py-4 text-center space-y-2">
        <div className="text-3xl font-black tabular-nums">{display}</div>
        <div className="text-[11px] text-muted-foreground">
          {s.mode === 'estudo' ? (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Modo estudo · conta no histórico
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Timer className="w-3 h-3" /> Modo livre · não registra
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        {!s.running && s.accumulatedSec === 0 ? (
          <button
            onClick={() => s.start(s.mode)}
            className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Play className="w-3 h-3" /> Iniciar
          </button>
        ) : s.running ? (
          <>
            <button
              onClick={s.pause}
              className="flex-1 rounded-lg bg-card border border-border hover:bg-muted py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Pause className="w-3 h-3" /> Pausar
            </button>
            <button
              onClick={handleStop}
              disabled={saving}
              className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 text-white py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Square className="w-3 h-3" /> Parar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={s.resume}
              className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" /> Retomar
            </button>
            <button
              onClick={handleStop}
              disabled={saving}
              className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 text-white py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Square className="w-3 h-3" /> Parar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ModeButton({ mode, current, onClick }: { mode: TimerMode; current: TimerMode; onClick: () => void }) {
  const active = mode === current
  const label = mode === 'estudo' ? 'Estudo' : 'Livre'
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
        active ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
