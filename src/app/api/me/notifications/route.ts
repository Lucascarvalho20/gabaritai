import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/notifications — últimas 50 notificações
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, title: true, body: true,
      link: true, category: true, icon: true,
      read: true, createdAt: true,
    },
  })
  const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false } })

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/me/notifications — marca tudo como lido
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
