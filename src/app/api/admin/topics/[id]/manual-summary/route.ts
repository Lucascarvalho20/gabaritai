import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/topics/[id]/manual-summary
 *
 * Cria (ou substitui) um resumo escrito MANUALMENTE pelo admin,
 * sem passar pela IA. Caso de uso: admin gerou resumo melhor pelo NotebookLM
 * (ou escreveu do zero) e quer subir direto.
 *
 * Body: {
 *   title?: string,
 *   content: string,      // markdown
 *   publish?: boolean,    // true = direto pra PUBLISHED, false = REVIEWED
 *   source?: string,      // ex: "NotebookLM com fontes X,Y" / "redação própria"
 *   replaceExisting?: boolean  // se já existe resumo, substitui ele
 * }
 *
 * Por padrão: publish=true, replaceExisting=true.
 * Admin escrevendo = autoridade da fonte, então não precisa revisar a si mesmo.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const title: string = body.title || null
  const content: string = String(body.content ?? '').trim()
  const publish: boolean = body.publish !== false // default true
  const sourceRef: string | null = body.source ?? null
  const replaceExisting: boolean = body.replaceExisting !== false // default true

  if (content.length < 50) {
    return NextResponse.json({ message: 'Conteúdo muito curto (mín 50 chars)' }, { status: 400 })
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: { id: true, subjectId: true, name: true },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  // Resumo existente?
  const existing = await prisma.material.findFirst({
    where: { topicId: topic.id, type: 'RESUMO' },
    orderBy: { updatedAt: 'desc' },
  })

  const finalStatus = publish ? 'PUBLISHED' : 'REVIEWED'
  const finalTitle = title || `Resumo: ${topic.name}`
  const finalOrigin = 'admin-manual'

  let material
  if (existing && replaceExisting) {
    material = await prisma.material.update({
      where: { id: existing.id },
      data: {
        title: finalTitle,
        content,
        status: finalStatus,
        origin: finalOrigin,
        source: sourceRef,
        authorName: auth.user.email,
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
      },
      select: { id: true, status: true, title: true, updatedAt: true },
    })
  } else {
    material = await prisma.material.create({
      data: {
        title: finalTitle,
        subjectId: topic.subjectId,
        topicId: topic.id,
        type: 'RESUMO',
        content,
        status: finalStatus,
        origin: finalOrigin,
        source: sourceRef,
        authorName: auth.user.email,
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
      },
      select: { id: true, status: true, title: true, createdAt: true },
    })
  }

  return NextResponse.json({ ok: true, material, replaced: !!(existing && replaceExisting) })
}
