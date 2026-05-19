import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { verifyTotpCode } from '@/lib/totp'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { code } = await req.json()
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, totpSecret: true, totpEnabled: true },
  })
  if (!full?.totpEnabled || !full.totpSecret) {
    return NextResponse.json({ message: '2FA não está ativo' }, { status: 400 })
  }

  // Exige código atual pra desativar (proteção contra session-hijack)
  if (!verifyTotpCode(full.totpSecret, String(code ?? ''))) {
    return NextResponse.json({ message: 'Código inválido' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpVerifiedAt: null },
  })

  await audit({ actorId: user.id, action: 'TOTP_DISABLED', ip: getClientIp(req) })

  return NextResponse.json({ ok: true })
}
