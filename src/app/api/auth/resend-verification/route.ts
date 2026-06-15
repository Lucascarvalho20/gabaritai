import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildVerificationEmail } from '@/lib/email'
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/rate-limit'
import crypto from 'crypto'

/**
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * Reenvia o e-mail de verificação. Por privacidade, SEMPRE responde ok
 * (não revela se o e-mail existe ou já está verificado). Rate-limited por IP.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit pra evitar spam/enumeração
  const rl = checkRateLimit(`resend-verify:${ip}`, ip)
  if (!rl.ok) {
    return NextResponse.json({ message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      recordFailedAttempt(`resend-verify:${ip}`, ip)
      return NextResponse.json({ message: 'E-mail obrigatório' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, emailVerified: true },
    })

    // Só age se o user existe E ainda não verificou. Caso contrário, finge sucesso.
    if (user && !user.emailVerified) {
      const verifyToken = crypto.randomBytes(32).toString('hex')
      const verifyExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
      })
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      const verifyUrl = `${baseUrl}/verificar-email?token=${verifyToken}`
      const content = buildVerificationEmail(user.name, verifyUrl)
      await sendEmail({ to: normalizedEmail, ...content }).catch(() => {})
    }

    // Resposta genérica sempre (não vaza existência de conta)
    return NextResponse.json({
      ok: true,
      message: 'Se houver uma conta com esse e-mail não verificado, enviamos um novo link.',
    })
  } catch {
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
