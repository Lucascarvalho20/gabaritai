import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/chat — lista todas threads abertas pro admin
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'unread' // 'unread' | 'all' | 'closed'

  const where: any = {}
  if (filter === 'unread') where.unreadByAdmin = { gt: 0 }
  else if (filter === 'closed') where.isClosed = true
  else if (filter === 'all') where.isClosed = false

  const threads = await prisma.chatThread.findMany({
    where,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  })

  // Anexa info do user
  const userIds = threads.map((t) => t.userId)
  const users = userIds.length ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, avatar: true },
  }) : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  return NextResponse.json({
    threads: threads.map((t) => ({
      ...t,
      user: userMap.get(t.userId) ?? null,
    })),
    totalUnread: threads.filter((t) => t.unreadByAdmin > 0).length,
  })
}
