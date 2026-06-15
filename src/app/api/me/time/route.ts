import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-errors'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { StudyTimeType, StudyTimeSource } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_TYPES = new Set<string>(Object.values(StudyTimeType))
const MAX_DURATION_SEC = 24 * 60 * 60 // 24h — barra lançamento absurdo

// Data 'YYYY-MM-DD' no fuso de Brasília (servidor roda em UTC na Vercel)
function brDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

/** GET /api/me/time?from=&to=&type= — lista + agregados (hoje/semana/total/heatmap) */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  try {
    const sp = new URL(req.url).searchParams
    const typeFilter = sp.get('type')

    // Janela de 90 dias pros agregados/heatmap + lista recente
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const entries = await prisma.studyTimeEntry.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: since },
        ...(typeFilter && VALID_TYPES.has(typeFilter) ? { type: typeFilter as StudyTimeType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const todayKey = brDateKey(new Date())
    const weekKeys = new Set<string>()
    for (let i = 0; i < 7; i++) weekKeys.add(brDateKey(new Date(Date.now() - i * 86400000)))

    let todaySec = 0
    let weekSec = 0
    const byType: Record<string, number> = {}
    const byDay: Record<string, number> = {}

    for (const e of entries) {
      const k = brDateKey(e.createdAt)
      byDay[k] = (byDay[k] ?? 0) + e.durationSec
      byType[e.type] = (byType[e.type] ?? 0) + e.durationSec
      if (k === todayKey) todaySec += e.durationSec
      if (weekKeys.has(k)) weekSec += e.durationSec
    }

    // Total geral (lifetime) — soma sem janela
    const totalAgg = await prisma.studyTimeEntry.aggregate({
      where: { userId: user.id },
      _sum: { durationSec: true },
    })

    return NextResponse.json({
      entries,
      stats: {
        todaySec,
        weekSec,
        totalSec: totalAgg._sum.durationSec ?? 0,
        byType,
        byDay,
      },
    })
  } catch (err: any) {
    return apiError(err, 'Erro ao listar tempo', 'time-list')
  }
}

/** POST /api/me/time — cria registro (cronômetro ou manual) */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const ip = getClientIp(req)
  const rl = rateLimit({ key: `time:create:${user.id}:${ip}`, windowMs: 60_000, max: 60 })
  if (!rl.allowed) return NextResponse.json({ message: 'Muitas tentativas — espera um pouco.' }, { status: 429 })

  try {
    const body = await req.json()
    const type = VALID_TYPES.has(body.type) ? (body.type as StudyTimeType) : StudyTimeType.OUTRO
    const source: StudyTimeSource = body.source === 'MANUAL' ? StudyTimeSource.MANUAL : StudyTimeSource.TIMER

    const durationSec = Math.round(Number(body.durationSec))
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return NextResponse.json({ message: 'Duração inválida' }, { status: 400 })
    }
    if (durationSec > MAX_DURATION_SEC) {
      return NextResponse.json({ message: 'Duração máxima por registro é 24h.' }, { status: 400 })
    }

    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) || null : null
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) || null : null
    const courseId = typeof body.courseId === 'string' ? body.courseId.slice(0, 60) : null
    const topicId = typeof body.topicId === 'string' ? body.topicId.slice(0, 60) : null
    const startedAt = body.startedAt ? new Date(body.startedAt) : null
    const endedAt = body.endedAt ? new Date(body.endedAt) : null

    const entry = await prisma.studyTimeEntry.create({
      data: {
        userId: user.id,
        type, source, durationSec,
        label, note, courseId, topicId,
        startedAt: startedAt && !isNaN(startedAt.getTime()) ? startedAt : null,
        endedAt: endedAt && !isNaN(endedAt.getTime()) ? endedAt : null,
      },
    })

    return NextResponse.json({ ok: true, entry }, { status: 201 })
  } catch (err: any) {
    return apiError(err, 'Erro ao salvar tempo', 'time-create')
  }
}
