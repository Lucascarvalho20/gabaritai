import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/flashcards/[id]/review
 * Registra revisão (SM-2). Quality 0-5:
 *   0-2 = errou (reseta interval)
 *   3   = correto com esforço
 *   4-5 = fácil
 *
 * Algoritmo SM-2:
 *   ef = max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
 *   se q < 3: interval = 1
 *   se primeira revisão correta: interval = 1
 *   se segunda revisão correta: interval = 6
 *   senão: interval = round(interval * ef)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const quality = Math.max(0, Math.min(5, Math.round(Number(body.quality ?? 0))))

  const fc = await prisma.flashcard.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!fc) return NextResponse.json({ message: 'Flashcard não encontrado' }, { status: 404 })

  const prev = await prisma.flashcardReview.findUnique({
    where: { userId_flashcardId: { userId: user.id, flashcardId: fc.id } },
  })

  let ef = prev?.easeFactor ?? 2.5
  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

  let interval: number
  if (quality < 3) {
    interval = 1
  } else if (!prev) {
    interval = 1
  } else if (prev.interval === 1) {
    interval = 6
  } else {
    interval = Math.round(prev.interval * ef)
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  const review = await prisma.flashcardReview.upsert({
    where: { userId_flashcardId: { userId: user.id, flashcardId: fc.id } },
    create: {
      userId: user.id, flashcardId: fc.id, quality, interval, easeFactor: ef, nextReview,
    },
    update: { quality, interval, easeFactor: ef, nextReview },
    select: { id: true, quality: true, interval: true, easeFactor: true, nextReview: true },
  })

  return NextResponse.json({ ok: true, review })
}
