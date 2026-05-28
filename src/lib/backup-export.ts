/**
 * Gerador de backup do banco Gabaritai.
 *
 * Exporta tabelas críticas em JSON comprimido com gzip e envia como
 * anexo via Resend. Usado por dois lugares:
 *   - Cron semanal (/api/cron/weekly-backup)
 *   - Botão manual no admin (/api/admin/test-backup)
 *
 * Não inclui campos sensíveis: password (hash), totpSecret, tokens
 * de email/reset, cpfEncrypted (mantém só hash).
 */

import { prisma } from '@/lib/prisma'
import { gzipSync } from 'zlib'

export type BackupResult = {
  ok: boolean
  sentEmail: boolean
  sizeMB: string
  stats: BackupStats
  to?: string
  error?: string
}

type BackupStats = {
  users: number
  payments: number
  enrollments: number
  studyPlans: number
  mockResults: number
  recentAttempts: number
  leads: number
  referredUsers: number
  activeUsers: number
  payingUsers: number
}

export async function runBackupAndEmail(opts: {
  to: string
  trigger: 'cron' | 'manual'
}): Promise<BackupResult> {
  const now = new Date()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [users, payments, enrollments, studyPlans, mockResults, recentAttempts, leads, referrals] =
    await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, name: true, email: true, username: true, role: true, plan: true,
          active: true, emailVerified: true, hasFullAccess: true, isBetaTester: true,
          phone: true, cpfHash: true,
          oauthProvider: true,
          referralCode: true, referredByUserId: true,
          lastLoginAt: true, lastLoginIp: true,
          createdAt: true, updatedAt: true,
          archivedAt: true, archivedReason: true,
        },
      }),
      prisma.payment.findMany({
        select: {
          id: true, userId: true, plan: true, amount: true, status: true,
          provider: true, providerPaymentId: true, providerPreferenceId: true,
          pricingPlanSlug: true, courseSlug: true, paymentMethod: true,
          paidAt: true, expiresAt: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.userCourseEnrollment.findMany(),
      prisma.studyPlan.findMany(),
      prisma.mockExamResult.findMany({
        select: {
          id: true, userId: true, mockExamId: true, status: true,
          score: true, acertos: true, erros: true, brancos: true,
          startedAt: true, finishedAt: true,
        },
      }),
      prisma.questionAttempt.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, userId: true, questionId: true,
          selected: true, correct: true, timeMs: true,
          createdAt: true,
        },
      }),
      prisma.lead.findMany({
        select: {
          id: true, email: true, source: true, courseSlug: true,
          convertedAt: true, createdAt: true,
        },
      }),
      prisma.user.count({ where: { referredByUserId: { not: null } } }),
    ])

  const stats: BackupStats = {
    users: users.length,
    payments: payments.length,
    enrollments: enrollments.length,
    studyPlans: studyPlans.length,
    mockResults: mockResults.length,
    recentAttempts: recentAttempts.length,
    leads: leads.length,
    referredUsers: referrals,
    activeUsers: users.filter((u) => u.active && !u.archivedAt).length,
    payingUsers: users.filter((u) => u.plan !== 'FREE').length,
  }

  const backup = {
    meta: {
      generatedAt: now.toISOString(),
      timezone: 'UTC',
      site: 'gabaritai',
      trigger: opts.trigger,
      recentAttemptsScope: 'last_30_days',
    },
    stats,
    users, payments, enrollments, studyPlans, mockResults, recentAttempts, leads,
  }

  const json = JSON.stringify(backup, null, 2)
  const gz = gzipSync(Buffer.from(json, 'utf-8'))
  const base64 = gz.toString('base64')
  const sizeMB = (gz.length / (1024 * 1024)).toFixed(2)

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: true, sentEmail: false, sizeMB, stats, to: opts.to }
  }

  const from = process.env.EMAIL_FROM ?? 'Gabaritai <onboarding@resend.dev>'
  const fileName = `gabaritai-backup-${now.toISOString().slice(0, 10)}.json.gz`
  const triggerLabel = opts.trigger === 'manual' ? 'manual (botão admin)' : 'automático'
  const subject = `${opts.trigger === 'manual' ? '🧪 ' : ''}Backup Gabaritai — ${now.toLocaleDateString('pt-BR')}`

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
  <h1 style="font-size:20px;font-weight:800;margin:0 0 8px;">🛡️ Backup Gabaritai</h1>
  <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;">Disparo: ${triggerLabel} · ${now.toLocaleString('pt-BR')}</p>
  <p style="font-size:14px;color:#475569;margin:0 0 20px;">
    Backup automático dos dados críticos do site. Sugestão: cria filtro no Gmail
    com etiqueta "Gabaritai/Backups" pra organizar.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Usuários totais</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.users}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Ativos</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.activeUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Pagantes</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.payingUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Pagamentos</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.payments}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Indicações</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.referredUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Leads</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.leads}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Tentativas (30d)</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${stats.recentAttempts}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Tamanho do anexo</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${sizeMB} MB</td></tr>
  </table>
  <p style="font-size:12px;color:#64748b;margin:16px 0 0;">
    Pra abrir o anexo no Mac:<br>
    <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">gunzip ${fileName}</code>
  </p>
</div>`

  const text = `Backup Gabaritai — ${now.toLocaleDateString('pt-BR')} (${triggerLabel})\n\n` +
    `Usuários: ${stats.users}\nAtivos: ${stats.activeUsers}\nPagantes: ${stats.payingUsers}\n` +
    `Pagamentos: ${stats.payments}\nLeads: ${stats.leads}\nTamanho: ${sizeMB} MB\nAnexo: ${fileName}`

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: opts.to, subject, html, text,
        attachments: [{ filename: fileName, content: base64 }],
      }),
    })
    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => '')
      console.error('[backup] resend failed:', emailRes.status, errText)
      return { ok: true, sentEmail: false, sizeMB, stats, to: opts.to, error: `resend_${emailRes.status}` }
    }
    return { ok: true, sentEmail: true, sizeMB, stats, to: opts.to }
  } catch (err: any) {
    console.error('[backup] send error:', err)
    return { ok: true, sentEmail: false, sizeMB, stats, to: opts.to, error: String(err?.message ?? err) }
  }
}
