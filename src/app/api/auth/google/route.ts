import { NextRequest, NextResponse } from 'next/server'
import { buildGoogleAuthUrl, generateOAuthState } from '@/lib/google-oauth'
import { caminhoInternoSeguro } from '@/lib/safe-redirect'

export const dynamic = 'force-dynamic'

// GET /api/auth/google → redireciona pro Google OAuth
export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ message: 'Login com Google não está configurado' }, { status: 503 })
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const state = generateOAuthState()
  const url = buildGoogleAuthUrl({ redirectUri, state })

  const res = NextResponse.redirect(url)

  // Guarda para onde voltar depois de autenticar. Vem da query (?redirect=),
  // mas só se for caminho interno — ver safe-redirect.ts. Fica em cookie e não
  // no `state` porque o Google devolve o state inalterado e ele já tem a função
  // de proteger contra CSRF; misturar as duas coisas confunde os dois papéis.
  const destino = caminhoInternoSeguro(req.nextUrl.searchParams.get('redirect'))
  if (destino) {
    res.cookies.set('oauth_next', destino, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  }
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
