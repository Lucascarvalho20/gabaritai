import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import { criarContasPadrao } from '@/lib/contas-teste-padrao'

export const dynamic = 'force-dynamic'

/** POST — cria as quatro contas de teste padrão que faltarem (1 curso, 2 cursos, todos, gratuita). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const r = await criarContasPadrao()
  for (const id of r.criadas) {
    await audit({
      actorId: auth.user.id, targetId: id, action: 'USER_CREATED_BY_ADMIN',
      ip: getClientIp(req), userAgent: req.headers.get('user-agent'), metadata: { contaDeTeste: true, padrao: true },
    })
  }
  return NextResponse.json(r)
}
