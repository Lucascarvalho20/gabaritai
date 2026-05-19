import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['title', 'content', 'subjectId', 'topicId', 'pdfUrl', 'videoUrl', 'active']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const m = await prisma.material.update({ where: { id: params.id }, data })
  return NextResponse.json(m)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  await prisma.material.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
