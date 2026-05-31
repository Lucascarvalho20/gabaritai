import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getUserPlanLimits, getActiveCourseCount } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/enrollments
 *
 * Lista TODOS os enrollments do aluno (ativos + inativos), com info
 * suficiente pra UI montar a tela de gerenciamento de cursos:
 *   - cursos ativos: aluno está estudando
 *   - cursos inativos: aluno já cancelou (ou nunca ativou) mas pode
 *     reativar
 *
 * Retorna também os LIMITES do plano (maxCourses, planName, etc.) pra
 * UI saber se aluno pode ativar mais um.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const userId = auth.user.id

  const [enrollments, limits, activeCount] = await Promise.all([
    prisma.userCourseEnrollment.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { lastStudyAt: 'desc' }, { enrolledAt: 'desc' }],
      include: {
        course: {
          select: {
            id: true, slug: true, name: true, cargo: true, orgao: true, uf: true,
            parentSlug: true, area: true, description: true,
            editais: {
              where: { isActive: true },
              select: { id: true, ano: true, titulo: true, dataProva: true, totalQuestoes: true },
              take: 1,
            },
          },
        },
      },
    }),
    getUserPlanLimits(userId),
    getActiveCourseCount(userId),
  ])

  const enriched = enrollments.map((e) => ({
    id: e.id,
    courseId: e.course.id,
    courseSlug: e.course.slug,
    courseName: e.course.name,
    cargo: e.course.cargo,
    orgao: e.course.orgao,
    uf: e.course.uf,
    parentSlug: e.course.parentSlug,
    area: e.course.area,
    description: e.course.description,
    isActive: e.isActive,
    isPrimary: e.isPrimary,
    lastDiagnosticAt: e.lastDiagnosticAt,
    enrolledAt: e.enrolledAt,
    lastStudyAt: e.lastStudyAt,
    progress: e.progress,
    expiresAt: e.expiresAt,
    activeEdital: e.course.editais[0] ?? null,
  }))

  return NextResponse.json({
    enrollments: enriched,
    plan: {
      hasPlan: limits.hasPlan,
      slug: limits.planSlug,
      name: limits.planName,
      coverageType: limits.coverageType,
      maxCourses: limits.maxCourses,
      isBypassed: limits.isBypassed,
      expiresAt: limits.expiresAt,
    },
    usage: {
      activeCount,
      maxCourses: limits.maxCourses,
      canActivateMore: limits.isBypassed
        ? true
        : limits.maxCourses == null
          ? true
          : activeCount < limits.maxCourses,
    },
  })
}
