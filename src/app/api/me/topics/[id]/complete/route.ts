import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/topics/[id]/complete
 *
 * Marca um tópico como "dominado" pelo aluno. Sai da fila de ESTUDO novo no
 * cronograma. Flashcards desse tópico continuam vivos na fila de REVISAO SM-2.
 *
 * Idempotente: se já está marcado, atualiza o completedAt pra agora.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  const now = new Date()

  await prisma.topicAttempt.upsert({
    where: { userId_topicId: { userId: user.id, topicId: topic.id } },
    create: {
      userId: user.id,
      topicId: topic.id,
      completedAt: now,
    },
    update: {
      completedAt: now,
    },
  })

  return NextResponse.json({ ok: true, topicId: topic.id, topicName: topic.name, completedAt: now })
}

/**
 * DELETE /api/me/topics/[id]/complete
 * Desmarca o tópico — volta pra fila de ESTUDO novo.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  await prisma.topicAttempt.updateMany({
    where: { userId: user.id, topicId: params.id },
    data: { completedAt: null },
  })

  return NextResponse.json({ ok: true })
}
