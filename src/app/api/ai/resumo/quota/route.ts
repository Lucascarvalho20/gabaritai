import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function dailyLimitForUser(plan: string | null, hasFullAccess: boolean): number {
  if (hasFullAccess) return 50
  const p = (plan ?? '').toLowerCase()
  if (p.startsWith('trial')) return 2
  if (p.includes('todos')) return 10
  return 5
}

// GET /api/ai/resumo/quota → { used, limit }
// Usado pela página de Resumos pra mostrar quanto sobrou no dia.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, hasFullAccess: true },
  })
  const limit = dailyLimitForUser(fullUser?.plan ?? null, fullUser?.hasFullAccess ?? false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const usage = await prisma.featureUsage.findUnique({
    where: { userId_feature_date: { userId: user.id, feature: 'resumo', date: today } },
    select: { count: true },
  })
  return NextResponse.json({ used: usage?.count ?? 0, limit })
}
