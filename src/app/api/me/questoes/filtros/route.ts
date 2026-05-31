import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/questoes/filtros
 * Retorna as opções disponíveis pra os filtros da aba Questões:
 *  - bancas (distintas das questões oficiais)
 *  - anos (distintos)
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const [bancaSlugs, anosRows, bancasFull] = await Promise.all([
    prisma.question.findMany({
      where: { active: true, anulada: false, bancaSlug: { not: null } },
      select: { bancaSlug: true },
      distinct: ['bancaSlug'],
      take: 50,
    }),
    prisma.question.findMany({
      where: { active: true, anulada: false, ano: { not: null } },
      select: { ano: true },
      distinct: ['ano'],
      take: 30,
      orderBy: { ano: 'desc' },
    }),
    prisma.banca.findMany({ select: { slug: true, name: true } }),
  ])

  const bancaByName = new Map(bancasFull.map((b) => [b.slug, b.name]))
  const bancas = bancaSlugs
    .map((b) => ({ slug: b.bancaSlug!, name: bancaByName.get(b.bancaSlug!) ?? b.bancaSlug! }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const anos = anosRows.map((r) => r.ano!).filter((a) => typeof a === 'number').sort((a, b) => b - a)

  return NextResponse.json({ bancas, anos })
}
