import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId') ?? undefined
  const courseSlug = searchParams.get('courseSlug') ?? undefined
  const type = searchParams.get('type') ?? undefined

  let resolvedCourseId = courseId
  if (!resolvedCourseId && courseSlug) {
    const c = await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } })
    resolvedCourseId = c?.id
  }

  const exams = await prisma.mockExam.findMany({
    where: {
      active: true,
      ...(resolvedCourseId && { courseId: resolvedCourseId }),
      ...(type && { type: type as any }),
    },
    select: {
      id: true,
      title: true,
      type: true,
      courseId: true,
      bancaSlug: true,
      subjectId: true,
      totalQuestoes: true,
      durationMin: true,
      hasRedacao: true,
      examFormat: true,
      createdAt: true,
      results: { where: { userId: user.id }, select: { id: true, score: true, finishedAt: true }, take: 1 },
      _count: { select: { results: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ exams })
}
