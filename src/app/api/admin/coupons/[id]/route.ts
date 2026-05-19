import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['active', 'description', 'maxUses', 'validUntil']) if (body[k] !== undefined) data[k] = body[k]
  if (body.validUntil) data.validUntil = new Date(body.validUntil)
  const updated = await prisma.coupon.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  // Soft: desativa em vez de apagar (preserva histórico de redemptions)
  await prisma.coupon.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
