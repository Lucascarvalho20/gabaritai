import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ message: 'Token ausente' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
  if (!user) {
    return NextResponse.json({ message: 'Token inválido ou já usado' }, { status: 400 })
  }
  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return NextResponse.json({ message: 'Token expirado. Solicite um novo no cadastro.' }, { status: 410 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  })

  await audit({
    actorId: user.id,
    action: 'EMAIL_VERIFIED',
    ip: getClientIp(req),
    metadata: { email: user.email },
  })

  return NextResponse.json({ ok: true, message: 'E-mail verificado com sucesso!' })
}
