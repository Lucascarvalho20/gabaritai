import { NextRequest } from 'next/server'
import { verifyToken } from './jwt'
import { prisma } from './prisma'

/**
 * Extrai o usuário autenticado do header Authorization Bearer.
 * Retorna null se faltar token / inválido / usuário não existir.
 *
 * IMPORTANTE: o login atual cria tokens com `sub` = id do demo-user,
 * que pode NÃO existir no banco. Por isso este helper retorna o usuário
 * real do banco — telas reais devem usar o login NestJS ou migrar pra cá.
 *
 * Para o cronograma: o `sub` precisa ser o user.id do banco. O seed cria
 * admin@gabaritai.com.br, teste1..4@gabaritai.com.br — esses funcionam.
 */
export async function getUserFromRequest(req: NextRequest) {
  // Tenta cookie httpOnly primeiro (mais seguro), depois Authorization Bearer (compat)
  let token: string | null = null
  const cookieToken = req.cookies.get('gabaritai_token')?.value
  if (cookieToken) {
    token = cookieToken
  } else {
    const auth = req.headers.get('authorization')
    if (auth?.startsWith('Bearer ')) token = auth.slice(7)
  }
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload?.sub) return null

  // Tenta achar pelo sub direto. Se não achar, tenta pelo email.
  const sub = String(payload.sub)
  const email = payload.email ? String(payload.email) : null

  const user = await prisma.user.findFirst({
    where: { OR: [{ id: sub }, ...(email ? [{ email }] : [])] },
    select: { id: true, email: true, name: true, role: true, plan: true },
  })
  return user
}

/**
 * Mesmo que getUserFromRequest mas exige role=ADMIN.
 * Retorna { user, error } — se error, é um NextResponse pronto pra ser retornado.
 */
export async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return { user: null, status: 401, message: 'Não autenticado' }
  if (user.role !== 'ADMIN') return { user: null, status: 403, message: 'Acesso negado' }
  return { user, status: 200, message: 'OK' }
}

