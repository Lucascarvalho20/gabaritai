/**
 * Sistema unificado de notificações.
 *
 * Cria registro na DB (pra mostrar no sininho do dashboard) E opcionalmente
 * dispara email pro aluno — respeitando as preferências dele em
 * NotificationPreference.
 *
 * Sempre que precisar avisar o aluno de qualquer coisa importante
 * (simulado disponível, mensagem do mentor, pagamento aprovado, etc),
 * use essa função em vez de chamar prisma.notification.create direto.
 *
 * Exemplo:
 *   await notify({
 *     userId: user.id,
 *     category: 'simulado',
 *     title: 'Simulado da semana está no ar',
 *     body: 'PMDF Soldado — 40 questões, 2h de duração.',
 *     link: '/dashboard/simulados/abc123',
 *     icon: 'Trophy',
 *     email: true, // dispara email também
 *   })
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export type NotifyCategory =
  | 'system'        // anúncios gerais, manutenção, etc.
  | 'simulado'      // novo simulado, ranking, resultado
  | 'mentor'        // mensagem do mentor IA / suporte
  | 'pagamento'     // cobrança, aprovado, falha
  | 'comunidade'    // grupo whatsapp, etc.
  | 'indicacao'     // afiliados, comissão recebida
  | 'edital'        // novo edital, atualização
  | 'estudo'        // lembrete de revisão, meta diária
  | 'conta'         // verificação email, troca senha

export type NotifyInput = {
  userId: string
  title: string
  body: string
  link?: string         // ex: "/dashboard/simulados/abc"
  category?: NotifyCategory
  icon?: string         // nome do ícone lucide
  email?: boolean       // se true, também envia por email (default: true)
  emailHtml?: string    // override do template padrão de email
  emailSubject?: string // override do subject (default: title)
}

/**
 * Cria notificação na DB + dispara email se aluno permitir.
 *
 * Não lança erro — falhas de email são logadas mas não quebram a operação principal.
 * Retorna o id da notificação criada.
 */
export async function notify(input: NotifyInput): Promise<string | null> {
  const {
    userId, title, body, link, category = 'system', icon,
    email = true, emailHtml, emailSubject,
  } = input

  try {
    // Busca user + preferências (campos diretos no User)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, notifyEmail: true },
    })
    if (!user) return null

    // Decide se manda email — respeita preferência do aluno
    const wantsEmail = email && !!user.email && user.notifyEmail
    let emailSent = false

    if (wantsEmail && user.email) {
      const fullLink = link ? absoluteUrl(link) : null
      const html = emailHtml ?? buildNotificationEmail({ name: user.name, title, body, link: fullLink })
      const result = await sendEmail({
        to: user.email,
        subject: emailSubject ?? title,
        html,
        text: `${body}\n\n${fullLink ? `Acessar: ${fullLink}` : ''}`,
      }).catch((err) => {
        console.error('[notify] email send error:', err)
        return { ok: false } as const
      })
      emailSent = result.ok
    }

    const created = await prisma.notification.create({
      data: { userId, title, body, link, category, icon, emailSent },
      select: { id: true },
    })
    return created.id
  } catch (err) {
    console.error('[notify] failed:', err)
    return null
  }
}

/**
 * Dispara a mesma notificação pra vários alunos de uma vez.
 * Útil pra broadcasts (ex: novo simulado pra todos da turma X).
 */
export async function notifyMany(userIds: string[], payload: Omit<NotifyInput, 'userId'>): Promise<number> {
  if (userIds.length === 0) return 0
  let sent = 0
  // Dispara em paralelo mas com limite pra não esgotar pool Prisma
  const CHUNK = 20
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const batch = userIds.slice(i, i + CHUNK)
    const results = await Promise.all(batch.map((uid) => notify({ ...payload, userId: uid })))
    sent += results.filter(Boolean).length
  }
  return sent
}

function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'
  if (path.startsWith('http')) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Template HTML padrão de notificação por email.
 * Visual simples, monoespaçado, com botão pro link se houver.
 */
function buildNotificationEmail(p: { name: string; title: string; body: string; link: string | null }): string {
  const firstName = p.name.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(p.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:20px 28px;">
        <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Gabaritai</div>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 4px;color:#666;font-size:13px;">Olá, ${escapeHtml(firstName)} 👋</p>
        <h1 style="margin:0 0 12px;color:#111;font-size:22px;font-weight:800;line-height:1.3;">${escapeHtml(p.title)}</h1>
        <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(p.body)}</p>
        ${p.link ? `<a href="${p.link}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;">Acessar no Gabaritai →</a>` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
        <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
          Você está recebendo esse email porque tem uma conta no Gabaritai.<br/>
          Pra parar de receber notificações por email, ajuste em <a href="${absoluteUrl('/dashboard/notificacoes')}" style="color:#6366f1;">preferências de notificação</a>.
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:20px;">
      Gabaritai · Plataforma de mentoria para concursos públicos
    </p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
