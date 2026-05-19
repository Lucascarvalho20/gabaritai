/**
 * Rate limiter / lockout in-memory.
 *
 * Limita tentativas falhas de login por IP + identifier (email/username).
 * Em produção, mover pra Redis (ioredis já está no package.json) pra
 * funcionar com múltiplas instâncias.
 */

type Bucket = { count: number; firstAttempt: number; lockedUntil?: number }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000 // 15min
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30 * 60 * 1000 // 30min após 5 falhas

export function rateLimitKey(identifier: string, ip: string) {
  return `${identifier.toLowerCase()}:${ip}`
}

export function checkRateLimit(identifier: string, ip: string): { ok: boolean; lockedUntil?: number; remaining?: number } {
  const key = rateLimitKey(identifier, ip)
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket) return { ok: true, remaining: MAX_ATTEMPTS }

  // Janela expirou — limpa
  if (now - bucket.firstAttempt > WINDOW_MS && !bucket.lockedUntil) {
    buckets.delete(key)
    return { ok: true, remaining: MAX_ATTEMPTS }
  }

  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return { ok: false, lockedUntil: bucket.lockedUntil }
  }

  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    buckets.delete(key)
    return { ok: true, remaining: MAX_ATTEMPTS }
  }

  return { ok: true, remaining: Math.max(0, MAX_ATTEMPTS - bucket.count) }
}

export function recordFailedAttempt(identifier: string, ip: string): { lockedUntil?: number; remaining: number } {
  const key = rateLimitKey(identifier, ip)
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now - existing.firstAttempt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAttempt: now })
    return { remaining: MAX_ATTEMPTS - 1 }
  }

  existing.count++
  if (existing.count >= MAX_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_MS
    return { remaining: 0, lockedUntil: existing.lockedUntil }
  }
  return { remaining: MAX_ATTEMPTS - existing.count }
}

export function recordSuccess(identifier: string, ip: string) {
  buckets.delete(rateLimitKey(identifier, ip))
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

// ─── Rate limiter genérico por bucket nomeado ─────────────────────────────────
// Use pra endpoints sensíveis (checkout, register, password reset) com janelas
// e limites customizados por uso.

type GenericBucket = { count: number; firstAt: number }
const genericBuckets = new Map<string, GenericBucket>()

export type RateLimitOptions = {
  key: string           // identificador (ex: "checkout:userId" ou "checkout:ip")
  windowMs: number      // janela em ms (ex: 60_000 = 1min)
  max: number           // máx requisições nessa janela
}

export function rateLimit(opts: RateLimitOptions): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const bucket = genericBuckets.get(opts.key)

  if (!bucket || now - bucket.firstAt > opts.windowMs) {
    genericBuckets.set(opts.key, { count: 1, firstAt: now })
    return { allowed: true, remaining: opts.max - 1, resetAt: now + opts.windowMs }
  }

  if (bucket.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: bucket.firstAt + opts.windowMs }
  }

  bucket.count++
  return { allowed: true, remaining: opts.max - bucket.count, resetAt: bucket.firstAt + opts.windowMs }
}
