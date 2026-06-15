import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { checkRefundEligibility } from '@/lib/refund'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/refund-eligibility
 * Retorna se o aluno pode pedir reembolso (janela + trava de uso).
 * Usado no dashboard pra mostrar/ocultar o botão de garantia.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const elig = await checkRefundEligibility(auth.user.id)
  return NextResponse.json(elig)
}
