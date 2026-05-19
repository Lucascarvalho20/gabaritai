import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/content/questions-stats
// Retorna inventário de questões por: source (OFFICIAL/AI/ADAPTED) × banca × matéria × ano
// Ajuda o admin a saber onde tem buraco (matéria com 0 questões oficiais, etc).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  // Totais por source
  const bySource = await prisma.question.groupBy({
    by: ['source'],
    where: { active: true },
    _count: { _all: true },
  })

  // Por banca + source
  const byBanca = await prisma.question.groupBy({
    by: ['bancaSlug', 'source'],
    where: { active: true, bancaSlug: { not: null } },
    _count: { _all: true },
  })

  // Por matéria + source
  const bySubject = await prisma.question.groupBy({
    by: ['subjectId', 'source'],
    where: { active: true, subjectId: { not: null } },
    _count: { _all: true },
  })

  // Lookup pra nomes das matérias
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true, slug: true } })
  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  // Por ano + banca
  const byYearBanca = await prisma.question.groupBy({
    by: ['ano', 'bancaSlug'],
    where: { active: true, ano: { not: null }, source: 'OFFICIAL' },
    _count: { _all: true },
  })

  return NextResponse.json({
    totals: {
      OFFICIAL: bySource.find((s) => s.source === 'OFFICIAL')?._count._all ?? 0,
      AI_GENERATED: bySource.find((s) => s.source === 'AI_GENERATED')?._count._all ?? 0,
      ADAPTED: bySource.find((s) => s.source === 'ADAPTED')?._count._all ?? 0,
    },
    byBanca: byBanca.map((b) => ({ bancaSlug: b.bancaSlug, source: b.source, count: b._count._all })),
    bySubject: bySubject.map((s) => ({
      subjectId: s.subjectId,
      subjectName: subjectMap.get(s.subjectId!)?.name ?? '?',
      subjectSlug: subjectMap.get(s.subjectId!)?.slug ?? '?',
      source: s.source,
      count: s._count._all,
    })),
    byYearBanca: byYearBanca.map((y) => ({ ano: y.ano, bancaSlug: y.bancaSlug, count: y._count._all })),
  })
}
