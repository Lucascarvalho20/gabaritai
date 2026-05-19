import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/questoes
// Filtros: subjectId, subjectSlug, bancaSlug, ano, source (OFFICIAL|AI_GENERATED), difficulty, courseSlug, q (busca texto)
// Paginação cursor.
//
// Por padrão exclui questões anuladas e inativas.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') ?? undefined
  const subjectSlug = searchParams.get('subjectSlug') ?? undefined
  const bancaSlug = searchParams.get('bancaSlug') ?? undefined
  const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!, 10) : undefined
  const source = searchParams.get('source') as 'OFFICIAL' | 'AI_GENERATED' | 'ADAPTED' | null
  const difficulty = searchParams.get('difficulty') as 'EASY' | 'MEDIUM' | 'HARD' | null
  const courseSlug = searchParams.get('courseSlug') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const onlyUnanswered = searchParams.get('onlyUnanswered') === 'true'
  const onlyWrong = searchParams.get('onlyWrong') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100)
  const cursor = searchParams.get('cursor') ?? undefined

  let resolvedSubjectId = subjectId
  if (!resolvedSubjectId && subjectSlug) {
    const s = await prisma.subject.findUnique({ where: { slug: subjectSlug }, select: { id: true } })
    resolvedSubjectId = s?.id
  }

  // Se courseSlug informado, limita às matérias do curso
  let subjectIdsFromCourse: string[] | undefined
  if (courseSlug) {
    const cs = await prisma.courseSubject.findMany({
      where: { course: { slug: courseSlug } },
      select: { subjectId: true },
    })
    subjectIdsFromCourse = cs.map((c) => c.subjectId)
  }

  // Filtro de quais já respondi (pra onlyUnanswered/onlyWrong)
  let answeredQuestionIds: string[] = []
  let wrongQuestionIds: string[] = []
  if (onlyUnanswered || onlyWrong) {
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId: user.id },
      select: { questionId: true, correct: true },
      distinct: ['questionId'],
    })
    answeredQuestionIds = attempts.map((a) => a.questionId)
    wrongQuestionIds = attempts.filter((a) => !a.correct).map((a) => a.questionId)
  }

  const where: any = {
    active: true,
    anulada: false,
    ...(resolvedSubjectId && { subjectId: resolvedSubjectId }),
    ...(subjectIdsFromCourse && !resolvedSubjectId && { subjectId: { in: subjectIdsFromCourse } }),
    ...(bancaSlug && { bancaSlug }),
    ...(ano && { ano }),
    ...(source && { source }),
    ...(difficulty && { difficulty }),
    ...(q && {
      OR: [
        { enunciado: { contains: q, mode: 'insensitive' } },
        { tags: { has: q.toLowerCase() } },
      ],
    }),
    ...(onlyUnanswered && answeredQuestionIds.length > 0 && { id: { notIn: answeredQuestionIds } }),
    ...(onlyWrong && wrongQuestionIds.length > 0 && { id: { in: wrongQuestionIds } }),
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      enunciado: true,
      alternativas: true,
      gabarito: true,
      explicacao: true,
      bancaSlug: true,
      ano: true,
      orgao: true,
      difficulty: true,
      source: true,
      tags: true,
      subject: { select: { id: true, slug: true, name: true } },
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  })

  const hasMore = questions.length > limit
  const data = hasMore ? questions.slice(0, limit) : questions
  const nextCursor = hasMore ? data[data.length - 1].id : null

  // Total disponível (sem paginação) — cap em 1000 pra não pesar
  const total = await prisma.question.count({ where })

  return NextResponse.json({ questions: data, nextCursor, total })
}
