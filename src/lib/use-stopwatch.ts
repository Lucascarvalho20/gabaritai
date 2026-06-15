'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Persisted = { baseSec: number; lastStart: number | null }

/**
 * Cronômetro baseado em TIMESTAMP (não em tick acumulado), então sobrevive a
 * refresh da página, troca de aba e PC dormindo sem perder/ganhar tempo.
 *
 * O estado é persistido em localStorage por `storageKey`, então o aluno pode
 * navegar pra outra página e voltar que o cronômetro continua de onde estava.
 *
 *   elapsed = baseSec + (rodando ? (agora - lastStart) : 0)
 */
export function useStopwatch(storageKey: string) {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [running, setRunning] = useState(false)
  const stateRef = useRef<Persisted>({ baseSec: 0, lastStart: null })

  const persist = useCallback(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(stateRef.current)) } catch {}
  }, [storageKey])

  const recompute = useCallback(() => {
    const { baseSec, lastStart } = stateRef.current
    const extra = lastStart ? (Date.now() - lastStart) / 1000 : 0
    setElapsedSec(Math.floor(baseSec + extra))
  }, [])

  // Restaura do localStorage no mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw) as Persisted
        stateRef.current = { baseSec: p.baseSec ?? 0, lastStart: p.lastStart ?? null }
        setRunning(!!p.lastStart)
      }
    } catch {}
    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Tick visual (1s) enquanto roda — o valor real vem do timestamp
  useEffect(() => {
    if (!running) return
    recompute()
    const id = setInterval(recompute, 1000)
    return () => clearInterval(id)
  }, [running, recompute])

  const start = useCallback(() => {
    if (stateRef.current.lastStart) return
    stateRef.current.lastStart = Date.now()
    persist()
    setRunning(true)
    recompute()
  }, [persist, recompute])

  const pause = useCallback(() => {
    const { lastStart } = stateRef.current
    if (!lastStart) return
    stateRef.current.baseSec += (Date.now() - lastStart) / 1000
    stateRef.current.lastStart = null
    persist()
    setRunning(false)
    recompute()
  }, [persist, recompute])

  const reset = useCallback(() => {
    stateRef.current = { baseSec: 0, lastStart: null }
    try { localStorage.removeItem(storageKey) } catch {}
    setRunning(false)
    setElapsedSec(0)
  }, [storageKey])

  return { elapsedSec, running, start, pause, reset }
}

/** Formata segundos → HH:MM:SS (ou MM:SS se < 1h) */
export function formatHMS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Formata segundos → "1h 23min" (resumo legível) */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`
  if (m > 0) return `${m}min`
  return `${s}s`
}
