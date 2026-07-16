import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getUserContentMode } from '@/lib/trial-content'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/materials/topic/[topicId]
 *
 * Retorna o material (conteudo + resumo) PUBLISHED do tópico, junto com:
 *  - status de leitura do aluno (completedAt do TopicAttempt)
 *  - próximo tópico sugerido (mesma matéria, ordem++)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { topicId: string } }
) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const topic = await prisma.topic.findUnique({
    where: { id: params.topicId },
    include: {
      subject: { select: { id: true, name: true, slug: true } },
    },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  // Admin pode ver DRAFT/REVIEWED (pra revisar antes de publicar).
  // Aluno comum só vê PUBLISHED.
  const isAdmin = auth.user.role === 'ADMIN'
  const material = await prisma.material.findFirst({
    where: {
      topicId: topic.id,
      active: true,
      ...(isAdmin
        ? { status: { in: ['DRAFT', 'REVIEWED', 'PUBLISHED'] } }
        : { status: 'PUBLISHED' }),
    },
    include: { resumo: true },
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
  })

  const attempt = await prisma.topicAttempt.findUnique({
    where: { userId_topicId: { userId: auth.user.id, topicId: topic.id } },
    select: { completedAt: true, masteryScore: true, totalAttempts: true },
  })

  const proximoTopico = await prisma.topic.findFirst({
    where: {
      subjectId: topic.subjectId,
      archivedAt: null,
      OR: [
        { order: { gt: topic.order } },
        { AND: [{ order: topic.order }, { id: { gt: topic.id } }] },
      ],
    },
    select: { id: true, name: true, order: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  })

  // Gate do modo gratuito: FREE_PLANNER/NO_ACCESS enxergam a ESTRUTURA
  // (nome do tópico + próximo) pra planejar, mas o CONTEÚDO fica bloqueado.
  // A UI usa `locked` pra mostrar o cadeado "assine pra desbloquear".
  const mode = await getUserContentMode(auth.user.id)
  const contentLocked = mode === 'FREE_PLANNER' || mode === 'NO_ACCESS'

  return NextResponse.json({
    topic: {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      order: topic.order,
      weight: topic.weight,
      subject: topic.subject,
    },
    locked: contentLocked,
    material: (!contentLocked && material)
      ? {
          id: material.id,
          title: material.title,
          content: material.content,
          updatedAt: material.updatedAt,
          sourcesUsed: material.sourcesUsed,
          legislacao: (material as any).legislacao ?? [],
        }
      : null,
    resumo: (!contentLocked && material?.resumo)
      ? {
          id: material.resumo.id,
          resumo: material.resumo.resumo,
          pontosChave: material.resumo.pontosChave,
        }
      : null,
    progresso: {
      completedAt: attempt?.completedAt ?? null,
      masteryScore: attempt?.masteryScore ?? 0,
      totalAttempts: attempt?.totalAttempts ?? 0,
    },
    proximoTopico,
  })
}
