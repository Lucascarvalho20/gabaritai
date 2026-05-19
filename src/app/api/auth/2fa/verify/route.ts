import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { verifyTotpCode } from '@/lib/totp'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

/**
 * Confirma o setup de 2FA com o primeiro código.
 * Quando OK: marca totpEnabled=true e totpVerifiedAt.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { code } = await req.json()
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, totpSecret: true },
  })
  if (!full?.totpSecret) {
    return NextResponse.json({ message: 'Setup de 2FA não iniciado' }, { status: 400 })
  }

  const ok = verifyTotpCode(full.totpSecret, String(code ?? ''))
  if (!ok) {
    return NextResponse.json({ message: 'Código inválido' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpVerifiedAt: new Date() },
  })

  await audit({
    actorId: user.id,
    action: 'TOTP_ENABLED',
    ip: getClientIp(req),
  })

  return NextResponse.json({ ok: true, message: '2FA ativado com sucesso' })
}
