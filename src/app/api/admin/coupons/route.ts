import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })
  return NextResponse.json({ coupons })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { code, description, type, value, minAmountCents, appliesToPlans, maxUses, maxPerUser, validFrom, validUntil } = body

  if (!code || !value) {
    return NextResponse.json({ message: 'code e value obrigatórios' }, { status: 400 })
  }
  if (type === 'PERCENT' && (value < 1 || value > 100)) {
    return NextResponse.json({ message: 'percent deve ser 1-100' }, { status: 400 })
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description ?? null,
        type: type ?? 'PERCENT',
        value: parseInt(value, 10),
        minAmountCents: minAmountCents ? parseInt(minAmountCents, 10) : null,
        appliesToPlans: appliesToPlans ?? null,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        maxPerUser: maxPerUser ? parseInt(maxPerUser, 10) : 1,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        createdById: auth.user.id,
      },
    })
    return NextResponse.json({ coupon })
  } catch (err: any) {
    if (err.message?.includes('Unique constraint')) {
      return NextResponse.json({ message: 'Código já existe' }, { status: 409 })
    }
    return apiError(err, 'Falha ao criar cupom', 'admin-coupons-create')
  }
}
