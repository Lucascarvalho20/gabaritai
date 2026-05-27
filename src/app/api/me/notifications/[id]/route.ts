import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// PATCH /api/me/notifications/:id — marca uma notificação específica como lida
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const result = await prisma.notification.updateMany({
    where: { id: params.id, userId: user.id },
    data: { read: true },
  })
  return NextResponse.json({ ok: true, updated: result.count })
}
