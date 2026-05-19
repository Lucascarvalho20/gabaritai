import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.hasFullAccess === 'boolean') data.hasFullAccess = body.hasFullAccess
  if (typeof body.isBetaTester === 'boolean') data.isBetaTester = body.isBetaTester
  if (typeof body.accessNote === 'string') data.accessNote = body.accessNote
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.plan && Object.values(Plan).includes(body.plan as Plan)) data.plan = body.plan

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, name: true, email: true, role: true, plan: true,
      active: true, hasFullAccess: true, isBetaTester: true, accessNote: true,
    },
  })

  // Se acabou de virar hasFullAccess=true → matricula em todos os cursos
  if (body.hasFullAccess === true) {
    const allCourses = await prisma.course.findMany({ where: { active: true }, select: { id: true } })
    await prisma.userCourseEnrollment.createMany({
      data: allCourses.map((c) => ({
        userId: params.id, courseId: c.id, source: 'ADMIN_GIFT', isActive: true,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  // Soft delete: marca como inativo em vez de deletar (preserva histórico)
  await prisma.user.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
