'use client'

/**
 * Armazenamento de ações do admin no localStorage.
 * Persiste entre sessões no mesmo navegador.
 * Em produção com banco de dados, isso virá do PostgreSQL.
 */

export interface UserOverride {
  id: string
  plan?: string
  active?: boolean
  note?: string
  updatedAt: string
}

const KEY = 'gabaritai_admin_overrides'

export function getOverrides(): Record<string, UserOverride> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch { return {} }
}

export function setOverride(userId: string, data: Partial<UserOverride>) {
  const all = getOverrides()
  all[userId] = { ...all[userId], ...data, id: userId, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getOverrideForUser(userId: string): UserOverride | null {
  return getOverrides()[userId] ?? null
}

export function clearOverride(userId: string) {
  const all = getOverrides()
  delete all[userId]
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getAllOverrides(): UserOverride[] {
  return Object.values(getOverrides())
}
