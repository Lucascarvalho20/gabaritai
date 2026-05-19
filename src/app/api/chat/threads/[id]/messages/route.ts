import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/chat/threads/[id]/messages — lista mensagens da thread (aluno ou admin)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const thread = await prisma.chatThread.findUnique({ where: { id: params.id } })
  if (!thread) return NextResponse.json({ message: 'Thread não encontrada' }, { status: 404 })
  if (thread.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: params.id },
    orderBy: { createdAt: 'asc' },
  })

  // Marca como lidas (apenas mensagens do outro lado)
  const otherRole = user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN'
  await prisma.chatMessage.updateMany({
    where: { threadId: params.id, authorRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  })
  // Zera unread counter do lado que leu
  await prisma.chatThread.update({
    where: { id: params.id },
    data: user.role === 'ADMIN' ? { unreadByAdmin: 0 } : { unreadByUser: 0 },
  })

  return NextResponse.json({ thread, messages })
}

// POST /api/chat/threads/[id]/messages — envia mensagem
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { body } = await req.json()
  if (!body || body.length < 1) return NextResponse.json({ message: 'Mensagem vazia' }, { status: 400 })

  const thread = await prisma.chatThread.findUnique({ where: { id: params.id } })
  if (!thread) return NextResponse.json({ message: 'Thread não encontrada' }, { status: 404 })
  if (thread.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId: params.id,
      authorId: user.id,
      authorRole: user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT',
      body,
    },
  })

  // Atualiza thread (incrementa unread do outro lado)
  await prisma.chatThread.update({
    where: { id: params.id },
    data: {
      lastMessageAt: new Date(),
      ...(user.role === 'ADMIN'
        ? { unreadByUser: { increment: 1 } }
        : { unreadByAdmin: { increment: 1 } }),
    },
  })

  // Notificação
  if (user.role === 'ADMIN') {
    // Aluno recebe notificação in-app
    await prisma.notification.create({
      data: {
        userId: thread.userId,
        title: 'Nova mensagem do admin',
        body: body.slice(0, 200),
      },
    })
  } else {
    // Admin via Telegram
    import('@/lib/telegram').then(({ notifyAdmin }) => {
      notifyAdmin(
        `💬 *Nova mensagem*\nDe: ${user.name}\n${body.slice(0, 200)}`,
        { buttons: [{ text: 'Responder', url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/chat/${params.id}` }] },
      ).catch(() => {})
    }).catch(() => {})
  }

  return NextResponse.json({ message })
}
