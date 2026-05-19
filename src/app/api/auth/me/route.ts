import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const token = auth.split(' ')[1]
  const payload = await verifyToken(token)
  if (!payload?.sub) {
    return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ id: String(payload.sub) }, ...(payload.email ? [{ email: String(payload.email) }] : [])] },
    include: { profile: true },
  })

  if (!user) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    avatar: user.avatar,
    concursoAlvo: user.profile?.concursoLabel,
    profile: user.profile,
  })
}
