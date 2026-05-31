import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const subjects = await prisma.subject.findMany({
    select: { id: true, slug: true, name: true },
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ subjects })
}
