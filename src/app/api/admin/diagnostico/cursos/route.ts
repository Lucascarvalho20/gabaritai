import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/diagnostico/cursos
 *
 * Lista cursos ativos com:
 *  - tem edital ativo?
 *  - quantas matérias no edital?
 *  - tamanho do pool de diagnóstico (Question com tag diagnostico-pool:slug, active)
 *  - quando foi gerado pela última vez
 *  - quantos alunos já fizeram diagnóstico desse curso
 *
 * Usado pela tela /admin/diagnostico pra admin decidir onde rodar a geração.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const courses = await prisma.course.findMany({
    where: { active: true },
    select: {
      id: true, slug: true, name: true, orgao: true, cargo: true, parentSlug: true, area: true,
      editais: {
        where: { isActive: true },
        select: {
          id: true, ano: true, titulo: true,
          banca: { select: { slug: true, name: true } },
          subjects: { select: { subjectId: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ parentSlug: 'asc' }, { name: 'asc' }],
  })

  // Pra cada curso, conta questões do pool + último createdAt
  const results = await Promise.all(courses.map(async (c) => {
    const tag = `diagnostico-pool:${c.slug}`
    const [poolCount, lastGenerated, diagsFeitos] = await Promise.all([
      prisma.question.count({
        where: { tags: { has: tag }, active: true, anulada: false },
      }),
      prisma.question.findFirst({
        where: { tags: { has: tag } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.userCourseEnrollment.count({
        where: { courseId: c.id, lastDiagnosticAt: { not: null } },
      }),
    ])

    const edital = c.editais[0] ?? null
    return {
      courseId: c.id,
      slug: c.slug,
      name: c.name,
      orgao: c.orgao,
      cargo: c.cargo,
      parentSlug: c.parentSlug,
      area: c.area,
      edital: edital ? {
        id: edital.id, ano: edital.ano, titulo: edital.titulo,
        banca: edital.banca,
        materiasCount: edital.subjects.length,
      } : null,
      pool: {
        size: poolCount,
        lastGeneratedAt: lastGenerated?.createdAt ?? null,
        complete: poolCount >= 40,
      },
      stats: {
        alunosDiagnosticados: diagsFeitos,
      },
    }
  }))

  return NextResponse.json({ cursos: results })
}
