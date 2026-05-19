import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, signToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

/**
 * Encerra impersonação: lê impersonatorId do token atual, gera novo token
 * pro admin e retorna.
 */
export async function POST(req: NextRequest) {
  const tokenFromCookie = req.cookies.get('gabaritai_token')?.value
  const tokenFromHeader = req.headers.get('authorization')?.slice(7)
  const token = tokenFromCookie ?? tokenFromHeader
  if (!token) return NextResponse.json({ message: 'Sem token' }, { status: 401 })

  const payload = await verifyToken(token)
  const impersonatorId = payload?.impersonatorId
  if (!impersonatorId) {
    return NextResponse.json({ message: 'Não está impersonando' }, { status: 400 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: String(impersonatorId) },
    include: { profile: true },
  })
  if (!admin || admin.role !== 'ADMIN' || !admin.active) {
    return NextResponse.json({ message: 'Admin não disponível' }, { status: 403 })
  }

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
