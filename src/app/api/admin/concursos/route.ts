import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const uf = searchParams.get('uf') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const onlyRelevant = searchParams.get('relevant') === 'true'
  const showDismissed = searchParams.get('dismissed') === 'true'

  const alertas = await prisma.concursoAlerta.findMany({
    where: {
      ...(uf && { uf: uf.toUpperCase() }),
      ...(status && { status }),
      ...(onlyRelevant && { isRelevant: true }),
      ...(!showDismissed && { dismissed: false }),
    },
    orderBy: [{ isRelevant: 'desc' }, { lastSeenAt: 'desc' }],
    take: 500,
  })

  const stats = {
    total: alertas.length,
    relevantes: alertas.filter((a) => a.isRelevant).length,
    abertos: alertas.filter((a) => a.status === 'ABERTO').length,
    previstos: alertas.filter((a) => a.status === 'PREVISTO').length,
  }

  return NextResponse.json({ alertas, stats })
}
