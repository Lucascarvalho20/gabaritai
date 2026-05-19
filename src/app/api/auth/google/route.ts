import { NextRequest, NextResponse } from 'next/server'
import { buildGoogleAuthUrl, generateOAuthState } from '@/lib/google-oauth'

// GET /api/auth/google → redireciona pro Google OAuth
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const state = generateOAuthState()
  const url = buildGoogleAuthUrl({ redirectUri, state })

  const res = NextResponse.redirect(url)
  // Cookie state pra validar no callback (CSRF protection)
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  })
  return res
}
