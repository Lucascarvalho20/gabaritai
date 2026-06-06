import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/materials/debug
 *
 * Endpoint de diagnóstico — retorna contagens brutas pra entender se
 * Materials/Topics estão chegando no banco corretamente.
 *
 * Saída esperada (depois de rodar os 4 SQLs no Supabase):
 *   {
 *     totalCourses, activeCourses,
 *     totalSubjects,
 *     totalTopics, topicsAtivos,
 *     totalMaterials, materialsDraft, materialsPublished,
 *     totalResumos,
 *     sampleSubjectsWithTopics: [...],
 *     sampleMaterials: [...],
 *   }
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const [
    totalCourses,
    activeCourses,
    totalSubjects,
    totalTopics,
    topicsAtivos,
    totalMaterials,
    materialsDraft,
    materialsPublished,
    totalResumos,
    sampleMaterials,
    subjectsComTopics,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { active: true } }),
    prisma.subject.count(),
    prisma.topic.count(),
    prisma.topic.count({ where: { archivedAt: null } }),
    prisma.material.count(),
    prisma.material.count({ where: { status: 'DRAFT' } }),
    prisma.material.count({ where: { status: 'PUBLISHED' } }),
    prisma.materialResumo.count(),
    prisma.material.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, origin: true,
        subject: { select: { slug: true, name: true } },
        topic: { select: { name: true } },
        resumo: { select: { id: true } },
      },
    }),
    prisma.subject.findMany({
      where: {
        slug: {
          in: [
            'direito-constitucional', 'direito-administrativo',
            'direito-penal', 'direito-processual-penal',
            'lingua-portuguesa', 'informatica', 'raciocinio-logico',
            'direitos-humanos', 'direito-penal-militar',
          ],
        },
      },
      select: {
        slug: true, name: true,
        _count: { select: { topics: true } },
      },
      orderBy: { slug: 'asc' },
    }),
  ])

  return NextResponse.json({
    counts: {
      totalCourses,
      activeCourses,
      totalSubjects,
      totalTopics,
      topicsAtivos,
      totalMaterials,
      materialsDraft,
      materialsPublished,
      totalResumos,
    },
    sampleMaterials,
    subjectsComTopics,
    deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  })
}
