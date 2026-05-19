/**
 * Quota diária de IA por usuário (anti-abuso).
 *
 * Limites padrão (configuráveis via env por kind):
 *   - simulado_ia:   5 / dia
 *   - mini_simulado: 2 / semana (ISO)
 *   - simulado_real: 1 / semana (só domingo)
 *   - flashcard_ia:  30 / dia
 *   - redacao_ia:    3 / dia
 *   - resumo_ia:     20 / dia
 *   - mentor_chat:   50 mensagens / dia
 *   - mapa_mental:   5 / dia
 *
 * Aluno hasFullAccess + admin: limites 10x maiores (testes).
 */

import { prisma } from './prisma'

export type QuotaKind =
  | 'simulado_ia'
  | 'mini_simulado'
  | 'simulado_real'
  | 'flashcard_ia'
  | 'redacao_ia'
  | 'resumo_ia'
  | 'mentor_chat'
  | 'mapa_mental'

const DEFAULT_LIMITS: Record<QuotaKind, { value: number; period: 'day' | 'week' }> = {
  simulado_ia:   { value: 5,  period: 'day' },
  mini_simulado: { value: 2,  period: 'week' },
  simulado_real: { value: 1,  period: 'week' },
  flashcard_ia:  { value: 30, period: 'day' },
  redacao_ia:    { value: 3,  period: 'day' },
  resumo_ia:     { value: 20, period: 'day' },
  mentor_chat:   { value: 50, period: 'day' },
  mapa_mental:   { value: 5,  period: 'day' },
}

function getLimit(kind: QuotaKind, hasFullAccess: boolean): { value: number; period: 'day' | 'week' } {
  const envKey = `QUOTA_${kind.toUpperCase()}`
  const envVal = process.env[envKey]
  const base = envVal ? { ...DEFAULT_LIMITS[kind], value: parseInt(envVal, 10) } : DEFAULT_LIMITS[kind]
  return hasFullAccess ? { ...base, value: base.value * 10 } : base
}

function getPeriodStart(period: 'day' | 'week'): Date {
  const now = new Date()
  if (period === 'day') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // week: segunda-feira da semana ISO
  const d = new Date(now)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function checkQuota(opts: {
  userId: string
  kind: QuotaKind
  hasFullAccess?: boolean
}): Promise<{ allowed: boolean; used: number; limit: number; period: 'day' | 'week'; resetsAt: Date }> {
  const limit = getLimit(opts.kind, !!opts.hasFullAccess)
  const periodStart = getPeriodStart(limit.period)
  const periodEnd = new Date(periodStart)
  if (limit.period === 'day') periodEnd.setDate(periodEnd.getDate() + 1)
  else periodEnd.setDate(periodEnd.getDate() + 7)

  // Conta usos no período
  const usages = await prisma.dailyAIQuota.findMany({
    where: {
      userId: opts.userId,
      kind: opts.kind,
      date: { gte: periodStart, lt: periodEnd },
    },
  })
  const used = usages.reduce((s, u) => s + u.count, 0)

  return {
    allowed: used < limit.value,
    used,
    limit: limit.value,
    period: limit.period,
    resetsAt: periodEnd,
  }
}

export async function incrementQuota(opts: {
  userId: string
  kind: QuotaKind
}): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.dailyAIQuota.upsert({
    where: {
      userId_date_kind: {
        userId: opts.userId,
        date: today,
        kind: opts.kind,
      },
    },
    update: { count: { increment: 1 } },
    create: { userId: opts.userId, date: today, kind: opts.kind, count: 1 },
  })
}

/**
 * Guard: checa + incrementa atomicamente. Lança erro 429 se exceder.
 */
export async function consumeQuota(opts: {
  userId: string
  kind: QuotaKind
  hasFullAccess?: boolean
}): Promise<{ used: number; limit: number; period: 'day' | 'week' }> {
  const check = await checkQuota(opts)
  if (!check.allowed) {
    const err: any = new Error(
      `Limite ${check.period === 'day' ? 'diário' : 'semanal'} atingido (${check.used}/${check.limit}). Reseta em ${check.resetsAt.toLocaleString('pt-BR')}.`,
    )
    err.code = 'QUOTA_EXCEEDED'
    err.status = 429
    err.quota = check
    throw err
  }
  await incrementQuota({ userId: opts.userId, kind: opts.kind })
  return { used: check.used + 1, limit: check.limit, period: check.period }
}

/**
 * Lista quotas do user no dia/semana atual (pra UI mostrar "3/5 usados").
 */
export async function getUserQuotas(userId: string, hasFullAccess: boolean) {
  const kinds: QuotaKind[] = Object.keys(DEFAULT_LIMITS) as QuotaKind[]
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const check = await checkQuota({ userId, kind, hasFullAccess })
      return {
        kind,
        used: check.used,
        limit: check.limit,
        period: check.period,
        resetsAt: check.resetsAt,
        pct: check.limit > 0 ? Math.round((check.used / check.limit) * 100) : 0,
      }
    }),
  )
  return results
}

/**
 * Track de uso de feature pra métricas do admin (não bloqueia, só conta).
 */
export async function trackFeatureUsage(opts: {
  userId: string
  feature: string
}): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.featureUsage.upsert({
    where: {
      userId_feature_date: {
        userId: opts.userId,
        feature: opts.feature,
        date: today,
      },
    },
    update: { count: { increment: 1 } },
    create: { userId: opts.userId, feature: opts.feature, date: today, count: 1 },
  }).catch(() => {}) // não-bloqueante
}
