/**
 * Notificações via Telegram Bot — manda mensagem pro chat do admin.
 *
 * Setup (5 minutos):
 *  1. Fala com @BotFather no Telegram → /newbot → escolhe nome → recebe o TOKEN
 *  2. Fala com seu bot novo (qualquer mensagem) pra ele te conhecer
 *  3. Pega seu chat_id em: https://api.telegram.org/bot<TOKEN>/getUpdates
 *     procura "chat":{"id":123456789,...}
 *  4. Adiciona no .env:
 *      TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
 *      TELEGRAM_CHAT_ID="123456789"
 *
 * Sem essas envs → notificações são silenciosamente ignoradas (modo dev).
 */

type TelegramOptions = {
  parseMode?: 'Markdown' | 'HTML'
  silent?: boolean // notificação muda (sem som)
  buttons?: Array<{ text: string; url: string }>
}

export async function notifyAdmin(message: string, opts: TelegramOptions = {}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    // Modo dev — só loga
    if (process.env.NODE_ENV !== 'production') {
      console.log('📲 [TELEGRAM DEV]', message.replace(/\*/g, ''))
    }
    return false
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      parse_mode: opts.parseMode ?? 'Markdown',
      disable_notification: opts.silent ?? false,
      disable_web_page_preview: true,
    }
    if (opts.buttons?.length) {
      body.reply_markup = {
        inline_keyboard: [opts.buttons.map((b) => ({ text: b.text, url: b.url }))],
      }
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[telegram] error:', data)
      return false
    }
    return true
  } catch (err) {
    console.error('[telegram] exception:', err)
    return false
  }
}

// ── Mensagens prontas ────────────────────────────────────────────────────────

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return '—'
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 3)}***@${domain}`
}

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function telegramNewSignup(input: { name: string; email: string; ip?: string }) {
  return notifyAdmin(
    `🆕 *Novo cadastro*\n` +
    `Nome: ${input.name}\n` +
    `Email: ${maskEmail(input.email)}\n` +
    (input.ip ? `IP: \`${input.ip}\`\n` : ''),
    { buttons: [{ text: 'Ver no Admin', url: `${baseUrl()}/admin/usuarios` }] },
  )
}

export async function telegramPaymentReceived(input: {
  amount: number // em reais
  planName: string
  userName: string
  userEmail: string | null
  method?: string | null
  paymentId: string
}) {
  return notifyAdmin(
    `💰 *Venda aprovada!*\n` +
    `Valor: *${fmtBRL(input.amount * 100)}*\n` +
    `Plano: ${input.planName}\n` +
    `Aluno: ${input.userName} (${maskEmail(input.userEmail)})\n` +
    (input.method ? `Método: ${input.method}\n` : ''),
    { buttons: [{ text: 'Ver pagamento', url: `${baseUrl()}/admin/pagamentos` }] },
  )
}

export async function telegramCpfBanned(input: { reason?: string | null; bannedBy: string }) {
  return notifyAdmin(
    `🚫 *CPF banido*\n` +
    `Motivo: ${input.reason ?? '—'}\n` +
    `Por: ${input.bannedBy}`,
    { silent: true },
  )
}

export async function telegramSecurityAlert(input: { kind: string; details: string }) {
  return notifyAdmin(
    `🚨 *Alerta de segurança*\n` +
    `Tipo: \`${input.kind}\`\n` +
    `${input.details}`,
  )
}

export async function telegramTrialFraudAttempt(input: { reason: string; ip: string; attemptedEmail?: string }) {
  return notifyAdmin(
    `⚠️ *Tentativa de fraude bloqueada*\n` +
    `Motivo: ${input.reason}\n` +
    `IP: \`${input.ip}\`\n` +
    (input.attemptedEmail ? `Email tentado: ${maskEmail(input.attemptedEmail)}` : ''),
    { silent: true },
  )
}

export async function telegramNewEditalDraft(input: {
  count: number
  cursos: string[]
}) {
  const lista = input.cursos.slice(0, 8).map((c) => `• ${c}`).join('\n')
  const sobra = input.cursos.length > 8 ? `\n_…e mais ${input.cursos.length - 8}_` : ''
  return notifyAdmin(
    `📋 *${input.count} edital(is) detectado(s)*\n\n${lista}${sobra}\n\nRevise e ative o que for válido.`,
    {
      buttons: [{ text: '📋 Revisar editais', url: `${baseUrl()}/admin/editais?tab=rascunhos` }],
    },
  )
}
