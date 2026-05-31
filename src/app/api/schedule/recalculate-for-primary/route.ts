import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { createDefaultStudyPlan } from '@/lib/create-default-study-plan'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/schedule/recalculate-for-primary
 *
 * Recalcula o cronograma do aluno baseado no CURSO PRINCIPAL atual.
 * Usado quando o aluno troca de curso principal e prefere "só recalcular
 * cronograma" em vez de refazer o diagnóstico inicial.
 *
 * Recria o StudyPlan zerando sessões pendentes. Histórico de mastery
 * (UserSubjectMastery) é preservado.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const userId = auth.user.id

  const primaryEnrollment = await prisma.userCourseEnrollment.findFirst({
    where: { userId, isPrimary: true, isActive: true },
    select: { courseId: true, course: { select: { name: true } } },
  })

  if (!primaryEnrollment) {
    return NextResponse.json({ message: 'Sem curso principal ativo' }, { status: 400 })
  }

  // Cronograma cobre TODO o edital — não distorce por fraquezas.
  // Aluno tem "modo turbo" no /dashboard/cronograma se quiser priorizar.
  const result = await createDefaultStudyPlan({
    userId,
    courseId: primaryEnrollment.courseId,
    forceReplace: true,
  })

  if (!result) {
    return NextResponse.json({
      message: `Não consegui montar cronograma pra "${primaryEnrollment.course.name}". Verifique se o curso tem matérias e edital cadastrados.`,
      code: 'PLAN_FAILED',
    }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    studyPlanId: result.studyPlanId,
    sessionsCreated: result.sessionsCreated,
  })
}
