'use client'

import { useState } from 'react'
import { Play, Pause, Timer, Save, RotateCcw } from 'lucide-react'
import { useStopwatch, formatHMS } from '@/lib/use-stopwatch'
import SaveTimeModal from '@/components/SaveTimeModal'
import { StudyTimeTypeKey, STUDY_TIME_TYPES } from '@/lib/study-time-meta'

type Props = {
  /** chave única do cronômetro (ex: "timer:questoes") — isola o estado por aba */
  storageKey: string
  defaultType: StudyTimeTypeKey
  labelPresets?: string[]
  title?: string
  courseId?: string | null
  topicId?: string | null
  compact?: boolean
}

/**
 * Cronômetro contextual que fica rodando DENTRO da aba (Questões, Flashcards…).
 * Pré-marca o tipo e sugere labels. Ao salvar, registra o tempo e zera.
 */
export default function InlineStudyTimer({
  storageKey, defaultType, labelPresets = [], title, courseId = null, topicId = null,
}: Props) {
  const { elapsedSec, running, start, pause, reset } = useStopwatch(storageKey)
  const [showSave, setShowSave] = useState(false)

  const meta = STUDY_TIME_TYPES[defaultType]

  return (
    <>
      <div className="card px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Timer className={`w-4 h-4 ${running ? 'text-success-500' : 'text-muted-foreground'}`} />
          <span className="text-xs font-semibold text-muted-foreground">
            {title ?? `${meta.emoji} ${meta.label}`}
          </span>
        </div>

        <span className={`font-mono font-black text-xl tabular-nums ${running ? 'text-success-600' : 'text-foreground'}`}>
          {formatHMS(elapsedSec)}
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {running ? (
            <button onClick={pause}
              className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-600">
              <Pause className="w-3.5 h-3.5" /> Pausar
            </button>
          ) : (
            <button onClick={start}
              className="rounded-lg bg-success-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-success-600">
              <Play className="w-3.5 h-3.5" /> {elapsedSec > 0 ? 'Continuar' : 'Iniciar'}
            </button>
          )}

          {elapsedSec > 0 && (
            <>
              <button onClick={() => { pause(); setShowSave(true) }}
                className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 hover:bg-brand-600">
                <Save className="w-3.5 h-3.5" /> Salvar
              </button>
              <button onClick={reset} title="Zerar"
                className="rounded-lg border border-border px-2 py-1.5 text-muted-foreground hover:bg-muted">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {showSave && (
        <SaveTimeModal
          durationSec={elapsedSec}
          source="TIMER"
          initialType={defaultType}
          initialLabel={labelPresets[0] ?? ''}
          labelPresets={labelPresets}
          courseId={courseId}
          topicId={topicId}
          onSaved={() => { setShowSave(false); reset() }}
          onClose={() => setShowSave(false)}
        />
      )}
    </>
  )
}
