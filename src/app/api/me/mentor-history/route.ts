import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/mentor-history
 *
 * Retorna a conversa mais recente do aluno com o Mentor IA + últimas N mensagens.
 * Se aluno nunca conversou, retorna { conversation: null, messages: [] }.
 *
 * Query params:
 *   - limit (default 30): quantas mensagens carregar (mais recentes primeiro,
 *     mas retornamos em ordem cronológica).
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100)

  // Conversa mais recente (1 por user — usamos atualizada por último)
  const conversation = await prisma.aiConversation.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, createdAt: true, updatedAt: true },
  })
  if (!conversation) {
    return NextResponse.json({ conversation: null, messages: [] })
  }

  const messages = await prisma.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  })

  return NextResponse.json({
    conversation,
    messages: messages.reverse(), // cronológico (antiga → recente)
  })
}

/**
 * DELETE /api/me/mentor-history
 *
 * Limpa a conversa atual do aluno (apaga AiConversation + cascade dos messages).
 */
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const result = await prisma.aiConversation.deleteMany({
    where: { userId: user.id },
  })
  return NextResponse.json({ ok: true, deleted: result.count })
}
