import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/rate-limit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  const allowed = ['name', 'description', 'priceCents', 'pixDiscount', 'moneyBackDays', 'badge', 'limitTotal', 'features', 'active', 'isVisible', 'sortOrder', 'coverageType', 'coverageData']
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (typeof body.priceCents === 'string') data.priceCents = parseInt(body.priceCents, 10)
  if (typeof data.priceCents === 'number' && data.priceCents < 0) {
    return NextResponse.json({ message: 'priceCents não pode ser negativo' }, { status: 400 })
  }

  // Snapshot anterior pra auditoria de mudança de preço
  const before = await prisma.pricingPlan.findUnique({ where: { id: params.id } })
  if (!before) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

  const updated = await prisma.pricingPlan.update({ where: { id: params.id }, data })

  // Log auditoria se preço mudou (rastreabilidade)
  if (data.priceCents !== undefined && data.priceCents !== before.priceCents) {
    await prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: 'USER_UPDATED_BY_ADMIN', // reusando enum — idealmente criar PRICING_CHANGED
        metadata: {
          kind: 'pricing_plan_price_changed',
          planSlug: before.slug,
          before: before.priceCents,
          after: data.priceCents,
        },
        ip: getClientIp(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  // Soft delete: marca como inativo (preserva relação histórica com pagamentos)
  await prisma.pricingPlan.update({ where: { id: params.id }, data: { active: false, isVisible: false } })
  return NextResponse.json({ ok: true })
}
