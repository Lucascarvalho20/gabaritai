import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const updated = await prisma.editalChangeLog.update({
    where: { id: params.id },
    data: {
      reviewed: body.reviewed ?? true,
      reviewedAt: new Date(),
      reviewedById: auth.user.id,
    },
  })
  return NextResponse.json(updated)
}
