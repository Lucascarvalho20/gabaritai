import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(_req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const m = await prisma.material.findUnique({
    where: { id: params.id },
    include: {
      subject: { select: { id: true, name: true, slug: true } },
      topic: { select: { id: true, name: true, order: true } },
      resumo: true,
    },
  })
  if (!m) return NextResponse.json({ message: 'Material não encontrado' }, { status: 404 })
  return NextResponse.json(m)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['title', 'content', 'subjectId', 'topicId', 'pdfUrl', 'videoUrl', 'active', 'status', 'origin']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.status === 'PUBLISHED' || body.status === 'REVIEWED') {
    data.reviewedAt = new Date()
    data.reviewedBy = auth.user.id
  }
  const m = await prisma.material.update({ where: { id: params.id }, data })

  if (body.resumo !== undefined) {
    await prisma.materialResumo.upsert({
      where: { materialId: params.id },
      create: {
        materialId: params.id,
        resumo: String(body.resumo),
        pontosChave: body.pontosChave ?? null,
        generatedBy: 'admin',
      },
      update: {
        resumo: String(body.resumo),
        pontosChave: body.pontosChave ?? null,
      },
    })
  }

  return NextResponse.json(m)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  await prisma.material.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
