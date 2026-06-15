export type StudyTimeTypeKey =
  | 'MATERIA' | 'QUESTOES' | 'FLASHCARDS' | 'SIMULADO'
  | 'REVISAO' | 'LEITURA' | 'AULA' | 'OUTRO'

export const STUDY_TIME_TYPES: Record<StudyTimeTypeKey, { label: string; emoji: string; color: string }> = {
  MATERIA:    { label: 'Matéria / Teoria', emoji: '📖', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  QUESTOES:   { label: 'Questões',         emoji: '🎯', color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  FLASHCARDS: { label: 'Flashcards',       emoji: '⚡', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  SIMULADO:   { label: 'Simulado',         emoji: '📝', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
  REVISAO:    { label: 'Revisão',          emoji: '🔁', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
  LEITURA:    { label: 'Leitura',          emoji: '📚', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  AULA:       { label: 'Aula / Vídeo',     emoji: '🎬', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  OUTRO:      { label: 'Outro',            emoji: '⏱️', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800/40' },
}

export const STUDY_TIME_TYPE_ORDER: StudyTimeTypeKey[] =
  ['MATERIA', 'QUESTOES', 'FLASHCARDS', 'SIMULADO', 'REVISAO', 'LEITURA', 'AULA', 'OUTRO']
