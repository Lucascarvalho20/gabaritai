import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/me/enrollments/[courseId]/primary
 *
 * Marca este enrollment como CURSO PRINCIPAL do aluno e DESMARCA todos os
 * outros do mesmo aluno. O curso principal é a base do cronograma e do
 * diagnóstico inicial (Feature 1).
 *
 * Comportamento:
 *  - Aluno pode trocar de principal a qualquer momento.
 *  - Só 1 enrollment isPrimary=true por usuário, garantido aqui.
 *  - Resposta inclui `shouldReDiagnose: true` se o curso nunca teve diagnóstico,
 *    pra UI mostrar modal "Quer fazer o diagnóstico agora?".
 */
export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const userId = auth.user.id

  // Confirma que o enrollment é deste user e está ativo
  const target = await prisma.userCourseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId: params.courseId } },
    select: { id: true, isActive: true, isPrimary: true, lastDiagnosticAt: true },
  })

  if (!target) {
    return NextResponse.json({ message: 'Você não tem esse curso' }, { status: 404 })
  }
  if (!target.isActive) {
    return NextResponse.json({ message: 'Esse curso está inativo. Ative antes de definir como principal.' }, { status: 400 })
  }

  // Já é o principal — no-op
  if (target.isPrimary) {
    return NextResponse.json({
      ok: true,
      noChange: true,
      shouldReDiagnose: target.lastDiagnosticAt == null,
    })
  }

  // Atomic: desmarca todos os outros + marca este (transação)
  await prisma.$transaction([
    prisma.userCourseEnrollment.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.userCourseEnrollment.update({
      where: { userId_courseId: { userId, courseId: params.courseId } },
      data: { isPrimary: true },
    }),
  ])

  return NextResponse.json({
    ok: true,
    shouldReDiagnose: target.lastDiagnosticAt == null,
  })
}
