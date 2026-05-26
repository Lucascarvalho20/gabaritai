import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getReferralStats } from '@/lib/referral'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/referral — stats do programa de afiliados do aluno
 *
 * Devolve: código, link, total de indicações, qts viraram pagantes,
 * comissão acumulada (30% recorrente sobre cada pagamento aprovado dos
 * indicados), pagamentos recentes (com nome mascarado).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const stats = await getReferralStats(auth.user.id)
  return NextResponse.json(stats)
}
