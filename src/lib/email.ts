/**
 * Sender de emails — suporta Resend (prod) e fallback dev (console).
 *
 * Pra usar Resend:
 * 1. Cria conta em https://resend.com (3.000 emails/mês grátis)
 * 2. Configura DNS no domínio gabaritai.com.br (SPF, DKIM)
 * 3. Adiciona RESEND_API_KEY no .env
 * 4. Define EMAIL_FROM (ex: "Gabaritai <nao-responda@gabaritai.com.br>")
 *
 * Sem RESEND_API_KEY: emails são logados no console (modo desenvolvimento).
 */

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

type SendEmailResult = {
  ok: boolean
  mode: 'resend' | 'dev'
  messageId?: string
  /** Quando ok=false, contém o motivo exato pra debug */
  error?: { name?: string; message: string; statusCode?: number }
  /** Sender efetivamente usado (visível no test-email) */
  from?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Gabaritai <onboarding@resend.dev>'

  if (!apiKey) {
    console.log('━'.repeat(60))
    console.log('📧 [EMAIL DEV MODE — RESEND_API_KEY não configurado]')
    console.log(`De: ${from}`)
    console.log(`Para: ${to}`)
    console.log(`Assunto: ${subject}`)
    console.log('─'.repeat(60))
    console.log(text ?? html.replace(/<[^>]+>/g, ''))
    console.log('━'.repeat(60))
    return { ok: true, mode: 'dev', from }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Resend retorna { name, message, statusCode } em erros
      const errInfo = {
        name: data.name ?? data.error ?? 'ResendError',
        message: data.message ?? JSON.stringify(data).slice(0, 300),
        statusCode: res.status,
      }
      console.error('[email] resend error:', errInfo)
      return { ok: false, mode: 'resend', error: errInfo, from }
    }
    return { ok: true, mode: 'resend', messageId: data.id, from }
  } catch (err: any) {
    const errInfo = {
      name: err?.name ?? 'NetworkError',
      message: err?.message ?? String(err),
    }
    console.error('[email] send failed:', errInfo)
    return { ok: false, mode: 'resend', error: errInfo, from }
  }
}

// ── Templates de email ──────────────────────────────────────────────────────

function brandHeader() {
  return `<div style="text-align:center;padding:24px 0;border-bottom:1px solid #e5e7eb;margin-bottom:24px">
    <h1 style="font-size:24px;margin:0;color:#7c3aed;letter-spacing:-0.02em">Gabaritai</h1>
  </div>`
}

