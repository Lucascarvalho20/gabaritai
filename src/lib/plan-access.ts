/**
 * Lógica de controle de acesso baseado no plano do aluno.
 *
 * Resolve 3 perguntas que aparecem em vários lugares do produto:
 *   1. Qual o plano ativo deste aluno?
 *   2. Quantos cursos ele pode ter ativos simultaneamente?
 *   3. Esse aluno pode ativar mais um curso, ou bateu no limite?
 *
 * Fonte da verdade: último Payment com status PAID e expiresAt > now()
 * → referencia o PricingPlan, que tem coverageType + maxCourses.
 *
 * Exceções:
 *   - User.hasFullAccess = true → bypassa tudo (admin/beta/cortesia)
 *   - User.isBetaTester = true → mesmo bypass
 *   - User.role = 'ADMIN' → mesmo bypass
 */

import { prisma } from '@/lib/prisma'

export type PlanLimits = {
  hasPlan: boolean
  planSlug: string | null
  planName: string | null
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL' | null
  maxCourses: number | null       // null = ilimitado
  expiresAt: Date | null
  isBypassed: boolean             // admin/beta/full access
  reason?: string                 // texto descritivo
}

export type ActivationCheck =
  | { ok: true }
  | { ok: false; reason: string; current: number; max: number | null; upgradeTo?: string }

/**
 * Retorna o plano ativo + limites do aluno. Sempre devolve um objeto —
 * usuário sem plano paga retorna hasPlan=false.
 */
export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, hasFullAccess: true, isBetaTester: true },
  })

  if (!user) {
    return {
      hasPlan: false, planSlug: null, planName: null,
      coverageType: null, maxCourses: 0, expiresAt: null,
      isBypassed: false, reason: 'Usuário não encontrado',
    }
  }

  // Bypass: admin, beta, ou cortesia
  if (user.role === 'ADMIN' || user.hasFullAccess || user.isBetaTester) {
    return {
      hasPlan: true,
      planSlug: 'admin-bypass',
      planName: user.role === 'ADMIN' ? 'Admin' : user.hasFullAccess ? 'Acesso completo (cortesia)' : 'Beta Tester',
      coverageType: 'ALL',
      maxCourses: null, // ilimitado
      expiresAt: null,
      isBypassed: true,
    }
  }

  // Pega o pagamento ativo mais recente (APPROVED + não expirado)
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      status: 'APPROVED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { paidAt: 'desc' },
    select: {
      pricingPlanId: true,
      pricingPlanSlug: true,
      expiresAt: true,
    },
  })

  if (!payment) {
    return {
      hasPlan: false,
      planSlug: null,
      planName: null,
      coverageType: null,
      maxCourses: 0,
      expiresAt: null,
      isBypassed: false,
      reason: 'Sem plano ativo',
    }
  }

  // Resolve o PricingPlan
  let plan = null
  if (payment.pricingPlanId) {
    plan = await prisma.pricingPlan.findUnique({
      where: { id: payment.pricingPlanId },
      select: {
        slug: true, name: true,
        coverageType: true, maxCourses: true,
      },
    })
  }

  // Fallback: se PricingPlan foi deletado mas o slug ainda existe no payment
  if (!plan && payment.pricingPlanSlug) {
    plan = await prisma.pricingPlan.findUnique({
      where: { slug: payment.pricingPlanSlug },
      select: {
        slug: true, name: true,
        coverageType: true, maxCourses: true,
      },
    })
  }

  if (!plan) {
    return {
      hasPlan: false, planSlug: null, planName: null,
      coverageType: null, maxCourses: 0, expiresAt: payment.expiresAt,
      isBypassed: false, reason: 'Plano do pagamento não encontrado',
    }
  }

  return {
    hasPlan: true,
    planSlug: plan.slug,
    planName: plan.name,
    coverageType: plan.coverageType,
    maxCourses: plan.maxCourses,
    expiresAt: payment.expiresAt,
    isBypassed: false,
  }
}

/**
 * Conta quantas enrollments ATIVAS o usuário tem.
 */
export async function getActiveCourseCount(userId: string): Promise<number> {
  return prisma.userCourseEnrollment.count({
    where: { userId, isActive: true },
  })
}

/**
 * Checa se o usuário pode ativar mais um curso.
 * Use ANTES de ativar — devolve uma mensagem amigável se não puder.
 *
 * Casos:
 *  - ok=true: pode ativar. Backend deve criar/ativar a enrollment.
 *  - ok=false: bateu no limite. UI deve mostrar a razão + sugerir upgrade.
 *
 * Se o aluno já tem o curso ativo (re-ativando algo que já está on),
 * passa direto — não conta como "nova ativação".
 */
export async function canActivateCourse(
  userId: string,
  courseId: string,
): Promise<ActivationCheck> {
  const limits = await getUserPlanLimits(userId)

  if (!limits.hasPlan) {
    return {
      ok: false,
      reason: 'Você ainda não tem um plano ativo. Assine pra ativar cursos.',
      current: 0,
      max: 0,
      upgradeTo: 'mensal-1-curso',
    }
  }

  // Bypass: admin/full access pode tudo
  if (limits.isBypassed) return { ok: true }

  // Já está ativo? Re-ativação não conta no limite — apenas confirma
  const existing = await prisma.userCourseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { isActive: true },
  })
  if (existing?.isActive) return { ok: true }

  // Conta cursos ativos hoje
  const activeCount = await getActiveCourseCount(userId)

  // Sem maxCourses (ilimitado) ou ainda tem espaço
  if (limits.maxCourses == null || activeCount < limits.maxCourses) {
    return { ok: true }
  }

  // Bateu no limite — sugere upgrade
  const upgradeTo = suggestUpgrade(limits.planSlug)
  return {
    ok: false,
    reason: `Você está usando o limite do plano ${limits.planName ?? ''} (${activeCount} de ${limits.maxCourses} cursos ativos). Pra ativar mais, faça upgrade.`,
    current: activeCount,
    max: limits.maxCourses,
    upgradeTo,
  }
}

/**
 * Mapeia plan slug → próximo plano mais próximo, pra sugerir upgrade.
 * Heurística simples: detecta se o atual é mensal/anual e se é 1 curso
 * ou 2 cursos, e sugere o tier acima do mesmo ciclo.
 */
function suggestUpgrade(currentSlug: string | null): string {
  if (!currentSlug) return 'mensal-2-cursos'
  if (currentSlug.includes('1-curso')) {
    return currentSlug.replace('1-curso', '2-cursos')
  }
  if (currentSlug.includes('2-cursos')) {
    return currentSlug.replace('2-cursos', 'todos')
  }
  return 'mensal-todos'
}

/**
 * Checa se o usuário tem acesso a UM curso específico (já está ativo).
 * Útil pra endpoints que querem proteger conteúdo do curso.
 */
export async function hasAccessToCourse(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const limits = await getUserPlanLimits(userId)
  if (!limits.hasPlan) return false
  if (limits.isBypassed) return true
  if (limits.coverageType === 'ALL') {
    // Plano "todos" — basta ter pago, mas ainda assim precisa estar enrolled
    // (o checkout enrolls automaticamente em todos os cursos no caso ALL)
    const enrollment = await prisma.userCourseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { isActive: true },
    })
    return enrollment?.isActive ?? false
  }
  // SPECIFIC/AREA: precisa estar enrolled E ativo
  const enrollment = await prisma.userCourseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { isActive: true },
  })
  return enrollment?.isActive ?? false
}
