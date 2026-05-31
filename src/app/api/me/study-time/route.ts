import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/study-time
 * Registra uma sessão de estudo cronometrada pelo aluno (timer flutuante).
 * Body: { durationMin: number, type?: 'ESTUDO' | 'REVISAO' | 'QUESTOES', source?: string, subjectId?: string }
 *
 * Cronômetro modo "livre" NÃO chama esta rota.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const durationMin = Number(body?.durationMin)
  if (!Number.isFinite(durationMin) || durationMin < 1) {
    return NextResponse.json({ message: 'durationMin inválido (mínimo 1 minuto)' }, { status: 400 })
  }
  if (durationMin > 600) {
    return NextResponse.json({ message: 'durationMin acima de 10h — provavelmente erro' }, { status: 400 })
  }

  const type = typeof body?.type === 'string' ? body.type : 'ESTUDO'
  const source = typeof body?.source === 'string' ? body.source : null
  const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : null

  const session = await prisma.studySession.create({
    data: {
      userId: user.id,
      type,
      durationMin,
      subjectId,
      meta: source ? { source } : undefined,
    },
  })

  return NextResponse.json({ ok: true, id: session.id, durationMin })
}

/**
 * GET /api/me/study-time?days=7
 * Lista sessões recentes + totais agregados.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const url = new URL(req.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? 7)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const sessions = await prisma.studySession.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const totalMin = sessions.reduce((a, s) => a + s.durationMin, 0)
  const byDay = new Map<string, number>()
  for (const s of sessions) {
    const day = s.createdAt.toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + s.durationMin)
  }

  return NextResponse.json({
    sessions,
    totalMin,
    days,
    perDay: Array.from(byDay.entries())
      .map(([date, min]) => ({ date, min }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  })
}
