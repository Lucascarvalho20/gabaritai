import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/flashcards
 * Retorna flashcards disponíveis pro user:
 *  - Próprios (userId == user.id)
 *  - Compartilhados (isShared=true) das matérias dos cursos do user
 *  - Com info de FlashcardReview (se já estudou, próximo review)
 *
 * Ordem: priorizar os que estão na data de review (SM-2), depois novos.
 * Filtros: ?subjectId=, ?onlyDue=true
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') ?? undefined
  const onlyDue = searchParams.get('onlyDue') === 'true'

  // Matérias dos cursos do user (pra escopo de flashcards compartilhados)
  const enrollments = await prisma.userCourseEnrollment.findMany({
    where: { userId: user.id, isActive: true },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)
  const courseSubjects = courseIds.length === 0
    ? []
    : await prisma.courseSubject.findMany({
        where: { courseId: { in: courseIds } },
        select: { subjectId: true },
      })
  const subjectIds = Array.from(new Set(courseSubjects.map((cs) => cs.subjectId)))

  const flashcards = await prisma.flashcard.findMany({
    where: {
      active: true,
      ...(subjectId && { subjectId }),
      OR: [
        { userId: user.id },                                  // próprios
        { isShared: true, subjectId: { in: subjectIds } },    // compartilhados das suas matérias
      ],
    },
    include: {
      subject: { select: { id: true, name: true } },
      reviews: {
        where: { userId: user.id },
        select: { quality: true, interval: true, easeFactor: true, nextReview: true, createdAt: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    take: 100,
  })

  const now = new Date()
  const enriched = flashcards.map((f) => {
    const last = f.reviews[0]
    const due = !last || last.nextReview <= now
    return {
      id: f.id,
      frente: f.frente,
      verso: f.verso,
      subjectId: f.subjectId,
      subjectName: f.subject?.name ?? null,
      isAI: f.isAI,
      lastReview: last ?? null,
      due,
    }
  })

  const result = onlyDue ? enriched.filter((f) => f.due) : enriched
  // Ordena: due primeiro, depois pelo nextReview mais antigo
  result.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1
    const aN = a.lastReview?.nextReview ? new Date(a.lastReview.nextReview).getTime() : 0
    const bN = b.lastReview?.nextReview ? new Date(b.lastReview.nextReview).getTime() : 0
    return aN - bN
  })

  return NextResponse.json({ flashcards: result, total: result.length })
}

/**
 * POST /api/me/flashcards
 * Cria flashcard CUSTOM do user (não compartilhado por padrão).
 *
 * Body: { frente, verso, subjectId? }
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const frente = String(body.frente ?? '').trim()
  const verso = String(body.verso ?? '').trim()
  const subjectId = body.subjectId || null
  if (frente.length < 5 || verso.length < 5) {
    return NextResponse.json({ message: 'Frente e verso são obrigatórios (min 5 chars)' }, { status: 400 })
  }

  const fc = await prisma.flashcard.create({
    data: {
      userId: user.id,
      subjectId,
      frente,
      verso,
      isAI: false,
      isShared: false,
    },
    select: { id: true, frente: true, verso: true, subjectId: true },
  })
  return NextResponse.json({ ok: true, flashcard: fc })
}
