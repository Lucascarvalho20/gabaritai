import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/materials/coverage[?courseSlug=...]
 *
 * Retorna cobertura de material publicado por curso/matéria.
 * Usado pelo admin pra saber:
 *  - Quais cursos ainda não têm material gerado em X% dos tópicos
 *  - Quais matérias do edital estão sem material
 *  - Quais matérias têm material só DRAFT, faltando publicar
 *
 * Sem filtro: retorna sumário de TODOS cursos ativos.
 * Com courseSlug: detalha por matéria do edital ativo.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug')

  if (!courseSlug) {
    // Sumário: TODOS os cursos (ativos e inativos) — admin pode revisar qualquer
    const courses = await prisma.course.findMany({
      select: { id: true, slug: true, name: true, area: true, active: true },
      orderBy: { name: 'asc' },
    })

    const result = await Promise.all(
      courses.map(async (c) => {
        const edital = await prisma.edital.findFirst({
          where: { courseId: c.id, isActive: true },
          select: {
            id: true,
            subjects: {
              select: {
                subject: {
                  select: {
                    id: true,
                    topics: {
                      where: { archivedAt: null },
                      select: {
                        id: true,
                        materials: {
                          where: { active: true },
                          select: { status: true, resumo: { select: { id: true } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (!edital) {
          return {
            courseSlug: c.slug,
            courseName: c.name,
            area: c.area,
            active: c.active,
            hasEdital: false,
            totalTopicos: 0,
            comMaterialPublished: 0,
            comMaterialDraft: 0,
            comResumo: 0,
            coverage: 0,
          }
        }

        let total = 0
        let published = 0
        let draft = 0
        let comResumo = 0
        for (const es of edital.subjects) {
          for (const t of es.subject.topics) {
            total++
            const hasPub = t.materials.some((m) => m.status === 'PUBLISHED')
            const hasDraft = t.materials.some((m) => m.status === 'DRAFT')
            const hasResumo = t.materials.some((m) => !!m.resumo)
            if (hasPub) published++
            if (hasDraft) draft++
            if (hasResumo) comResumo++
          }
        }

        return {
          courseSlug: c.slug,
          courseName: c.name,
          area: c.area,
          active: c.active,
          hasEdital: true,
          totalTopicos: total,
          comMaterialPublished: published,
          comMaterialDraft: draft,
          comResumo,
          coverage: total ? Math.round((published / total) * 100) : 0,
        }
      })
    )

    // Sort: cursos com mais conteúdo primeiro
    result.sort((a, b) => {
      if (a.hasEdital !== b.hasEdital) return a.hasEdital ? -1 : 1
      return b.totalTopicos - a.totalTopicos
    })

    return NextResponse.json({ cursos: result, total: courses.length })
  }

  // Detalhe de um curso
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, name: true, slug: true },
  })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const edital = await prisma.edital.findFirst({
    where: { courseId: course.id, isActive: true },
    include: {
      subjects: {
        include: {
          subject: {
            include: {
              topics: {
                where: { archivedAt: null },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
                select: {
                  id: true,
                  name: true,
                  order: true,
                  materials: {
                    where: { active: true },
                    select: {
                      id: true,
                      status: true,
                      updatedAt: true,
                      origin: true,
                      resumo: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!edital) return NextResponse.json({ course, edital: null, materias: [] })

  const materias = edital.subjects.map((es) => {
    const topicos = es.subject.topics.map((t) => {
      const pub = t.materials.find((m) => m.status === 'PUBLISHED')
      const drf = t.materials.find((m) => m.status === 'DRAFT')
      const chosen = pub ?? drf ?? t.materials[0]
      return {
        topicId: t.id,
        name: t.name,
        order: t.order,
        materialId: chosen?.id ?? null,
        status: chosen?.status ?? null,
        origin: chosen?.origin ?? null,
        hasResumo: !!chosen?.resumo,
        updatedAt: chosen?.updatedAt ?? null,
      }
    })
    const total = topicos.length
    const published = topicos.filter((t) => t.status === 'PUBLISHED').length
    return {
      subjectId: es.subject.id,
      slug: es.subject.slug,
      name: es.subject.name,
      ordem: es.order,
      pesoEdital: es.weight,
      totalTopicos: total,
      comMaterialPublished: published,
      coverage: total ? Math.round((published / total) * 100) : 0,
      topicos,
    }
  })

  return NextResponse.json({ course, edital: { id: edital.id, numero: edital.numero }, materias })
}
