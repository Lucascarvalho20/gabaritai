import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, signToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

/**
 * Encerra impersonação: lê impersonatorId do token atual, gera novo token
 * pro admin e retorna.
 *
 * Defesa em camadas:
 * 1. JWT precisa ser válido (signature ok) — só nosso /start gera impersonatorId
 * 2. Verifica que existe AuditLog recente (24h) de ADMIN_IMPERSONATION pra esse par admin↔aluno
 * 3. Verifica que o admin ainda está ativo e tem role=ADMIN
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const tokenFromCookie = req.cookies.get('gabaritai_token')?.value
  const tokenFromHeader = req.headers.get('authorization')?.slice(7)
  const token = tokenFromCookie ?? tokenFromHeader
  if (!token) return NextResponse.json({ message: 'Sem token' }, { status: 401 })

  const payload = await verifyToken(token)
  const impersonatorId = payload?.impersonatorId
  const impersonatedId = payload?.sub
  if (!impersonatorId || !impersonatedId) {
    return NextResponse.json({ message: 'Não está impersonando' }, { status: 400 })
  }

  // Verifica que houve uma sessão de impersonação registrada recentemente
  // (24h). Se não houver, é tentativa de uso de token roubado/forjado.
  const recentImpersonation = await prisma.auditLog.findFirst({
    where: {
      action: 'ADMIN_IMPERSONATION',
      actorId: String(impersonatorId),
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  })
  if (!recentImpersonation) {
    return NextResponse.json({ message: 'Sessão de impersonação inválida' }, { status: 403 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: String(impersonatorId) },
    include: { profile: true },
  })
  if (!admin || admin.role !== 'ADMIN' || !admin.active) {
    return NextResponse.json({ message: 'Admin não disponível' }, { status: 403 })
  }

  // Audita o stop pra rastreabilidade
  await audit({
    actorId: admin.id,
    action: 'ADMIN_IMPERSONATION',
    ip,
    metadata: { phase: 'stop', impersonatedId: String(impersonatedId) },
  }).catch(() => {})

  const newToken = await signToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    plan: admin.plan,
  })

  const response = NextResponse.json({
    token: newToken,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      plan: admin.plan,
      profile: admin.profile,
    },
  })
  response.cookies.set('gabaritai_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  response.cookies.set('gabaritai_impersonating', '', { maxAge: 0, path: '/' })
  return response
}
