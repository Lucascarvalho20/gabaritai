import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { generateTotpSecret, buildOtpauthUrl, buildQrImageUrl } from '@/lib/totp'

/**
 * Inicia setup de 2FA: gera secret novo, retorna QR code.
 * Secret só vira ATIVO depois que usuário confirma com primeiro código (POST /verify).
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, username: true, totpEnabled: true },
  })
  if (full?.totpEnabled) {
    return NextResponse.json({ message: '2FA já está ativado' }, { status: 400 })
  }

  const secret = generateTotpSecret()
  const account = full?.email ?? full?.username ?? user.id
  const otpauthUrl = buildOtpauthUrl(account, secret)
  const qrUrl = buildQrImageUrl(otpauthUrl)

  // Armazena secret como "pendente" (totpEnabled=false até confirmar)
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  })

  return NextResponse.json({ secret, otpauthUrl, qrUrl })
}
