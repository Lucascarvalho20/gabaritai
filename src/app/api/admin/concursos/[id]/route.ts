import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.dismissed === 'boolean') data.dismissed = body.dismissed
  if (typeof body.isRelevant === 'boolean') data.isRelevant = body.isRelevant
  if (typeof body.linkedEdital === 'string') data.linkedEdital = body.linkedEdital

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nada a atualizar' }, { status: 400 })
  }

  const updated = await prisma.concursoAlerta.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}
