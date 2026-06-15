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

// ─── Configuração dos limites por tipo de plano ──────────────────────────────
// Mantemos os limites do trial hardcoded aqui (em vez de em campos novos no
// PricingPlan) pra evitar schema change. Se um dia precisar de planos com
// limites custom, movemos pra Json field no PricingPlan.

export const TRIAL_LIMITS = {
  dailyQuestions: 30,
  allowedMockTypes: ['MINI'] as Array<'MINI' | 'REAL' | 'PERSONALIZADO'>,
  trialDays: 7,
  allowFlashcards: true,
  allowMentor: true,
  allowRedacao: false, // correção de redação só após assinar
} as const

export type PlanLimits = {
  hasPlan: boolean
  planSlug: string | null
  planName: string | null
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL' | null
  maxCourses: number | null       // null = ilimitado
  expiresAt: Date | null
  isBypassed: boolean             // admin/beta/full access
  isTrial: boolean                // está em trial gratuito
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
      isBypassed: false, isTrial: false, reason: 'Usuário não encontrado',
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
      isTrial: false,
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
    // Sem pagamento ativo → verifica se há um TrialPeriod ainda válido.
    // O cadastro (registro/Google/leads) cria um TrialPeriod, não um Payment.
    // Sem este fallback, o aluno recém-cadastrado aparecia como "sem plano"
    // (NO_ACCESS), não conseguia ativar curso nem via o banner correto.
    const activeTrial = await prisma.trialPeriod.findFirst({
      where: { userId, endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
      select: { endsAt: true },
    })

    if (activeTrial) {
      return {
        hasPlan: true,
        planSlug: 'trial-ativo',
        planName: 'Trial 7 dias',
        coverageType: 'ALL',     // pode explorar resumos de qualquer curso
        maxCourses: 1,           // mas só 1 curso ativo no cronograma
        expiresAt: activeTrial.endsAt,
        isBypassed: false,
        isTrial: true,
        reason: 'Trial gratuito ativo',
      }
    }

    return {
      hasPlan: false,
      planSlug: null,
      planName: null,
      coverageType: null,
      maxCourses: 0,
      expiresAt: null,
      isBypassed: false,
      isTrial: false,
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
      isBypassed: false, isTrial: false,
      reason: 'Plano do pagamento não encontrado',
    }
  }

  const isTrial = plan.slug.startsWith('trial-')

  return {
    hasPlan: true,
    planSlug: plan.slug,
    planName: plan.name,
    coverageType: plan.coverageType,
    maxCourses: plan.maxCourses,
    expiresAt: payment.expiresAt,
    isBypassed: false,
    isTrial,
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

// ─── Limites de TRIAL (questões/dia + tipos de simulado) ─────────────────────

/**
 * Conta quantas questões o usuário respondeu hoje.
 * Conta apenas QuestionAttempt criadas após 00:00 do dia local (UTC-3).
 *
 * Não conta tentativas de simulado (mock exam) — só questões avulsas via
 * /me/questoes/[id]/attempt. Se o produto unificar, ajusta aqui.
 */
export async function getQuestionsUsedToday(userId: string): Promise<number> {
  // Brasil: meia-noite local = 03:00 UTC. Calcula início do dia atual em BRT.
  const now = new Date()
  const brtOffsetMinutes = -180 // UTC-3
  const localMs = now.getTime() + brtOffsetMinutes * 60 * 1000
  const localDate = new Date(localMs)
  const startOfDayLocal = new Date(Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
  ))
  // Volta pro UTC subtraindo offset
  const startOfDayUTC = new Date(startOfDayLocal.getTime() - brtOffsetMinutes * 60 * 1000)

  return prisma.questionAttempt.count({
    where: { userId, createdAt: { gte: startOfDayUTC } },
  })
}

export type QuestionAttemptCheck =
  | { ok: true; isTrial: boolean; used: number; max: number | null }
  | { ok: false; reason: string; used: number; max: number; upgradeMessage: string }

/**
 * Checa se o usuário pode responder mais 1 questão agora.
 * Usuário pagante (não-trial) e bypassed: sempre ok.
 * Usuário em trial: limita a TRIAL_LIMITS.dailyQuestions por dia.
 */
export async function canAttemptQuestion(userId: string): Promise<QuestionAttemptCheck> {
  const limits = await getUserPlanLimits(userId)

  // Sem plano: bloqueia
  if (!limits.hasPlan) {
    return {
      ok: false,
      reason: 'Sem plano ativo. Comece pelo trial gratuito de 7 dias.',
      used: 0,
      max: 0,
      upgradeMessage: 'Ativar trial',
    }
  }

  // Bypass: admin/beta/full access
  if (limits.isBypassed) return { ok: true, isTrial: false, used: 0, max: null }

  // Pagante (não-trial): sem limite
  if (!limits.isTrial) return { ok: true, isTrial: false, used: 0, max: null }

  // Trial: aplica limite diário
  const used = await getQuestionsUsedToday(userId)
  const max = TRIAL_LIMITS.dailyQuestions
  if (used < max) return { ok: true, isTrial: true, used, max }

  return {
    ok: false,
    reason: `Você atingiu o limite de ${max} questões por dia do trial. Volta amanhã ou assine pra ter questões ilimitadas.`,
    used,
    max,
    upgradeMessage: 'Assinar agora',
  }
}

export type MockExamCheck =
  | { ok: true }
  | { ok: false; reason: string; upgradeMessage: string }

/**
 * Checa se o usuário pode fazer um simulado de um tipo específico.
 * Trial só permite MINI; demais planos liberam todos.
 */
export async function canTakeMockExam(
  userId: string,
  type: 'MINI' | 'REAL' | 'PERSONALIZADO',
): Promise<MockExamCheck> {
  const limits = await getUserPlanLimits(userId)

  if (!limits.hasPlan) {
    return {
      ok: false,
      reason: 'Sem plano ativo.',
      upgradeMessage: 'Ver planos',
    }
  }

  if (limits.isBypassed || !limits.isTrial) return { ok: true }

  if (TRIAL_LIMITS.allowedMockTypes.includes(type)) return { ok: true }

  return {
    ok: false,
    reason:
      type === 'REAL'
        ? 'Simulado completo no formato da banca está disponível só pra assinantes. Mini-simulados de treino estão liberados no trial.'
        : 'Esse tipo de simulado não está disponível no trial.',
    upgradeMessage: 'Assinar pra liberar',
  }
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
