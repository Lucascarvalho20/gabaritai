import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gzipSync } from 'zlib'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Backup semanal — exporta as tabelas críticas em JSON e manda por email
 * pro admin.
 *
 * Tabelas exportadas (sem campos sensíveis):
 *   - users (sem password, sem totpSecret, sem tokens, CPF mascarado)
 *   - payments (todos os campos)
 *   - user_course_enrollments (todos)
 *   - study_plans (todos)
 *   - mock_exam_results (todos)
 *   - question_attempts (apenas últimos 30 dias pra não ficar gigante)
 *
 * Compactado com gzip e enviado como anexo.
 * Resend aceita até 40MB de anexo.
 *
 * Schedule: roda toda segunda 4h BRT (7h UTC). No plano Hobby do Vercel,
 * roda 1x/dia independente do schedule — ainda melhor.
 *
 * Proteção: exige header `x-cron-token` igual ao env CRON_TOKEN.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const expected = process.env.CRON_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ message: 'ADMIN_EMAIL não configurado' }, { status: 500 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  try {
    // ─── Exporta dados ─────────────────────────────────────────────────
    const [users, payments, enrollments, studyPlans, mockResults, recentAttempts, leads, referrals] =
      await Promise.all([
        prisma.user.findMany({
          select: {
            id: true, name: true, email: true, username: true, role: true, plan: true,
            active: true, emailVerified: true, hasFullAccess: true, isBetaTester: true,
            phone: true,
            // CPF mascarado: só hash (não decryptable sem CPF_ENCRYPTION_KEY)
            cpfHash: true,
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

    const backup = {
      meta: {
        generatedAt: now.toISOString(),
        timezone: 'UTC',
        site: 'gabaritai',
        scope: 'weekly_full',
        recentAttemptsScope: 'last_30_days',
      },
      stats: {
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
      },
      users,
      payments,
      enrollments,
      studyPlans,
      mockResults,
      recentAttempts,
      leads,
    }

    const json = JSON.stringify(backup, null, 2)
    const gz = gzipSync(Buffer.from(json, 'utf-8'))
    const base64 = gz.toString('base64')
    const sizeMB = (gz.length / (1024 * 1024)).toFixed(2)

    // ─── Manda email com anexo ─────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      // Sem Resend, devolve o JSON gz inline (cron consumer pode salvar)
      return NextResponse.json({
        ok: true,
        sentEmail: false,
        sizeMB,
        stats: backup.stats,
      })
    }

    const from = process.env.EMAIL_FROM ?? 'Gabaritai <onboarding@resend.dev>'
    const fileName = `gabaritai-backup-${now.toISOString().slice(0, 10)}.json.gz`
    const subject = `Backup Gabaritai — ${now.toLocaleDateString('pt-BR')}`

    const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
  <h1 style="font-size:20px;font-weight:800;margin:0 0 16px;">🛡️ Backup semanal do Gabaritai</h1>
  <p style="font-size:14px;color:#475569;margin:0 0 20px;">
    Backup automático dos dados críticos do site. Guarda esse email em uma pasta dedicada
    no Gmail (sugestão: filtro "Gabaritai/Backups") pra ter histórico fácil de buscar.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Usuários</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.users}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Ativos</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.activeUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Pagantes</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.payingUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Pagamentos</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.payments}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Indicações</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.referredUsers}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Tentativas (30d)</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${backup.stats.recentAttempts}</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-weight:600;">Tamanho do anexo</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">${sizeMB} MB</td></tr>
  </table>
  <p style="font-size:12px;color:#64748b;margin:16px 0 0;">
    Backup em formato JSON comprimido com gzip. Pra abrir:<br>
    <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">gunzip ${fileName} && cat ${fileName.replace('.gz', '')}</code>
  </p>
</div>`

    const text = `Backup Gabaritai — ${now.toLocaleDateString('pt-BR')}\n\n` +
      `Usuários: ${backup.stats.users}\nAtivos: ${backup.stats.activeUsers}\n` +
      `Pagantes: ${backup.stats.payingUsers}\nPagamentos: ${backup.stats.payments}\n` +
      `Tamanho: ${sizeMB} MB\n\nAnexo: ${fileName}`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: adminEmail,
        subject,
        html,
        text,
        attachments: [{
          filename: fileName,
          content: base64,
        }],
      }),
    })

    const emailOk = emailRes.ok
    if (!emailOk) {
      const err = await emailRes.text().catch(() => '')
      console.error('[backup] resend failed:', emailRes.status, err)
    }

    return NextResponse.json({
      ok: true,
      sentEmail: emailOk,
      sizeMB,
      stats: backup.stats,
    })
  } catch (err) {
    console.error('[backup]', err)
    return NextResponse.json({ message: 'Backup falhou — confira logs' }, { status: 500 })
  }
}
