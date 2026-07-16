import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getUserPlanLimits, getQuestionsUsedToday, TRIAL_LIMITS } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/plan
 *
 * Devolve o status do plano do aluno + uso atual. Usado pelo TrialBanner
 * e por qualquer componente que precise mostrar "X de Y questões hoje".
 *
 * Resposta:
 *   {
 *     plan: { hasPlan, slug, name, isTrial, expiresAt, ... },
 *     trial: {                   // só presente se isTrial=true
 *       daysLeft: number,
 *       questionsToday: number,
 *       dailyQuestionLimit: number,
 *       allowedMockTypes: string[]
 *     }
 *   }
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const limits = await getUserPlanLimits(auth.user.id)

  const base = {
    hasPlan: limits.hasPlan,
    slug: limits.planSlug,
    name: limits.planName,
    coverageType: limits.coverageType,
    maxCourses: limits.maxCourses,
    isTrial: limits.isTrial,
    isBypassed: limits.isBypassed,
    isFree: limits.isFree,
    expiresAt: limits.expiresAt,
  }

  if (!limits.isTrial) {
    return NextResponse.json({ plan: base, trial: null })
  }

  const questionsToday = await getQuestionsUsedToday(auth.user.id)
  const daysLeft = limits.expiresAt
    ? Math.max(0, Math.ceil((limits.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return NextResponse.json({
    plan: base,
    trial: {
      daysLeft,
      questionsToday,
      dailyQuestionLimit: TRIAL_LIMITS.dailyQuestions,
      allowedMockTypes: TRIAL_LIMITS.allowedMockTypes,
    },
  })
}
