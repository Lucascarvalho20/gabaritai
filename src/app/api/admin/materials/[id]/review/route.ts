import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { MaterialStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/materials/[id]/review
 * Admin revisa um Material (resumo geralmente).
 *
 * Body: { action: 'approve' | 'reject' | 'edit', content?: string, status?: MaterialStatus }
 *  - approve → status=PUBLISHED, reviewedBy=admin, reviewedAt=now
 *  - reject → status=REJECTED
 *  - edit → atualiza content e marca como REVIEWED (não publica direto)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const action = body.action as 'approve' | 'reject' | 'edit' | undefined

  const material = await prisma.material.findUnique({ where: { id: params.id } })
  if (!material) return NextResponse.json({ message: 'Material não encontrado' }, { status: 404 })

  let newStatus: MaterialStatus | undefined
  let newContent: string | undefined

  if (action === 'approve') {
    newStatus = MaterialStatus.PUBLISHED
  } else if (action === 'reject') {
    newStatus = MaterialStatus.REJECTED
  } else if (action === 'edit') {
    newContent = body.content
    newStatus = body.publish ? MaterialStatus.PUBLISHED : MaterialStatus.REVIEWED
  } else if (body.status && Object.values(MaterialStatus).includes(body.status)) {
    newStatus = body.status
  } else {
    return NextResponse.json({ message: 'action ou status obrigatório' }, { status: 400 })
  }

  const updated = await prisma.material.update({
    where: { id: params.id },
    data: {
      ...(newContent !== undefined && { content: newContent }),
      ...(newStatus && { status: newStatus }),
      reviewedAt: new Date(),
      reviewedBy: auth.user.id,
    },
    select: { id: true, status: true, updatedAt: true, title: true },
  })

  return NextResponse.json({ ok: true, material: updated })
}
