import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads
 *
 * Captura email pra mailing list (sem precisar de cadastro completo).
 * Usado por lead magnets — "baixe o edital verticalizado", "receba aviso
 * de edital novo", etc.
 *
 * Body: { email, source, context?, courseSlug?, parentSlug? }
 *
 * Idempotente: se o mesmo email + source já existe, devolve ok=true e
 * NÃO cria duplicata (apenas atualiza context se vier diferente). Isso
 * evita o concurseiro spammar o form e poluir o banco.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 })
  }

  const emailRaw = String(body.email ?? '').trim().toLowerCase()
  const source = String(body.source ?? '').trim()

  if (!emailRaw || !source) {
    return NextResponse.json({ message: 'email e source obrigatórios' }, { status: 400 })
  }
  // Regex simples — não bate todas as edge cases mas elimina 99% do lixo
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ message: 'Email inválido' }, { status: 400 })
  }

  // Hash do IP (não guarda o IP cru — privacidade)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null

  // Procura lead existente (mesmo email + source) pra idempotência
  const existing = await prisma.lead.findFirst({
    where: { email: emailRaw, source },
  })

  if (existing) {
    // Atualiza context/courseSlug se vier informação nova
    if (body.context || body.courseSlug || body.parentSlug) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          context: body.context ?? existing.context,
          courseSlug: body.courseSlug ?? existing.courseSlug,
          parentSlug: body.parentSlug ?? existing.parentSlug,
        },
      })
    }
    return NextResponse.json({ ok: true, alreadyExists: true })
  }

  await prisma.lead.create({
    data: {
      email: emailRaw,
      source,
      context: body.context ?? null,
      courseSlug: body.courseSlug ?? null,
      parentSlug: body.parentSlug ?? null,
      ipHash,
      userAgent,
    },
  })

  return NextResponse.json({ ok: true })
}
