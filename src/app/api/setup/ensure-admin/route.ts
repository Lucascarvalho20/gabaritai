import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/ensure-admin
 *
 * Garante que o usuário admin existe com role=ADMIN, ativo, sem lockout e
 * com a senha configurada em ADMIN_PASSWORD (ou no body como fallback).
 *
 * IDEMPOTENTE. Se admin existe, RESETA a senha + role + ativa + desbloqueia.
 * Se não existe, CRIA.
 *
 * Protegido por SETUP_SECRET env var: quem chamar precisa enviar
 * `Authorization: Bearer <SETUP_SECRET>`. Se SETUP_SECRET não estiver setado,
 * aceita o próprio ADMIN_PASSWORD como fallback (admin obviamente conhece).
 *
 * Body opcional:
 *   { email?: string, password?: string }
 * (default: ADMIN_EMAIL e ADMIN_PASSWORD do env)
 */
export async function POST(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@gabaritai.com.br').toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@2024!'

  // Auth: aceita SETUP_SECRET OU ADMIN_PASSWORD como bearer (admin obviamente sabe)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const okSecret = setupSecret && bearer === setupSecret
  const okAdminPass = bearer === adminPassword
  if (!okSecret && !okAdminPass) {
    return NextResponse.json({
      message: 'Não autorizado. Envie Authorization: Bearer <SETUP_SECRET> ou <ADMIN_PASSWORD>.',
    }, { status: 401 })
  }

  let bodyEmail: string | undefined
  let bodyPassword: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    bodyEmail = body?.email ? String(body.email).toLowerCase().trim() : undefined
    bodyPassword = body?.password ? String(body.password) : undefined
  } catch {}

  const finalEmail = bodyEmail ?? adminEmail
  const finalPassword = bodyPassword ?? adminPassword
  const passwordHash = await bcrypt.hash(finalPassword, 12)

  const existing = await prisma.user.findUnique({
    where: { email: finalEmail },
    select: { id: true, role: true, active: true, lockedUntil: true },
  })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: passwordHash,
        role: 'ADMIN',
        active: true,
        emailVerified: true,
        failedLoginCount: 0,
        lockedUntil: null,
        hasFullAccess: true,
      },
    })
    return NextResponse.json({
      ok: true,
      action: 'reset',
      email: finalEmail,
      message: 'Admin existente — senha resetada, role/ativo garantidos.',
    })
  }

  const created = await prisma.user.create({
    data: {
      name: 'Admin Gabaritai',
      email: finalEmail,
      password: passwordHash,
      role: 'ADMIN',
      plan: 'LIFETIME',
      active: true,
      emailVerified: true,
      hasFullAccess: true,
      profile: { create: { nivel: 'avancado', horasDia: '8' } },
    },
    select: { id: true, email: true, role: true },
  })

  return NextResponse.json({
    ok: true,
    action: 'created',
    email: created.email,
    message: 'Admin criado com sucesso.',
  })
}
