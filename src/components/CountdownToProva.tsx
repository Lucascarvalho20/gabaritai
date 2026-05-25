'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

/**
 * Contador regressivo até a data da prova.
 * Concurseiro vive em modo "faltam X dias" — é o jeito mais barato de gerar urgência.
 * Atualiza a cada minuto (resolução suficiente, evita re-render desnecessário).
 *
 * Se a data já passou: mostra "Prova realizada".
 * Se faltam < 24h: mostra horas + minutos.
 * Se faltam >= 24h: mostra dias.
 */
export function CountdownToProva({ date, label = 'Prova' }: { date: string | Date | null; label?: string }) {
  const target = date ? (typeof date === 'string' ? new Date(date) : date) : null
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    if (!target) return
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 60_000) // 1 min
    return () => clearInterval(id)
  }, [target])

  if (!target || isNaN(target.getTime())) return null

  const diffMs = target.getTime() - now.getTime()
  const isPast = diffMs <= 0
  const totalMin = Math.floor(Math.abs(diffMs) / 60_000)
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin % (60 * 24)) / 60)
  const minutes = totalMin % 60

  const dataPretty = target.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  if (isPast) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/30 text-xs">
        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Prova já realizada em {dataPretty}</span>
      </div>
    )
  }

  const urgent = days < 30
  const veryUrgent = days < 7

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
        veryUrgent
          ? 'border-red-300 dark:border-red-700/60 bg-red-50/80 dark:bg-red-900/15'
          : urgent
            ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-900/15'
            : 'border-brand-300 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/15'
      }`}
    >
      <CalendarDays
        className={`w-4 h-4 ${
          veryUrgent ? 'text-red-600 dark:text-red-400' : urgent ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'
        }`}
      />
      <div className="flex items-baseline gap-1.5">
        {days >= 1 ? (
          <>
            <span
              className={`font-bold tabular-nums text-base ${
                veryUrgent ? 'text-red-700 dark:text-red-300' : urgent ? 'text-amber-700 dark:text-amber-300' : 'text-brand-700 dark:text-brand-300'
              }`}
            >
              {days}
            </span>
            <span className="text-xs text-muted-foreground">{days === 1 ? 'dia' : 'dias'} para a {label.toLowerCase()}</span>
          </>
        ) : (
          <>
            <span className="font-bold tabular-nums text-base text-red-700 dark:text-red-300">{hours}h{minutes.toString().padStart(2, '0')}</span>
            <span className="text-xs text-muted-foreground">para a {label.toLowerCase()}</span>
          </>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground hidden sm:block">· {dataPretty}</span>
    </div>
  )
}
