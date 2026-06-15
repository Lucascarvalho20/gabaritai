import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForProfile } from '@/lib/google-oauth'
import { signToken } from '@/lib/jwt'
import { getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/auth/google/callback?code=...&state=...
// Recebe o code do Google, troca por profile, cria/loga user, seta cookie JWT.
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieState = req.cookies.get('oauth_state')?.value

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_missing_params`)
  }
  if (!cookieState || state !== cookieState) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_state_mismatch`)
  }

  try {
    const profile = await exchangeCodeForProfile({
      code,
      redirectUri: `${baseUrl}/api/auth/google/callback`,
    })

    // Procura user existente (por oauth match OU por email)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { oauthProvider: 'google', oauthSub: profile.sub },
          { email: profile.email },
        ],
      },
    })

    let isNewUser = false
    if (!user) {
      // Cria novo + trial 7 dias automático
      isNewUser = true
      user = await prisma.user.create({
        data: {
          name: profile.name ?? profile.email.split('@')[0],
          email: profile.email,
          emailVerified: true, // Google confirmou
          oauthProvider: 'google',
          oauthSub: profile.sub,
          avatar: profile.picture ?? null,
          // Senha aleatória (não usada — login só via Google) — força reset se quiser senha
          password: 'oauth-' + Math.random().toString(36).slice(2) + Date.now(),
          profile: { create: { nivel: 'iniciante', horasDia: '3' } },
          trials: {
            create: { endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          },
        },
      })
    } else {
      // Atualiza vínculo OAuth se faltava
      if (!user.oauthProvider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: 'google',
            oauthSub: profile.sub,
            emailVerified: true,
            avatar: user.avatar ?? profile.picture ?? null,
          },
        })
      }
    }

    // Desarquiva se voltou
    if (user.archivedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { archivedAt: null, archivedReason: null },
      })
    }

    // Audita login + atualiza last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
    })

    // Assina JWT
    const token = await signToken({ sub: user.id, email: user.email, role: user.role })

    // Precisa redirecionar pra uma página intermediária que persiste o token
    // em localStorage (cliente usa Bearer, não cookie). Se faltar CPF/telefone,
    // a página manda pra /completar-cadastro depois.
    const needsCompletion = !user.cpfHash || !user.phone
    const next = needsCompletion ? '/completar-cadastro' : (user.role === 'ADMIN' ? '/admin' : '/dashboard')
    const finalizeUrl = new URL(`${baseUrl}/oauth-finalize`)
    finalizeUrl.searchParams.set('token', token)
    finalizeUrl.searchParams.set('next', next)
    if (isNewUser) finalizeUrl.searchParams.set('new', '1')

    const res = NextResponse.redirect(finalizeUrl.toString())
    res.cookies.delete('oauth_state')
    // Seta cookie httpOnly igual ao login por senha — assim a sessão OAuth
    // também fica protegida por cookie (não só localStorage). O token segue
    // na URL apenas pra hidratar o store/localStorage no oauth-finalize.
    res.cookies.set('gabaritai_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err: any) {
    console.error('[oauth] google callback error:', err.message)
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`)
  }
}
