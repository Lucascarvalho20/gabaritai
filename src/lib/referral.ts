/**
 * Lógica do programa de indicações (afiliados).
 *
 * Modelo: comissão de 30% RECORRENTE enquanto o indicado mantiver a
 * assinatura paga. Cálculo on-demand a partir dos Payments do indicado.
 *
 * Sem schema novo de ReferralCommission — derivamos do Payment por:
 *   payment.user.referredByUserId === ME?
 *   payment.status === APPROVED
 *   payment.amount * 0.30
 */

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const COMMISSION_RATE = 0.30 // 30%

/**
 * Garante que o usuário tem um referralCode. Se não, gera um novo.
 * Retorna o código.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (u?.referralCode) return u.referralCode

  // Gera código curto (6 chars alfanuméricos) — colide raramente, faz retry
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateCode()
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
      return code
    } catch {
      // unique violation — tenta de novo
    }
  }
  throw new Error('Falha ao gerar referralCode')
}

function generateCode(): string {
  // 6 chars: letras maiúsculas + dígitos. ~2 bilhões de combinações.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I (confusão visual)
  const bytes = crypto.randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length]
  return code
}

/**
 * Resolve um referralCode → userId. Retorna null se inválido.
 */
export async function findReferrerByCode(code: string): Promise<string | null> {
  if (!code || code.length < 4) return null
  const user = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, active: true },
  })
  if (!user || !user.active) return null
  return user.id
}

export type ReferralStats = {
  referralCode: string
  referralLink: string
  totalReferrals: number          // qts pessoas você indicou
  payingReferrals: number         // qts viraram pagantes (Payment APPROVED + ativo)
  totalCommissionCents: number    // soma TOTAL de comissão histórica
  pendingCommissionCents: number  // ainda não pago (sempre tudo por enquanto — payout manual)
  recentPayments: Array<{
    payerName: string
    amountCents: number
    commissionCents: number
    paidAt: Date | null
  }>
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'

  // Garante o código
  const code = await ensureReferralCode(userId)
  const link = `${baseUrl}/registro?ref=${code}`

  // Pessoas que vc indicou
  const referrals = await prisma.user.findMany({
    where: { referredByUserId: userId },
    select: { id: true, name: true },
  })

  if (referrals.length === 0) {
    return {
      referralCode: code,
      referralLink: link,
      totalReferrals: 0,
      payingReferrals: 0,
      totalCommissionCents: 0,
      pendingCommissionCents: 0,
      recentPayments: [],
    }
  }

  // Payments aprovados desses referrals
  const referralIds = referrals.map((r) => r.id)
  const refByUser = new Map(referrals.map((r) => [r.id, r.name]))
  const payments = await prisma.payment.findMany({
    where: {
      userId: { in: referralIds },
      status: 'APPROVED',
    },
    select: { userId: true, amount: true, paidAt: true },
    orderBy: { paidAt: 'desc' },
    take: 50,
  })

  const totalCommissionCents = payments.reduce(
    (acc, p) => acc + Math.round((p.amount ?? 0) * 100 * COMMISSION_RATE),
    0,
  )
  const payingReferrals = new Set(payments.map((p) => p.userId)).size

  const recentPayments = payments.slice(0, 10).map((p) => ({
    payerName: maskName(refByUser.get(p.userId) ?? 'Aluno indicado'),
    amountCents: Math.round((p.amount ?? 0) * 100),
    commissionCents: Math.round((p.amount ?? 0) * 100 * COMMISSION_RATE),
    paidAt: p.paidAt,
  }))

  return {
    referralCode: code,
    referralLink: link,
    totalReferrals: referrals.length,
    payingReferrals,
    totalCommissionCents,
    pendingCommissionCents: totalCommissionCents, // payout manual por enquanto
    recentPayments,
  }
}

/**
 * Privacidade — mascara nome dos indicados (mostra só primeiro nome + inicial).
 */
function maskName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}
