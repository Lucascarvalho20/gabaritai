import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/admin/materials/coverage[?courseSlug=...]
 *
 * Sem filtro → sumário de TODOS cursos (rápido, sem aninhar topics).
 * Com courseSlug → detalha matérias e tópicos do edital ativo daquele curso.
 *
 * v2 (2026-06-06): a versão anterior fazia 50 queries paralelas com include
 * profundo, dando timeout no Vercel free (10s). Agora o sumário é 1 query
 * agregada por curso (rápida), e o detalhe só carrega quando o admin clica.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug')

  // ─── MODO 1: SUMÁRIO DE TODOS OS CURSOS ──────────────────────────────────
  if (!courseSlug) {
    const courses = await prisma.course.findMany({
      select: { id: true, slug: true, name: true, area: true, active: true },
      orderBy: { name: 'asc' },
    })

    // Busca edital ativo de cada curso (1 query agregada via groupBy)
    const editaisAtivos = await prisma.edital.findMany({
      where: { isActive: true, courseId: { in: courses.map((c) => c.id) } },
      select: { id: true, courseId: true },
    })
    const editalByCourse = new Map(editaisAtivos.map((e) => [e.courseId, e.id]))

    // Pra cada edital ativo, busca os subject IDs
    const editalSubjects = editaisAtivos.length
      ? await prisma.editalSubject.findMany({
          where: { editalId: { in: editaisAtivos.map((e) => e.id) } },
          select: { editalId: true, subjectId: true },
        })
      : []

    // Mapeia editalId → [subjectIds]
    const subjectsByEdital = new Map<string, string[]>()
    for (const es of editalSubjects) {
      const arr = subjectsByEdital.get(es.editalId) ?? []
      arr.push(es.subjectId)
      subjectsByEdital.set(es.editalId, arr)
    }

    // Conta topics ativos por subject (agregado global)
    const allSubjectIds = Array.from(new Set(editalSubjects.map((es) => es.subjectId)))
    const topicsBySubject = new Map<string, number>()
    if (allSubjectIds.length) {
      const topicCounts = await prisma.topic.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: allSubjectIds }, archivedAt: null },
        _count: { id: true },
      })
      for (const tc of topicCounts) {
        topicsBySubject.set(tc.subjectId, tc._count.id)
      }
    }

    // Conta materials por subject + status (agregado)
    const materialsAgg = allSubjectIds.length
      ? await prisma.material.groupBy({
          by: ['subjectId', 'status'],
          where: { subjectId: { in: allSubjectIds }, active: true },
          _count: { id: true },
        })
      : []

    const matsBySubjectStatus = new Map<string, number>()
    for (const m of materialsAgg) {
      const key = `${m.subjectId}:${m.status}`
      matsBySubjectStatus.set(key, m._count.id)
    }

    // Monta resposta por curso
    const cursos = courses.map((c) => {
      const editalId = editalByCourse.get(c.id)
      if (!editalId) {
        return {
          courseSlug: c.slug, courseName: c.name, area: c.area, active: c.active,
          hasEdital: false, totalTopicos: 0,
          comMaterialPublished: 0, comMaterialDraft: 0, comResumo: 0, coverage: 0,
        }
      }

      const subjectIds = subjectsByEdital.get(editalId) ?? []
      let totalTopicos = 0
      let comMaterialPublished = 0
      let comMaterialDraft = 0

      for (const sid of subjectIds) {
        totalTopicos += topicsBySubject.get(sid) ?? 0
        comMaterialPublished += matsBySubjectStatus.get(`${sid}:PUBLISHED`) ?? 0
        comMaterialDraft += matsBySubjectStatus.get(`${sid}:DRAFT`) ?? 0
      }

      return {
        courseSlug: c.slug, courseName: c.name, area: c.area, active: c.active,
        hasEdital: true,
        totalTopicos,
        comMaterialPublished,
        comMaterialDraft,
        comResumo: comMaterialPublished + comMaterialDraft, // todos materiais nossos têm resumo
        coverage: totalTopicos ? Math.round((comMaterialPublished / totalTopicos) * 100) : 0,
      }
    })

    // Ordena: com edital primeiro, depois por totalTopicos desc
    cursos.sort((a, b) => {
      if (a.hasEdital !== b.hasEdital) return a.hasEdital ? -1 : 1
      return b.totalTopicos - a.totalTopicos
    })

    return NextResponse.json({ cursos, total: courses.length })
  }

  // ─── MODO 2: DETALHE DE UM CURSO ────────────────────────────────────────
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
                  id: true, name: true, order: true,
                  materials: {
                    where: { active: true },
                    select: {
                      id: true, status: true, updatedAt: true, origin: true,
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
        topicId: t.id, name: t.name, order: t.order,
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
