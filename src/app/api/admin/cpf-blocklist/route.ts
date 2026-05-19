import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isValidCpf, hashCpf } from '@/lib/cpf'
import { telegramCpfBanned } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const list = await prisma.cpfBlocklist.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ blocklist: list })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { cpf, reason } = await req.json()
  if (!cpf || !isValidCpf(cpf)) {
    return NextResponse.json({ message: 'CPF inválido' }, { status: 400 })
  }
  const cpfHash = hashCpf(cpf)

  const entry = await prisma.cpfBlocklist.upsert({
    where: { cpfHash },
    update: { reason: reason ?? null, bannedById: auth.user.id },
    create: { cpfHash, reason: reason ?? null, bannedById: auth.user.id },
  })

  // Desativa qualquer user existente com esse CPF
  await prisma.user.updateMany({ where: { cpfHash }, data: { active: false } })

  // Notifica admin no Telegram
  telegramCpfBanned({
    reason: reason ?? null,
    bannedBy: auth.user.email ?? auth.user.id,
  }).catch(() => {})

  return NextResponse.json({ ok: true, id: entry.id })
}