function brandFooter() {
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Gabaritai · Mentoria inteligente para concursos<br/>
    Você está recebendo este e-mail porque é cadastrado na plataforma.
  </div>`
}

export function buildPaymentReceiptEmail(input: {
  name: string
  planName: string
  amount: number // em reais
  paymentMethod?: string | null
  paidAt: Date
  paymentId: string
  enrolledCount: number
  expiresAt?: Date | null
  dashboardUrl: string
}) {
  const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const methodLabel = ({ pix: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', ticket: 'Boleto' } as Record<string, string>)[input.paymentMethod ?? ''] ?? 'Mercado Pago'

  const subject = `✅ Pagamento confirmado — ${input.planName}`

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fff">
  ${brandHeader()}
  <div style="background:#d1fae5;color:#065f46;padding:14px;border-radius:8px;text-align:center;font-weight:bold;margin-bottom:24px">
    🎉 Pagamento aprovado!
  </div>
  <p>Olá, <strong>${input.name}</strong>!</p>
  <p>Recebemos seu pagamento. Seu acesso já está liberado — pode começar a estudar agora.</p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Plano</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${input.planName}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Valor</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmtBRL(input.amount)}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Método</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right">${methodLabel}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Data</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right">${fmtDate(input.paidAt)}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Cursos liberados</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right">${input.enrolledCount}</td></tr>
    ${input.expiresAt ? `<tr><td style="padding:10px 0;color:#6b7280">Acesso até</td><td style="padding:10px 0;text-align:right">${fmtDate(input.expiresAt)}</td></tr>` : '<tr><td style="padding:10px 0;color:#6b7280">Acesso</td><td style="padding:10px 0;text-align:right;color:#16a34a;font-weight:600">Vitalício</td></tr>'}
  </table>

  <p style="margin:32px 0;text-align:center">
    <a href="${input.dashboardUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
      Acessar minha conta
    </a>
  </p>

  <div style="background:#f9fafb;padding:16px;border-radius:8px;font-size:13px;color:#4b5563;margin:24px 0">
    <strong style="color:#111">Próximos passos:</strong>
    <ol style="padding-left:20px;margin:8px 0 0">
      <li>Criar seu cronograma personalizado</li>
      <li>Fazer o primeiro mini-simulado</li>
      <li>Conversar com o Mentor IA</li>
    </ol>
  </div>

  <p style="font-size:12px;color:#9ca3af">
    Recibo #${input.paymentId.slice(0, 8)} · Garantia 7 dias · Cancelamento a qualquer momento via suporte.
  </p>
  ${brandFooter()}
</body></html>`

  const text = `Pagamento confirmado!\n\nOlá ${input.name},\n\nPlano: ${input.planName}\nValor: ${fmtBRL(input.amount)}\nMétodo: ${methodLabel}\nData: ${fmtDate(input.paidAt)}\nCursos liberados: ${input.enrolledCount}\n\nAcesse: ${input.dashboardUrl}\n\nRecibo #${input.paymentId.slice(0, 8)}`

  return { subject, html, text }
}

export function buildWelcomeEmail(input: { name: string; loginUrl: string }) {
  const subject = `🎯 Bem-vindo ao Gabaritai, ${input.name.split(' ')[0]}!`
  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  ${brandHeader()}
  <h2 style="font-size:22px;margin-bottom:16px">Olá, ${input.name.split(' ')[0]}! 👋</h2>
  <p>Sua conta foi criada com sucesso. Você tem <strong>3 dias grátis</strong> pra explorar a plataforma.</p>
  <p>O que você pode fazer agora:</p>
  <ul>
    <li>Escolher seu concurso alvo</li>
    <li>Gerar um cronograma personalizado em segundos</li>
    <li>Fazer mini-simulados ilimitados</li>
    <li>Conversar com o Mentor IA</li>
  </ul>
  <p style="margin:32px 0;text-align:center">
    <a href="${input.loginUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
      Começar a estudar
    </a>
  </p>
  ${brandFooter()}
</body></html>`
  const text = `Bem-vindo ${input.name}!\n\nSua conta foi criada. Você tem 3 dias grátis.\n\nAcesse: ${input.loginUrl}`
  return { subject, html, text }
}

export function buildVerificationEmail(name: string, verifyUrl: string) {
  const subject = 'Confirme seu e-mail no Gabaritai'
  const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin-bottom:16px">Olá, ${name}! 👋</h1>
  <p>Bem-vindo ao <strong>Gabaritai</strong>. Pra ativar sua conta, confirme seu e-mail clicando no botão abaixo:</p>
  <p style="margin:32px 0">
    <a href="${verifyUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
      Confirmar meu e-mail
    </a>
  </p>
  <p style="font-size:13px;color:#666">Ou copie e cole no navegador:</p>
  <p style="font-size:12px;background:#f4f4f5;padding:8px;border-radius:4px;word-break:break-all">${verifyUrl}</p>
  <p style="font-size:13px;color:#666;margin-top:24px">O link expira em 48 horas. Se você não criou essa conta, ignore este e-mail.</p>
</body></html>`
  const text = `Olá, ${name}!\n\nConfirme seu e-mail no Gabaritai abrindo o link:\n${verifyUrl}\n\nO link expira em 48 horas.`
  return { subject, html, text }
}
