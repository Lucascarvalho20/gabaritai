/**
 * Feature flag system simples — substituto leve do GrowthBook pra MVP.
 *
 * Estratégia:
 *  1. Flags default em `DEFAULT_FLAGS` (hardcoded — fonte da verdade)
 *  2. Override via env: `FF_<NAME>=true|false|0..100`  (percentage rollout)
 *  3. Override em DB futuro: criar tabela `FeatureFlag { key, enabled, rolloutPct }`
 *
 * Uso:
 *   if (isEnabled('NEW_CHECKOUT_FLOW', userId)) { ... }
 *
 * Pra A/B test: passa userId — hash determinístico mantém aluno no mesmo bucket.
 */
import crypto from 'crypto'

export type FeatureFlag =
  | 'NEW_CHECKOUT_FLOW'        // novo fluxo de checkout
  | 'GAMIFIED_DASHBOARD'        // header com nível/XP/streak
  | 'MAPAS_MENTAIS_BETA'        // mapas mentais
  | 'AUTO_FLASHCARDS_BETA'      // sugestão automática de flashcard pós-erro
  | 'RANKING_PUBLICO'           // leaderboard semanal por curso
  | 'REDACAO_IA_BETA'           // correção de redação IA
  | 'TELEGRAM_ALUNO_BOT'        // bot do aluno (não só admin)

const DEFAULT_FLAGS: Record<FeatureFlag, { enabled: boolean; rolloutPct?: number }> = {
  NEW_CHECKOUT_FLOW:   { enabled: true,  rolloutPct: 100 },
  GAMIFIED_DASHBOARD:  { enabled: true,  rolloutPct: 100 },
  MAPAS_MENTAIS_BETA:  { enabled: true,  rolloutPct: 100 },
  AUTO_FLASHCARDS_BETA: { enabled: true, rolloutPct: 100 },
  RANKING_PUBLICO:     { enabled: false, rolloutPct: 0 },
  REDACAO_IA_BETA:     { enabled: true,  rolloutPct: 100 },
  TELEGRAM_ALUNO_BOT:  { enabled: false, rolloutPct: 0 },
}

function getEnvOverride(flag: FeatureFlag): { enabled: boolean; rolloutPct: number } | null {
  const raw = process.env[`FF_${flag}`]
  if (!raw) return null
  const v = raw.toLowerCase().trim()
  if (v === 'true' || v === '1') return { enabled: true, rolloutPct: 100 }
  if (v === 'false' || v === '0') return { enabled: false, rolloutPct: 0 }
  const n = parseInt(v, 10)
  if (!isNaN(n) && n >= 0 && n <= 100) return { enabled: n > 0, rolloutPct: n }
  return null
}

// Hash determinístico de userId → 0-99 (bucket)
function userBucket(userId: string, flag: string): number {
  const hash = crypto.createHash('sha256').update(`${flag}:${userId}`).digest()
  return hash.readUInt32BE(0) % 100
}

export function isEnabled(flag: FeatureFlag, userId?: string): boolean {
  const override = getEnvOverride(flag)
  const config = override ?? DEFAULT_FLAGS[flag]
  if (!config.enabled) return false
  const pct = config.rolloutPct ?? 100
  if (pct >= 100) return true
  if (pct <= 0) return false
  if (!userId) return Math.random() * 100 < pct  // sem user, randômico
  return userBucket(userId, flag) < pct          // com user, determinístico
}

// Pra UI: retorna lista de flags ativas pro aluno atual
export function getActiveFlags(userId?: string): Record<FeatureFlag, boolean> {
  const result = {} as Record<FeatureFlag, boolean>
  for (const flag of Object.keys(DEFAULT_FLAGS) as FeatureFlag[]) {
    result[flag] = isEnabled(flag, userId)
  }
  return result
}
