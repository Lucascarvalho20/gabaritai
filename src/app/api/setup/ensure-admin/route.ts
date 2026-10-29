import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkSetupAuth } from '@/lib/setup-auth'

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
 * Exige `Authorization: Bearer <SETUP_SECRET>`. Sem SETUP_SECRET configurado o
 * endpoint fica desativado (503) — ver src/lib/setup-auth.ts para o porquê.
 *
 * Body opcional:
 *   { email?: string, password?: string }
 * (default: ADMIN_EMAIL e ADMIN_PASSWORD do env)
 */
export async function POST(req: NextRequest) {
  const auth = checkSetupAuth(req)
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''

  let bodyEmail: string | undefined
  let bodyPassword: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    bodyEmail = body?.email ? String(body.email).toLowerCase().trim() : undefined
    bodyPassword = body?.password ? String(body.password) : undefined
  } catch {}

  const finalEmail = bodyEmail ?? adminEmail
  const finalPassword = bodyPassword ?? adminPassword

  if (!finalEmail || !finalPassword) {
    return NextResponse.json({
      message: 'Informe email e password no body, ou configure ADMIN_EMAIL e ADMIN_PASSWORD.',
    }, { status: 400 })
  }
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
