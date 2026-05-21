import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/editais/[id]/changes
 *
 * Retorna o histórico de mudanças deste edital (criação, arquivamentos, renames).
 * Útil pra auditoria + UI de "o que mudou desde o edital anterior".
 *
 * Inclui tópicos arquivados ainda recuperáveis (mergedIntoId=null).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(_req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    select: { id: true, courseId: true, titulo: true, ano: true, createdAt: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  const logs = await prisma.editalChangeLog.findMany({
    where: { newEditalId: edital.id },
    orderBy: { createdAt: 'desc' },
  })

  // Tópicos arquivados desse curso ainda recuperáveis
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId: edital.courseId },
    select: { subjectId: true },
  })
  const subjectIds = courseSubjects.map((c) => c.subjectId)

  const archivedTopics = await prisma.topic.findMany({
    where: {
      subjectId: { in: subjectIds },
      archivedAt: { not: null },
      mergedIntoId: null, // não conta os que foram fundidos (rename)
    },
    select: {
      id: true, name: true, archivedAt: true, archivedReason: true,
      subject: { select: { id: true, name: true } },
      _count: { select: { materials: true, questions: true, flashcards: true } },
    },
    orderBy: { archivedAt: 'desc' },
  })

  return NextResponse.json({
    edital,
    logs,
    archivedTopics: archivedTopics.map((t) => ({
      id: t.id, name: t.name, subjectName: t.subject.name,
      archivedAt: t.archivedAt, reason: t.archivedReason,
      materials: t._count.materials, questions: t._count.questions, flashcards: t._count.flashcards,
    })),
  })
}

/**
 * POST /api/admin/editais/[id]/changes/restore
 * Restaura um tópico arquivado (desarquivamento manual).
 *
 * Body: { topicId: string }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const topicId = body.topicId
  if (!topicId) return NextResponse.json({ message: 'topicId obrigatório' }, { status: 400 })

  const topic = await prisma.topic.update({
    where: { id: topicId },
    data: { archivedAt: null, archivedReason: null },
    select: { id: true, name: true },
  })

  // Restaura Materials arquivados deste tópico (não os REJECTED)
  await prisma.material.updateMany({
    where: { topicId, status: 'ARCHIVED' },
    data: { status: 'REVIEWED' }, // volta pra REVIEWED, admin re-publica se quiser
  })
  await prisma.flashcard.updateMany({
    where: { topicId, active: false },
    data: { active: true },
  })
  await prisma.question.updateMany({
    where: { topicId, active: false, source: 'AI_GENERATED' },
    data: { active: true },
  })

  await prisma.editalChangeLog.create({
    data: {
      newEditalId: params.id,
      changeType: 'RESTORED',
      description: `Tópico restaurado: '${topic.name}'`,
      diffData: { topicId } as any,
    },
  }).catch(() => null)

  return NextResponse.json({ ok: true, topic })
}
