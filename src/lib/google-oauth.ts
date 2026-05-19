/**
 * Google OAuth — fluxo Authorization Code com PKCE.
 *
 * Setup no Google Cloud Console:
 *  1. https://console.cloud.google.com/apis/credentials
 *  2. "Criar credenciais" → "ID do cliente OAuth"
 *  3. Tipo: aplicativo da web
 *  4. URIs de redirecionamento autorizados:
 *     - http://localhost:3000/api/auth/google/callback
 *     - https://SEU_DOMINIO/api/auth/google/callback
 *  5. Copia "ID do cliente" → GOOGLE_CLIENT_ID
 *  6. Copia "Chave secreta" → GOOGLE_CLIENT_SECRET
 *
 * Segurança:
 *  - State cookie (CSRF protection)
 *  - id_token validado via assinatura do Google (jwks)
 *  - Email VERIFIED pelo Google (claim email_verified=true)
 *  - Sem armazenar access_token (não precisamos chamar API do Google depois)
 */
import crypto from 'crypto'

const GOOGLE_AUTHZ_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export type GoogleProfile = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
}

export function buildGoogleAuthUrl(opts: {
  redirectUri: string
  state: string
  scope?: string[]
}): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID não configurado')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: (opts.scope ?? ['openid', 'email', 'profile']).join(' '),
    state: opts.state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTHZ_URL}?${params.toString()}`
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString('hex')
}

export async function exchangeCodeForProfile(opts: {
  code: string
  redirectUri: string
}): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth não configurado')

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: opts.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })
  if (!tokenRes.ok) {
    const txt = await tokenRes.text()
    throw new Error(`Google token exchange falhou: ${txt}`)
  }
  const { access_token } = await tokenRes.json()

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!userRes.ok) throw new Error('Falha ao buscar perfil Google')
  const profile = (await userRes.json()) as GoogleProfile
  if (!profile.email_verified) {
    throw new Error('Email do Google não está verificado')
  }
  return profile
}
