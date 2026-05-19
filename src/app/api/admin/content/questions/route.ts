import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') ?? undefined
  const banca = searchParams.get('banca') ?? undefined
  const source = searchParams.get('source') ?? undefined
  const showAnuladas = searchParams.get('anuladas') === 'true'

  const questions = await prisma.question.findMany({
    where: {
      ...(subjectId && { subjectId }),
      ...(banca && { bancaSlug: banca }),
      ...(source && { source: source as any }),
      ...(!showAnuladas && { anulada: false }),
      active: true,
    },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const stats = {
    total: await prisma.question.count({ where: { active: true } }),
    official: await prisma.question.count({ where: { active: true, source: 'OFFICIAL' } }),
    aiGenerated: await prisma.question.count({ where: { active: true, source: 'AI_GENERATED' } }),
    anuladas: await prisma.question.count({ where: { active: true, anulada: true } }),
  }
  return NextResponse.json({ questions, stats })
}
