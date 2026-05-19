import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['enunciado', 'alternativas', 'gabarito', 'explicacao', 'anulada', 'active', 'difficulty', 'bancaSlug', 'tags']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const q = await prisma.question.update({ where: { id: params.id }, data })
  return NextResponse.json(q)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  // Soft delete (preserva histórico de attempts)
  await prisma.question.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
