import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/courses
 *
 * Lista todos os cursos com contagens úteis pro painel admin:
 *   - alunos matriculados (ativos)
 *   - quantos editais cadastrados
 *   - se tem edital atual em vigor (isActive=true)
 *   - banca do edital atual
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const courses = await prisma.course.findMany({
    orderBy: [{ active: 'desc' }, { area: 'asc' }, { name: 'asc' }],
    include: {
      editais: {
        select: {
          id: true, titulo: true, ano: true, isActive: true, status: true,
          banca: { select: { slug: true, name: true } },
        },
        orderBy: [{ isActive: 'desc' }, { ano: 'desc' }],
      },
      _count: {
        select: {
          enrollments: { where: { isActive: true } },
          editais: true,
          studyPlans: true,
        },
      },
    },
  })

  return NextResponse.json({
    courses: courses.map((c) => {
      const editalAtual = c.editais.find((e) => e.isActive) ?? c.editais[0] ?? null
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        area: c.area,
        uf: c.uf,
        orgao: c.orgao,
        cargo: c.cargo,
        parentSlug: c.parentSlug,
        active: c.active,
        createdAt: c.createdAt,
        alunos: c._count.enrollments,
        editaisCount: c._count.editais,
        studyPlansCount: c._count.studyPlans,
        editalAtual: editalAtual && {
          id: editalAtual.id,
          titulo: editalAtual.titulo,
          ano: editalAtual.ano,
          isActive: editalAtual.isActive,
          status: editalAtual.status,
          banca: editalAtual.banca,
        },
      }
    }),
  })
}

/**
 * POST /api/admin/courses
 *
 * Cria curso completo (sem precisar de edital — admin pode subir edital depois).
 * Body: { name, slug?, description?, area?, uf?, orgao?, cargo?, parentSlug?, active? }
 *
 * Slug é auto-gerado se não fornecido. Garantido único.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { name, slug: providedSlug, description, area, uf, orgao, cargo, parentSlug, active } = body

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return NextResponse.json({ message: 'Nome do curso obrigatório (mín 3 chars)' }, { status: 400 })
  }

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  let slug = providedSlug ? slugify(providedSlug) : slugify(name)
  let attempt = 0
  while (await prisma.course.findUnique({ where: { slug } })) {
    attempt++
    slug = `${slugify(providedSlug ?? name)}-${attempt}`
    if (attempt > 20) {
      return NextResponse.json({ message: 'Não consegui gerar slug único' }, { status: 500 })
    }
  }

  const allowedAreas = ['POLICIAL', 'MILITAR', 'BOMBEIRO', 'GUARDA_MUNICIPAL', 'OUTRO']
  const areaSafe = allowedAreas.includes(String(area).toUpperCase())
    ? (String(area).toUpperCase() as any)
    : 'POLICIAL'

  const course = await prisma.course.create({
    data: {
      slug,
      name: name.trim(),
      description: description ?? null,
      cargo: cargo ?? null,
      orgao: orgao ?? null,
      area: areaSafe,
      uf: uf ?? null,
      parentSlug: parentSlug ?? null,
      active: active !== false,
    },
  })

  return NextResponse.json({ ok: true, course })
}
