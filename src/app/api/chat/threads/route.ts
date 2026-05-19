import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/chat/threads — lista threads do aluno (com último msg)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const threads = await prisma.chatThread.findMany({
    where: { userId: user.id },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  })
  return NextResponse.json({ threads })
}

// POST /api/chat/threads — cria nova thread com 1ª mensagem
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { subject, body } = await req.json()
  if (!body || body.length < 5) return NextResponse.json({ message: 'Mensagem muito curta' }, { status: 400 })

  const thread = await prisma.chatThread.create({
    data: {
      userId: user.id,
      subject: subject ?? null,
      lastMessageAt: new Date(),
      unreadByAdmin: 1,
      messages: {
        create: {
          authorId: user.id,
          authorRole: 'STUDENT',
          body,
        },
      },
    },
    include: { messages: true },
  })

  // Notifica admin via Telegram (fire-and-forget)
  import('@/lib/telegram').then(({ notifyAdmin }) => {
    notifyAdmin(
      `💬 *Nova mensagem do aluno*\nDe: ${user.name}\nAssunto: ${subject ?? '(sem assunto)'}\nMensagem: ${body.slice(0, 200)}`,
      { buttons: [{ text: 'Responder', url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/chat/${thread.id}` }] },
    ).catch(() => {})
  }).catch(() => {})

  return NextResponse.json({ thread })
}
