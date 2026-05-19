import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/historico?subjectId=&bancaSlug=&correct=true|false&limit=50&cursor=
// Histórico de questões respondidas pelo aluno com filtros + paginação cursor.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') ?? undefined
  const bancaSlug = searchParams.get('bancaSlug') ?? undefined
  const correctParam = searchParams.get('correct')
  const correct = correctParam === 'true' ? true : correctParam === 'false' ? false : undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const cursor = searchParams.get('cursor') ?? undefined

  const where: any = { userId: user.id }
  if (correct !== undefined) where.correct = correct
  if (subjectId || bancaSlug) {
    where.question = {
      ...(subjectId && { subjectId }),
      ...(bancaSlug && { bancaSlug }),
    }
  }

  const attempts = await prisma.questionAttempt.findMany({
    where,
    include: {
      question: {
        select: {
          id: true,
          enunciado: true,
          alternativas: true,
          gabarito: true,
          explicacao: true,
          subjectId: true,
          bancaSlug: true,
          ano: true,
          orgao: true,
          difficulty: true,
          subject: { select: { name: true, slug: true } },
        },
      },
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  })

  const hasMore = attempts.length > limit
  const data = hasMore ? attempts.slice(0, limit) : attempts
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return NextResponse.json({
    attempts: data.map((a) => ({
      id: a.id,
      selected: a.selected,
      correct: a.correct,
      timeMs: a.timeMs,
      createdAt: a.createdAt,
      question: a.question,
    })),
    nextCursor,
  })
}
