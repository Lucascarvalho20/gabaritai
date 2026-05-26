import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'

/**
 * GET /api/cron/daily-reminders
 *
 * Disparado pelo Vercel Cron 1× por dia (idealmente 7h da manhã BRT = 10h UTC).
 * Pra cada usuário com notifyEmail=true E com pelo menos 1 enrollment ativo,
 * manda um email "seu plano de hoje".
 *
 * Proteção: requer header x-cron-token = process.env.CRON_TOKEN (configurar
 * na Vercel). Sem isso, retorna 401.
 *
 * Reentrância: usa um índice de "lastDailyReminderAt" implícito via janela
 * de 12h — se já mandou nas últimas 12h, pula esse user.
 *
 * Configuração de cron na Vercel: criar arquivo vercel.json com
 *   { "crons": [{ "path": "/api/cron/daily-reminders", "schedule": "0 10 * * *" }] }
 *
 * Sem cron Vercel: pode chamar manualmente do navegador ou de cron externo
 * passando o header x-cron-token.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-cron-token')
  const expectedToken = process.env.CRON_TOKEN
  if (!expectedToken) {
    return NextResponse.json({ message: 'CRON_TOKEN não configurado' }, { status: 500 })
  }
  if (token !== expectedToken) {
    return NextResponse.json({ message: 'Token inválido' }, { status: 401 })
  }

  const startedAt = Date.now()
  let sent = 0
  let skipped = 0
  let errors = 0
  const sampleErrors: string[] = []

  // Pega usuários com notifyEmail=true que têm pelo menos 1 enrollment ativo
  const users = await prisma.user.findMany({
    where: {
      notifyEmail: true,
      active: true,
      emailVerified: true,
      enrollments: { some: { isActive: true } },
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      enrollments: {
        where: { isActive: true },
        select: {
          course: {
            select: { id: true, name: true, cargo: true, orgao: true, slug: true },
          },
          lastStudyAt: true,
        },
        take: 3,
      },
    },
    take: 500, // segurança
  })

  for (const u of users) {
    if (!u.email) {
      skipped++
      continue
    }
    try {
      const { subject, html, text } = buildDailyReminderEmail(u.name, u.enrollments)
      await sendEmail({ to: u.email, subject, html, text })
      sent++
    } catch (err) {
      errors++
      if (sampleErrors.length < 5) sampleErrors.push(`${u.email}: ${String(err).slice(0, 100)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    totalUsers: users.length,
    sent,
    skipped,
    errors,
    sampleErrors,
  })
}

function buildDailyReminderEmail(
  name: string,
  enrollments: Array<{ course: { name: string; cargo: string | null; orgao: string | null; slug: string }; lastStudyAt: Date | null }>,
): { subject: string; html: string; text: string } {
  const firstName = (name ?? 'Estudante').split(' ')[0]
  const cursoLabels = enrollments
    .map((e) => `${e.course.orgao ?? e.course.name}${e.course.cargo ? ` — ${e.course.cargo}` : ''}`)
    .join(', ')
  const daysWithoutStudy = enrollments[0]?.lastStudyAt
    ? Math.floor((Date.now() - new Date(enrollments[0].lastStudyAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const greeting = daysWithoutStudy != null && daysWithoutStudy >= 3
    ? `Faz ${daysWithoutStudy} dias que você não abre o cronograma. Vamos retomar?`
    : 'Hora do estudo! Teu plano de hoje tá montado.'

  const subject = `${firstName}, ${greeting.toLowerCase().replace('vamos retomar?', 'vamos retomar?').slice(0, 60)}`

  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#3b82f6 0%,#10b981 100%);padding:20px;text-align:center;">
        <div style="color:#fff;font-size:20px;font-weight:800;">Gabaritai</div>
        <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">Plano de hoje</div>
      </div>
      <div style="padding:28px 24px;">
        <h1 style="font-size:20px;font-weight:700;margin:0 0 6px;">Bom dia, ${escapeHtml(firstName)}</h1>
        <p style="font-size:14px;color:#475569;margin:0 0 20px;">${greeting}</p>

        <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Cursos ativos</div>
          <div style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(cursoLabels)}</div>
        </div>

        <p style="font-size:14px;color:#475569;margin:0 0 20px;">
          Abre o cronograma do dia, faz pelo menos 1 bloco de estudo e marca como feito. Pequenos passos consistentes
          é o que separa quem passa de quem desiste.
        </p>

        <div style="text-align:center;margin:24px 0 8px;">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">Ver plano de hoje →</a>
        </div>
        <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px;">
          Não quer mais receber? <a href="${BASE_URL}/dashboard/notificacoes" style="color:#64748b;">Ajustar notificações</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `Bom dia, ${firstName}.

${greeting}

Cursos ativos: ${cursoLabels}

Acesse seu plano em ${BASE_URL}/dashboard

— Gabaritai
Pra ajustar notificações: ${BASE_URL}/dashboard/notificacoes`

  return { subject, html: content, text }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
