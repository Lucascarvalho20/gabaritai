import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateWeeklyMockExam, getWeekStart, type ScheduledDay } from '@/lib/mock-exam-scheduler'

export const maxDuration = 300 // 5min

// POST /api/cron/generate-weekly-mocks?day=TUE|THU|SUN&dryRun=false
// Cron suggestion (Brazil time):
//   Mon 23:00  → day=TUE  (gera mini de terça)
//   Wed 23:00  → day=THU  (gera mini de quinta)
//   Sat 18:00  → day=SUN  (gera real de domingo)
//
// Estratégia compartilhada: 1 simulado por curso por dia.
// Todos os alunos do mesmo curso recebem o MESMO simulado naquela janela.
// Real (domingo) só gera pra cursos com edital ativo cadastrado.
async function handler(req: NextRequest) {
  const token = req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_TOKEN ?? 'gabaritai-dev-cron-token'
  if (token !== expected) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const day = (searchParams.get('day') ?? '').toUpperCase() as ScheduledDay
  const dryRun = searchParams.get('dryRun') === 'true'

  if (!['TUE', 'THU', 'SUN'].includes(day)) {
    return NextResponse.json({ message: 'day inválido (use TUE | THU | SUN)' }, { status: 400 })
  }

  const weekStart = getWeekStart()

  // Cursos ativos que tenham pelo menos 1 aluno matriculado (ou que sejam de área prioritária)
  // Em produção real: só gerar pra cursos com matrículas ativas. Pra MVP, gera pra todos ativos.
  const courses = await prisma.course.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  const results: Array<{ courseSlug: string; status: 'OK' | 'SKIPPED' | 'ERROR'; reason?: string; mockExamId?: string }> = []

  for (const course of courses) {
    try {
      // Skip se já existe
      const existing = await prisma.mockExam.findFirst({
        where: { courseId: course.id, weekStart, scheduledDay: day, active: true },
        select: { id: true },
      })
      if (existing) {
        results.push({ courseSlug: course.slug, status: 'SKIPPED', reason: 'já existe', mockExamId: existing.id })
        continue
      }

      if (dryRun) {
        results.push({ courseSlug: course.slug, status: 'SKIPPED', reason: 'dryRun' })
        continue
      }

      const mock = await getOrCreateWeeklyMockExam({ courseId: course.id, day, weekStart })
      results.push({ courseSlug: course.slug, status: 'OK', mockExamId: mock.id })
    } catch (e: any) {
      results.push({ courseSlug: course.slug, status: 'ERROR', reason: e.message ?? String(e) })
    }
  }

  return NextResponse.json({
    day,
    weekStart,
    coursesProcessed: courses.length,
    generated: results.filter((r) => r.status === 'OK').length,
    skipped: results.filter((r) => r.status === 'SKIPPED').length,
    errors: results.filter((r) => r.status === 'ERROR').length,
    results,
  })
}

export const GET = handler
export const POST = handler
