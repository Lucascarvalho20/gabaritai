import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getTopicResumo, saveTopicResumoFromAdmin, deleteTopicResumo } from '@/lib/topic-resumo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/topics/[topicId]/resumo
 * Retorna o resumo atual do tópico + status (NotebookLM colado ou IA gerada).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: {
      subject: { select: { id: true, name: true, slug: true } },
      parent: { select: { id: true, name: true } },
    },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  const { content, source } = await getTopicResumo({
    topicId: topic.id,
    subjectId: topic.subjectId,
    bancaSlug: null,
  })

  return NextResponse.json({
    topic: {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      parentName: topic.parent?.name ?? null,
      subject: topic.subject,
    },
    resumo: content,
    source, // 'notebooklm' | 'ai-banca' | 'ai-global' | null
    hasContent: Boolean(content),
  })
}

/**
 * PATCH /api/admin/topics/[topicId]/resumo
 * Body: { content: string, bancaSlug?: string }
 *
 * Cola/atualiza o resumo do tópico (texto exportado do NotebookLM).
 * Sobrescreve qualquer resumo gerado pela IA automática.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const content = body?.content
  if (typeof content !== 'string' || content.trim().length < 50) {
    return NextResponse.json({ message: 'Conteúdo precisa ter pelo menos 50 caracteres' }, { status: 400 })
  }
  if (content.length > 60_000) {
    return NextResponse.json({ message: 'Conteúdo muito longo (máx 60k chars)' }, { status: 400 })
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: { id: true, subjectId: true },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  const { cacheKeys } = await saveTopicResumoFromAdmin({
    topicId: topic.id,
    subjectId: topic.subjectId,
    content: content.trim(),
    bancaSlug: body?.bancaSlug ?? null,
  })

  return NextResponse.json({
    ok: true,
    cacheKeys,
    source: 'notebooklm',
  })
}

/**
 * DELETE /api/admin/topics/[topicId]/resumo
 * Apaga o resumo do admin — próxima request dispara regeneração via IA.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: { id: true, subjectId: true },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  const { deleted } = await deleteTopicResumo({
    topicId: topic.id,
    subjectId: topic.subjectId,
    bancaSlug: null,
  })

  return NextResponse.json({ ok: true, deleted })
}
