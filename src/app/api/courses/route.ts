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

  // Filtro de edital: por padrão só cursos COM edital ativo aparecem.
  // Admin e ?includeNoEdital=1 veem tudo.
  const includeNoEdital = searchParams.get('includeNoEdital') === '1' || user?.role === 'ADMIN'

  // Filtro de área: por padrão só FOCO ATUAL (policial, militar, bombeiro,
  // guarda municipal). Cursos OUTRO (banco, TJ, CNU, etc.) ficam invisíveis
  // pro público. Admin e ?includeAll=1 enxergam tudo.
  const includeAllAreas = searchParams.get('includeAll') === '1' || user?.role === 'ADMIN'
  const PUBLIC_AREAS = ['POLICIAL', 'MILITAR', 'BOMBEIRO', 'GUARDA_MUNICIPAL'] as const
  const areaFilter = area
    ? { area: area as any }
    : includeAllAreas
      ? {}
      : { area: { in: PUBLIC_AREAS as any } }

  const courses = await prisma.course.findMany({
    where: {
      active: true,
      ...areaFilter,
      ...(uf && { uf }),
      ...(courseIdFilter ?? {}),
      ...(!includeNoEdital && {
        editais: { some: { isActive: true } },
      }),
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
      editais: {
        where: { isActive: true },
        select: { id: true, ano: true, titulo: true },
        take: 1,
      },
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
