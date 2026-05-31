import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TimerMode = 'estudo' | 'livre'

interface StudyTimerState {
  running: boolean
  mode: TimerMode
  // epoch ms de quando o timer começou (acumulando) — null quando parado
  startedAt: number | null
  // segundos acumulados de sessões anteriores nesta corrida (pra pausar/retomar sem perder)
  accumulatedSec: number
  // visibilidade do widget (minimizado/aberto)
  open: boolean

  start: (mode: TimerMode) => void
  pause: () => void
  resume: () => void
  stop: () => { totalSec: number; mode: TimerMode } | null
  toggleOpen: () => void
  setMode: (mode: TimerMode) => void
}

export const useStudyTimer = create<StudyTimerState>()(
  persist(
    (set, get) => ({
      running: false,
      mode: 'estudo',
      startedAt: null,
      accumulatedSec: 0,
      open: false,

      start: (mode) => set({ running: true, mode, startedAt: Date.now(), accumulatedSec: 0, open: true }),

      pause: () => {
        const s = get()
        if (!s.running || s.startedAt === null) return
        const delta = Math.floor((Date.now() - s.startedAt) / 1000)
        set({ running: false, startedAt: null, accumulatedSec: s.accumulatedSec + delta })
      },

      resume: () => {
        const s = get()
        if (s.running) return
        set({ running: true, startedAt: Date.now() })
      },

      stop: () => {
        const s = get()
        let totalSec = s.accumulatedSec
        if (s.running && s.startedAt !== null) {
          totalSec += Math.floor((Date.now() - s.startedAt) / 1000)
        }
        const result = totalSec > 0 ? { totalSec, mode: s.mode } : null
        set({ running: false, startedAt: null, accumulatedSec: 0 })
        return result
      },

      toggleOpen: () => set((s) => ({ open: !s.open })),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'gabaritai-study-timer',
      // Não persistir `open` — sempre começa fechado
      partialize: (s) => ({
        running: s.running,
        mode: s.mode,
        startedAt: s.startedAt,
        accumulatedSec: s.accumulatedSec,
      }),
    },
  ),
)

export function elapsedSeconds(s: { running: boolean; startedAt: number | null; accumulatedSec: number }): number {
  if (s.running && s.startedAt !== null) {
    return s.accumulatedSec + Math.floor((Date.now() - s.startedAt) / 1000)
  }
  return s.accumulatedSec
}

export function formatTimer(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
