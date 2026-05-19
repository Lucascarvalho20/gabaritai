import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { checkRateLimit, recordFailedAttempt, recordSuccess, getClientIp } from '@/lib/rate-limit'
import { audit, recordLoginAttempt } from '@/lib/audit-log'
import { verifyTotpCode } from '@/lib/totp'
import { telegramSecurityAlert } from '@/lib/telegram'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null

  try {
    const body = await req.json()
    const rawIdentifier: string = String(body.identifier ?? body.email ?? body.username ?? '').trim()
    const password: string = String(body.password ?? '')
    const totpCode: string | undefined = body.totpCode ? String(body.totpCode).replace(/\s/g, '') : undefined

    if (!rawIdentifier || !password) {
      return NextResponse.json({ message: 'Identificador e senha são obrigatórios' }, { status: 400 })
    }

    // 1. Rate limit por (identifier, IP)
    const rl = checkRateLimit(rawIdentifier, ip)
    if (!rl.ok) {
      await recordLoginAttempt({ identifier: rawIdentifier, ip, userAgent, success: false, reason: 'rate_limited' })
      const minutesLeft = Math.ceil(((rl.lockedUntil ?? Date.now()) - Date.now()) / 60000)
      return NextResponse.json(
        { message: `Muitas tentativas falhas. Tente novamente em ${minutesLeft} minutos.` },
        { status: 429 },
      )
    }

    // 2. Localizar usuário por email OU username
    const isEmail = rawIdentifier.includes('@')
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: rawIdentifier.toLowerCase() }
        : { username: rawIdentifier.toLowerCase() },
      include: { profile: true },
    })

    if (!user) {
      const result = recordFailedAttempt(rawIdentifier, ip)
      await recordLoginAttempt({ identifier: rawIdentifier, ip, userAgent, success: false, reason: 'user_not_found' })
      return NextResponse.json(
        {
          message: 'Credenciais inválidas',
          remainingAttempts: result.remaining,
          ...(result.lockedUntil && { lockedUntil: result.lockedUntil }),
        },
        { status: 401 },
      )
    }

    // 3. Verificar lockout persistente no usuário
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await recordLoginAttempt({ userId: user.id, identifier: rawIdentifier, ip, userAgent, success: false, reason: 'account_locked' })
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { message: `Conta bloqueada temporariamente. Tente em ${minutesLeft} minutos.` },
        { status: 423 },
      )
    }

    if (!user.active) {
      await recordLoginAttempt({ userId: user.id, identifier: rawIdentifier, ip, userAgent, success: false, reason: 'account_inactive' })
      return NextResponse.json({ message: 'Conta desativada. Contate o suporte.' }, { status: 401 })
    }

    // 4. Comparar senha
    const passwordOk = await bcrypt.compare(password, user.password)
    if (!passwordOk) {
      const result = recordFailedAttempt(rawIdentifier, ip)

      // Persiste failedLoginCount no user (lockout permanente após 10 tentativas)
      const newFailed = user.failedLoginCount + 1
      const updates: any = { failedLoginCount: newFailed }
      if (newFailed >= 10) {
        updates.lockedUntil = new Date(Date.now() + 60 * 60 * 1000) // 1h
        updates.failedLoginCount = 0
        // Alerta admin: conta sob ataque
        telegramSecurityAlert({
          kind: 'BRUTE_FORCE',
          details: `Conta ${user.email ?? user.username} bloqueada por 1h após 10 tentativas falhas. IP: \`${ip}\``,
        }).catch(() => {})
      }
      await prisma.user.update({ where: { id: user.id }, data: updates })

      await recordLoginAttempt({ userId: user.id, identifier: rawIdentifier, ip, userAgent, success: false, reason: 'invalid_password' })
      await audit({ actorId: user.id, action: 'LOGIN_FAILED', ip, userAgent, metadata: { identifier: rawIdentifier } })

      return NextResponse.json(
        {
          message: 'Credenciais inválidas',
          remainingAttempts: result.remaining,
          ...(result.lockedUntil && { lockedUntil: result.lockedUntil }),
        },
        { status: 401 },
      )
    }

    // 5. 2FA — se o usuário tem TOTP habilitado, exige código
    const tfaUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true, totpSecret: true },
    })
    if (tfaUser?.totpEnabled && tfaUser.totpSecret) {
      if (!totpCode) {
        return NextResponse.json(
          { requires2FA: true, message: 'Informe o código do app autenticador' },
          { status: 200 }, // 200 com flag pra frontend pedir o código
        )
      }
      if (!verifyTotpCode(tfaUser.totpSecret, totpCode)) {
        await recordLoginAttempt({ userId: user.id, identifier: rawIdentifier, ip, userAgent, success: false, reason: 'invalid_totp' })
        return NextResponse.json({ requires2FA: true, message: 'Código 2FA inválido' }, { status: 401 })
      }
    }

    // 6. SUCESSO — limpa contadores, atualiza last login
    recordSuccess(rawIdentifier, ip)
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
    })

    await recordLoginAttempt({ userId: user.id, identifier: rawIdentifier, ip, userAgent, success: true })
    await audit({ actorId: user.id, action: 'LOGIN_SUCCESS', ip, userAgent })

    const token = await signToken({
      sub: user.id,
      email: user.email ?? undefined,
      username: user.username ?? undefined,
      role: user.role,
      plan: user.plan,
    })

    const response = NextResponse.json({
      token, // mantém no payload pra compat (axios atualiza localStorage)
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        hasFullAccess: user.hasFullAccess,
        concursoAlvo: user.profile?.concursoLabel,
        profile: user.profile,
      },
    })

    // Já seta cookie httpOnly (paralelo ao localStorage por enquanto, pra transição)
    response.cookies.set('gabaritai_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 dias
      path: '/',
    })

    return response
  } catch (err) {
    console.error('login error', err)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
