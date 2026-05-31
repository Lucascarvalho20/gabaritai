import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/courses/[id]
 *
 * Detalhes completos do curso pra tela de edição:
 *   - todos editais (com banca/subjects)
 *   - subjects vinculados via CourseSubject
 *   - estatísticas
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      editais: {
        include: {
          banca: { select: { slug: true, name: true } },
          subjects: {
            select: {
              id: true,
              weight: true,
              expectedQuestions: true,
              subject: { select: { id: true, name: true } },
            },
          },
          _count: { select: { provas: true } },
        },
        orderBy: [{ isActive: 'desc' }, { ano: 'desc' }],
      },
      courseSubjects: {
        include: {
          subject: { select: { id: true, slug: true, name: true } },
        },
      },
      _count: {
        select: {
          enrollments: { where: { isActive: true } },
          studyPlans: true,
        },
      },
    },
  })

  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  return NextResponse.json({ course })
}

/**
 * PATCH /api/admin/courses/[id]
 *
 * Atualiza campos editáveis. Slug pode mudar mas só se não estiver em uso por outro curso.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  const editable = ['name', 'description', 'area', 'uf', 'orgao', 'cargo', 'parentSlug', 'active']
  for (const k of editable) {
    if (body[k] !== undefined) data[k] = body[k]
  }

  if (body.slug !== undefined && typeof body.slug === 'string') {
    const newSlug = body.slug.trim().toLowerCase()
    if (newSlug.length < 3) {
      return NextResponse.json({ message: 'Slug muito curto' }, { status: 400 })
    }
    const conflict = await prisma.course.findFirst({
      where: { slug: newSlug, NOT: { id: params.id } },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json({ message: 'Slug já em uso por outro curso' }, { status: 409 })
    }
    data.slug = newSlug
  }

  if (data.area) {
    const allowedAreas = ['POLICIAL', 'MILITAR', 'BOMBEIRO', 'GUARDA_MUNICIPAL', 'OUTRO']
    if (!allowedAreas.includes(String(data.area).toUpperCase())) {
      return NextResponse.json({ message: 'Área inválida' }, { status: 400 })
    }
    data.area = String(data.area).toUpperCase()
  }

  const before = await prisma.course.findUnique({ where: { id: params.id } })
  if (!before) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const updated = await prisma.course.update({ where: { id: params.id }, data })

  return NextResponse.json({ ok: true, course: updated })
}

/**
 * DELETE /api/admin/courses/[id]
 *
 * Soft delete (active=false) por padrão — preserva matrículas, provas, etc.
 * Hard delete apenas se `?force=true` E não houver dependências (rejeita se tiver).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          enrollments: true,
          editais: true,
          studyPlans: true,
          provas: true,
        },
      },
    },
  })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  if (force) {
    const hasData = course._count.enrollments > 0 || course._count.studyPlans > 0 || course._count.provas > 0
    if (hasData) {
      return NextResponse.json({
        message: 'Curso tem matrículas/planos/provas — não pode ser deletado de vez. Use soft-delete (desativar).',
        counts: course._count,
      }, { status: 409 })
    }
    // Hard delete só se for limpo
    await prisma.course.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true, hardDeleted: true })
  }

  // Soft delete: marca inativo
  await prisma.course.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true, softDeleted: true })
}
