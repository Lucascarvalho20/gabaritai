import { SignJWT, jwtVerify } from 'jose'

// Em produção, JWT_SECRET é OBRIGATÓRIO. Sem ele, qualquer um poderia forjar
// tokens (inclusive de admin) usando o segredo público de fallback. Por isso
// quebramos cedo em produção se faltar.
const rawSecret = process.env.JWT_SECRET
if (!rawSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET não definido em produção — abortando por segurança.')
}

const SECRET = new TextEncoder().encode(
  rawSecret ?? 'gabaritai-demo-secret-change-in-production-2024'
)

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}
