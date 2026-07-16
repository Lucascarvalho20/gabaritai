/**
 * Helpers de conteúdo durante o trial gratuito.
 *
 * Política definida pelo João (2026-06-07):
 *   - Trial = 7 dias
 *   - Cronograma do trial sugere SÓ RESUMO de cada tópico (em 7 dias dá pra
 *     passar pelos resumos do edital inteiro)
 *   - Aluno PODE clicar "ver completo" a qualquer momento (sem bloqueio),
 *     mas vê banner discreto: "no plano pago, seu cronograma cobriria o
 *     material completo dia a dia"
 *   - Quando trial expira sem upgrade, perfil é mantido, mas conteúdo
 *     premium fica bloqueado até cadastro de plano
 *
 * Sem bloqueio agressivo. Sem frustração. Apenas posicionamento do upgrade.
 */

import { getUserPlanLimits } from '@/lib/plan-access'

export type TrialContentMode = 'TRIAL_RESUMOS' | 'FULL_ACCESS' | 'FREE_PLANNER' | 'NO_ACCESS'

/**
 * Determina o modo de conteúdo do usuário:
 *   - TRIAL_RESUMOS: está no trial (cronograma sugere resumos)
 *   - FULL_ACCESS: plano pago / admin / beta tester / cortesia
 *   - FREE_PLANNER: tier gratuito permanente — usa cronograma/planner, mas
 *     todo o conteúdo (material, questões, flashcards, simulados) fica bloqueado
 *   - NO_ACCESS: caso de erro (usuário/plano inválido)
 */
export async function getUserContentMode(userId: string): Promise<TrialContentMode> {
  const limits = await getUserPlanLimits(userId)
  if (limits.isBypassed) return 'FULL_ACCESS'
  if (limits.isTrial) return 'TRIAL_RESUMOS'
  if (limits.isFree) return 'FREE_PLANNER'
  if (limits.hasPlan) return 'FULL_ACCESS'
  return 'NO_ACCESS'
}

/**
 * true se o conteúdo pago (material, questões, flashcards, IA) deve ficar
 * BLOQUEADO pro usuário — vale pro tier GRATUITO (planner) e pra sem-acesso.
 * Use no início dos endpoints de conteúdo/IA como defesa de servidor
 * (os cadeados na UI são só a primeira camada).
 */
export async function isContentLockedForUser(userId: string): Promise<boolean> {
  const mode = await getUserContentMode(userId)
  return mode === 'FREE_PLANNER' || mode === 'NO_ACCESS'
}

/**
 * Mensagem de banner contextual baseada no modo do usuário.
 * Usar nas páginas de material e cronograma.
 */
export function getTrialBannerMessage(mode: TrialContentMode): {
  show: boolean
  variant: 'info' | 'warning' | 'success'
  title: string
  message: string
  ctaLabel: string
  ctaHref: string
} | null {
  if (mode === 'FULL_ACCESS') return null

  if (mode === 'FREE_PLANNER') {
    return {
      show: true,
      variant: 'info',
      title: 'Plano gratuito — só o cronograma',
      message:
        'Você está no plano gratuito: pode montar seu cronograma, ver a estrutura do edital, marcar o que já estudou e cronometrar seu tempo. O conteúdo (material, questões, flashcards e simulados) é do plano pago — assine pra desbloquear.',
      ctaLabel: 'Ver planos',
      ctaHref: '/planos',
    }
  }

  if (mode === 'TRIAL_RESUMOS') {
    return {
      show: true,
      variant: 'info',
      title: 'Você está no trial — cronograma com resumos',
      message:
        'No trial de 7 dias, seu cronograma sugere os RESUMOS de cada tópico (você cobre o edital inteiro em poucos dias). O conteúdo completo está disponível sob demanda — clique em qualquer matéria pra ver. No plano pago, seu cronograma cobre o material completo dia a dia.',
      ctaLabel: 'Ver planos',
      ctaHref: '/planos',
    }
  }

  // NO_ACCESS
  return {
    show: true,
    variant: 'warning',
    title: 'Seu acesso gratuito expirou',
    message:
      'Seu perfil, progresso e flashcards estão preservados. Pra continuar estudando com cronograma completo, escolha um plano que cubra seu concurso.',
    ctaLabel: 'Ver planos',
    ctaHref: '/planos',
  }
}
