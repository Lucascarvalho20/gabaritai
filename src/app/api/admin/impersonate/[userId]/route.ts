import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

/**
 * Gera token JWT pra admin logar COMO outro user.
 * O token carrega `impersonatorId` no payload, permitindo retornar depois.
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true, username: true, role: true, plan: true, hasFullAccess: true, profile: true },
  })
  if (!target) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  if (target.role === 'ADMIN' && target.id !== auth.user.id) {
    return NextResponse.json({ message: 'Não é permitido impersonar outro admin' }, { status: 403 })
  }

  const token = await signToken({
    sub: target.id,
    email: target.email ?? undefined,
    username: target.username ?? undefined,
    role: target.role,
    plan: target.plan,
    impersonatorId: auth.user.id,
    impersonatorEmail: auth.user.email,
  })

  await audit({
    actorId: auth.user.id,
    targetId: target.id,
    action: 'ADMIN_IMPERSONATION',
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
    metadata: { targetEmail: target.email, targetUsername: target.username },
  })

  const response = NextResponse.json({
    token,
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      username: target.username,
      role: target.role,
      plan: target.plan,
      hasFullAccess: target.hasFullAccess,
      profile: target.profile,
      impersonatedBy: { id: auth.user.id, email: auth.user.email },
    },
  })
  response.cookies.set('gabaritai_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1h só (impersonação curta)
    path: '/',
  })
  // Cookie marcador para frontend mostrar banner "você está impersonando"
  response.cookies.set('gabaritai_impersonating', auth.user.email ?? auth.user.id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })
  return response
}
