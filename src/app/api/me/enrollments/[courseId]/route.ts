import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { canActivateCourse, getUserPlanLimits } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/enrollments/[courseId]  → ativar curso (com check de limite)
 * DELETE /api/me/enrollments/[courseId] → desativar curso (libera vaga)
 *
 * Ativação cria a enrollment se não existir, ou marca isActive=true se já
 * existia (preservando progresso). Bloqueia amigavelmente se o aluno
 * passar do limite do plano, com payload sugerindo upgrade.
 *
 * Desativação só faz toggle de isActive — preserva progresso PERMANENTE
 * (regra confirmada pelo owner). Aluno pode reativar quando quiser, sem
 * perda.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const courseId = params.courseId

  // Curso existe e está ativo?
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true, name: true, active: true },
  })
  if (!course || !course.active) {
    return NextResponse.json({ message: 'Curso não encontrado ou desativado' }, { status: 404 })
  }

  // Check de limite
  const check = await canActivateCourse(auth.user.id, courseId)
  if (!check.ok) {
    return NextResponse.json(
      {
        message: check.reason,
        limit: { current: check.current, max: check.max, upgradeTo: check.upgradeTo },
      },
      { status: 403 },
    )
  }

  // Pega expiresAt do plano ativo pra propagar pra enrollment
  const limits = await getUserPlanLimits(auth.user.id)

  // Se é o PRIMEIRO enrollment ativo do user, marca como principal automaticamente
  const hasOtherPrimary = await prisma.userCourseEnrollment.count({
    where: { userId: auth.user.id, isPrimary: true },
  })
  const shouldMarkPrimary = hasOtherPrimary === 0

  // Upsert: cria nova ou ativa existente
  const enrollment = await prisma.userCourseEnrollment.upsert({
    where: { userId_courseId: { userId: auth.user.id, courseId } },
    update: {
      isActive: true,
      // se não tinha expiresAt mas o plano tem, propaga
      expiresAt: limits.expiresAt ?? undefined,
      ...(shouldMarkPrimary && { isPrimary: true }),
    },
    create: {
      userId: auth.user.id,
      courseId,
      isActive: true,
      isPrimary: shouldMarkPrimary,
      source: 'SELF_ACTIVATED',
      expiresAt: limits.expiresAt,
    },
    select: {
      id: true, isActive: true, isPrimary: true, enrolledAt: true, expiresAt: true,
    },
  })

  return NextResponse.json({
    ok: true,
    enrollment,
    course: { id: course.id, slug: course.slug, name: course.name },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const courseId = params.courseId

  // Existe enrollment?
  const enrollment = await prisma.userCourseEnrollment.findUnique({
    where: { userId_courseId: { userId: auth.user.id, courseId } },
    select: { id: true, isActive: true },
  })
  if (!enrollment) {
    return NextResponse.json({ message: 'Você não está matriculado nesse curso' }, { status: 404 })
  }
  if (!enrollment.isActive) {
    return NextResponse.json({ ok: true, alreadyInactive: true })
  }

  await prisma.userCourseEnrollment.update({
    where: { id: enrollment.id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
