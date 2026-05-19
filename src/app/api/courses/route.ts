import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const area = searchParams.get('area') ?? undefined
  const uf = searchParams.get('uf') ?? undefined
  const showAll = searchParams.get('all') === 'true' // public catalog

  // Usuário autenticado pode ver:
  //   - se ADMIN ou hasFullAccess → tudo
  //   - senão → apenas cursos em que está matriculado
  // Catálogo público (?all=true ou não autenticado) → tudo (pra landing/vitrine)
  const user = await getUserFromRequest(req).catch(() => null)

  let courseIdFilter: { id: { in: string[] } } | undefined
  if (user && !showAll && user.role !== 'ADMIN') {
    // Não admin: precisa buscar hasFullAccess
    const full = await prisma.user.findUnique({ where: { id: user.id }, select: { hasFullAccess: true } })
    if (!full?.hasFullAccess) {
      const enrollments = await prisma.userCourseEnrollment.findMany({
        where: { userId: user.id, isActive: true },
        select: { courseId: true },
      })
      courseIdFilter = { id: { in: enrollments.map((e) => e.courseId) } }
    }
  }

  const courses = await prisma.course.findMany({
    where: {
      active: true,
      ...(area && { area: area as any }),
      ...(uf && { uf }),
      ...(courseIdFilter ?? {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      area: true,
      uf: true,
      orgao: true,
      cargo: true,
      parentSlug: true,
      _count: { select: { courseSubjects: true, editais: true } },
    },
    orderBy: [{ orgao: 'asc' }, { cargo: 'asc' }, { name: 'asc' }],
  })

  // Agrupa por parentSlug (cursos do mesmo concurso pai)
  const groupsMap = new Map<string, typeof courses>()
  for (const c of courses) {
    const key = c.parentSlug ?? c.slug
    if (!groupsMap.has(key)) groupsMap.set(key, [])
    groupsMap.get(key)!.push(c)
  }
  const groups = Array.from(groupsMap.entries()).map(([parentSlug, cursos]) => ({
    parentSlug,
    orgao: cursos[0].orgao,
    area: cursos[0].area,
    uf: cursos[0].uf,
    label: cursos[0].orgao ?? cursos[0].name.split('—')[0].trim(),
    cargos: cursos,
  }))

  return NextResponse.json({ courses, groups })
}
