import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { MaterialType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') ?? undefined
  const topicId = searchParams.get('topicId') ?? undefined
  const type = searchParams.get('type') as MaterialType | null
  const status = searchParams.get('status') ?? undefined
  const origin = searchParams.get('origin') ?? undefined
  const q = searchParams.get('q') ?? undefined

  const materials = await prisma.material.findMany({
    where: {
      ...(subjectId && { subjectId }),
      ...(topicId && { topicId }),
      ...(type && { type }),
      ...(status && { status: status as any }),
      ...(origin && { origin }),
      ...(q && { title: { contains: q, mode: 'insensitive' as const } }),
    },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ materials })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  if (!body.title || !body.content) {
    return NextResponse.json({ message: 'title e content obrigatórios' }, { status: 400 })
  }

  const m = await prisma.material.create({
    data: {
      title: body.title,
      type: (body.type as MaterialType) ?? MaterialType.TEXTO,
      content: body.content,
      subjectId: body.subjectId ?? null,
      topicId: body.topicId ?? null,
      pdfUrl: body.pdfUrl ?? null,
      videoUrl: body.videoUrl ?? null,
      source: body.source ?? null,
      authorName: body.authorName ?? null,
    },
  })
  return NextResponse.json(m, { status: 201 })
}
