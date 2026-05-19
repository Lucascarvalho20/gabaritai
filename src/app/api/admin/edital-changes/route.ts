import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const showReviewed = searchParams.get('reviewed') === 'true'

  const changes = await prisma.editalChangeLog.findMany({
    where: showReviewed ? {} : { reviewed: false },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ changes })
}
