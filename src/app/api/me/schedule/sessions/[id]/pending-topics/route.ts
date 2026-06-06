import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/schedule/sessions/[id]/pending-topics
 *
 * Retorna a lista de tópicos da matéria desta sessão que o aluno AINDA NÃO
 * marcou como estudado (TopicAttempt.completedAt IS NULL).
 *
 * Usado pela página da sessão (/dashboard/sessao/[id]) pra mostrar
 * "Tópicos pendentes desta matéria pra hoje" — assim o cronograma fica
 * ciente do que o aluno já cobriu via material.
 *
 * Ordena por ordem do edital + peso (maior peso primeiro). Inclui flag
 * `hasMaterial` pra UI distinguir tópicos com material publicado.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const session = await prisma.studyPlanSession.findUnique({
    where: { id: params.id },
    include: { studyPlan: { select: { userId: true } } },
  })
  if (!session || session.studyPlan.userId !== auth.user.id) {
    return NextResponse.json({ message: 'Sessão não encontrada' }, { status: 404 })
  }

  const subjectId = session.subjectId
  if (!subjectId) {
    return NextResponse.json({ pending: [], completed: [], totalSubject: 0 })
  }

  // 1) Pega todos os tópicos ativos da matéria
  const allTopics = await prisma.topic.findMany({
    where: { subjectId, archivedAt: null },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      order: true,
      weight: true,
      materials: {
        where: { status: 'PUBLISHED', active: true },
        select: { id: true, resumo: { select: { id: true } } },
        take: 1,
      },
    },
  })

  if (allTopics.length === 0) {
    return NextResponse.json({ pending: [], completed: [], totalSubject: 0 })
  }

  // 2) Pega quais já foram marcados como estudados
  const attempts = await prisma.topicAttempt.findMany({
    where: {
      userId: auth.user.id,
      topicId: { in: allTopics.map((t) => t.id) },
      completedAt: { not: null },
    },
    select: { topicId: true, completedAt: true },
  })
  const completedIds = new Set(attempts.map((a) => a.topicId))

  const enriched = allTopics.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    order: t.order,
    weight: t.weight,
    hasMaterial: t.materials.length > 0,
    hasResumo: t.materials.length > 0 && !!t.materials[0]?.resumo,
    completed: completedIds.has(t.id),
  }))

  const pending = enriched
    .filter((t) => !t.completed)
    .sort((a, b) => {
      // Prioriza tópicos COM material primeiro, depois ordem do edital
      if (a.hasMaterial !== b.hasMaterial) return a.hasMaterial ? -1 : 1
      return a.order - b.order
    })

  const completed = enriched.filter((t) => t.completed)

  return NextResponse.json({
    pending,
    completed,
    totalSubject: allTopics.length,
    completedCount: completed.length,
    pendingCount: pending.length,
    coverage: Math.round((completed.length / allTopics.length) * 100),
  })
}
