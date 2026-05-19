import { NextRequest, NextResponse } from 'next/server'
import { syncConcursosFromApi, PRIORITY_UFS } from '@/lib/concursos-api'
import { prisma } from '@/lib/prisma'
import { detectAndPersistChanges } from '@/lib/edital-diff'

export const maxDuration = 300 // 5min — sincronizar pode demorar

/**
 * Cron endpoint protegido por token bearer (header X-Cron-Token).
 * Roda:
 *  1. Sincroniza concursos abertos da API externa (UFs prioritárias)
 *  2. Detecta mudanças em editais novos (últimos 7 dias) que ainda não foram diffados
 *
 * Configurar no Vercel: crons em vercel.json + CRON_TOKEN no env
 * Ou usar cron-job.org gratuito pra chamar este endpoint
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_TOKEN ?? 'gabaritai-dev-cron-token'
  if (token !== expected) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }

  const startedAt = Date.now()
  const results: Record<string, unknown> = {}

  // 1. Sincronizar concursos abertos
  try {
    results.concursosSync = await syncConcursosFromApi(PRIORITY_UFS)
  } catch (err: any) {
    results.concursosSync = { error: err.message }
  }

  // 2. Detectar mudanças em editais recém-criados
  try {
    const recentEditais = await prisma.edital.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { id: true },
    })
    const diffs = []
    for (const e of recentEditais) {
      try {
        diffs.push({ editalId: e.id, ...(await detectAndPersistChanges(e.id)) })
      } catch (err: any) {
        diffs.push({ editalId: e.id, error: err.message })
      }
    }
    results.editalDiffs = { processed: diffs.length, diffs }
  } catch (err: any) {
    results.editalDiffs = { error: err.message }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    results,
  })
}

// Vercel Cron usa GET por padrão, mas POST também funciona
export const POST = GET
