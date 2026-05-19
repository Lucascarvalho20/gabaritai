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
  const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!, 10) : undefined
  const q = searchParams.get('q') ?? undefined
  const showAnuladas = searchParams.get('anuladas') === 'true'
  const take = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const cursor = searchParams.get('cursor') ?? undefined

  const questions = await prisma.question.findMany({
    where: {
      ...(subjectId && { subjectId }),
      ...(banca && { bancaSlug: banca }),
      ...(source && { source: source as any }),
      ...(ano && { ano }),
      ...(q && { enunciado: { contains: q, mode: 'insensitive' } }),
      ...(!showAnuladas && { anulada: false }),
      active: true,
    },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })
  const hasMore = questions.length > take
  const data = hasMore ? questions.slice(0, take) : questions
  const nextCursor = hasMore ? data[data.length - 1].id : null
  const stats = {
    total: await prisma.question.count({ where: { active: true } }),
    official: await prisma.question.count({ where: { active: true, source: 'OFFICIAL' } }),
    aiGenerated: await prisma.question.count({ where: { active: true, source: 'AI_GENERATED' } }),
    anuladas: await prisma.question.count({ where: { active: true, anulada: true } }),
  }
  return NextResponse.json({ questions: data, stats, nextCursor })
}
