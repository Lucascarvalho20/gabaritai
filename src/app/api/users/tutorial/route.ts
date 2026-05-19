import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tutorialCompleted: true, tutorialStep: true },
  })
  return NextResponse.json(full ?? { tutorialCompleted: true, tutorialStep: 0 })
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.tutorialStep === 'number') data.tutorialStep = body.tutorialStep
  if (typeof body.tutorialCompleted === 'boolean') data.tutorialCompleted = body.tutorialCompleted
  await prisma.user.update({ where: { id: user.id }, data })
  return NextResponse.json({ ok: true })
}
