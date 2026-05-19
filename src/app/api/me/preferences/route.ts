import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      notifyEmail: true,
      notifyTelegram: true,
      notifyWhatsapp: true,
      telegramChatId: true,
      whatsappPhone: true,
    },
  })
  return NextResponse.json(u ?? {})
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const allowed = ['notifyEmail', 'notifyTelegram', 'notifyWhatsapp', 'telegramChatId', 'whatsappPhone']
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      notifyEmail: true,
      notifyTelegram: true,
      notifyWhatsapp: true,
      telegramChatId: true,
      whatsappPhone: true,
    },
  })
  return NextResponse.json(updated)
}
