import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getVerticalizadoCacheKey } from '@/lib/verticalizado'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/admin/editais/[id]/verticalizado
 * Retorna a análise estratégica atual (do AIGenerationCache).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    include: { course: true, banca: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  const key = getVerticalizadoCacheKey({
    orgao: edital.course.orgao ?? edital.course.name,
    cargo: edital.course.cargo ?? edital.course.name,
    banca: edital.banca?.name,
  })

  const cached = await prisma.aIGenerationCache.findUnique({ where: { cacheKey: key } })

  return NextResponse.json({
    cacheKey: key,
    content: cached?.content ?? null,
    modelUsed: cached?.modelUsed ?? null,
    createdAt: cached?.createdAt ?? null,
    lastUsedAt: cached?.lastUsedAt ?? null,
    hitCount: cached?.hitCount ?? 0,
    course: {
      name: edital.course.name,
      cargo: edital.course.cargo,
      orgao: edital.course.orgao,
    },
    banca: edital.banca?.name ?? null,
  })
}

/**
 * PATCH /api/admin/editais/[id]/verticalizado
 * Body: { content: string }
 * Sobrescreve a análise estratégica com texto manual do admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { content } = await req.json()
  if (typeof content !== 'string' || content.trim().length < 50) {
    return NextResponse.json({ message: 'Conteúdo precisa ter pelo menos 50 caracteres' }, { status: 400 })
  }

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    include: { course: true, banca: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  const key = getVerticalizadoCacheKey({
    orgao: edital.course.orgao ?? edital.course.name,
    cargo: edital.course.cargo ?? edital.course.name,
    banca: edital.banca?.name,
  })

  await prisma.aIGenerationCache.upsert({
    where: { cacheKey: key },
    create: {
      cacheKey: key,
      kind: 'edital_analise',
      content,
      modelUsed: 'admin_edit',
    },
    update: {
      content,
      modelUsed: 'admin_edit',
      createdAt: new Date(), // reset TTL
    },
  })

  return NextResponse.json({ ok: true, cacheKey: key })
}

/**
 * DELETE /api/admin/editais/[id]/verticalizado
 * Apaga o cache, forçando regeneração via IA na próxima request.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    include: { course: true, banca: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  const key = getVerticalizadoCacheKey({
    orgao: edital.course.orgao ?? edital.course.name,
    cargo: edital.course.cargo ?? edital.course.name,
    banca: edital.banca?.name,
  })

  await prisma.aIGenerationCache.deleteMany({ where: { cacheKey: key } })
  return NextResponse.json({ ok: true })
}
