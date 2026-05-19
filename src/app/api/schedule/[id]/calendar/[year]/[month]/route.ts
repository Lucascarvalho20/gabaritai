import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; year: string; month: string } },
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const year = parseInt(params.year, 10)
  const month = parseInt(params.month, 10) // 1-12

  const plan = await prisma.studyPlan.findFirst({ where: { id: params.id, userId: user.id } })
  if (!plan) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const sessions = await prisma.studyPlanSession.findMany({
    where: { studyPlanId: params.id, date: { gte: start, lte: end } },
    orderBy: [{ date: 'asc' }],
  })

  const subjectIds = Array.from(new Set(sessions.map((s) => s.subjectId).filter(Boolean) as string[]))
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true, slug: true, area: true },
      })
    : []
  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  const byDay: Record<string, typeof sessions> = {}
  for (const s of sessions) {
    const key = s.date.toISOString().slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(s)
  }

  return NextResponse.json({
    year,
    month,
    days: Object.entries(byDay).map(([day, daySessions]) => ({
      date: day,
      sessions: daySessions.map((s) => ({
        id: s.id,
        subject: s.subjectId ? subjectMap.get(s.subjectId) ?? null : null,
        durationMin: s.durationMin,
        type: s.type,
        status: s.status,
        startTime: s.startTime,
      })),
    })),
  })
}
