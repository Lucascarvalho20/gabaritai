import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/leads/recent[?limit=20]
 *
 * Retorna últimos leads capturados pra diagnóstico de email.
 * Mostra: email, source, courseSlug/parentSlug, createdAt.
 *
 * Usado pra confirmar se o formulário da home está realmente chegando
 * no banco (descarta problema de frontend) e pra correlacionar com os
 * logs do Vercel sobre envio de email.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      email: true,
      source: true,
      context: true,
      courseSlug: true,
      parentSlug: true,
      createdAt: true,
    },
  })

  const totalLeads = await prisma.lead.count()
  const last24h = await prisma.lead.count({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })

  return NextResponse.json({
    leads,
    stats: { totalLeads, last24h },
    note: 'Se aparecer aqui, o form da home funcionou e gravou no banco. Se o email não chegou mesmo assim, problema está no pipeline de envio (renderEditalEmail ou sendEmail). Veja logs do Vercel.',
  })
}
