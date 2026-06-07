import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { sendEmail } from '@/lib/email'
import { renderEditalEmail } from '@/lib/edital-renderer'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/admin/test-email
 *
 * Endpoint de diagnóstico — admin testa se o pipeline de email tá
 * funcionando em produção.
 *
 * Body: { to?: string, courseSlug?: string }
 *
 * Retorna:
 *   - environment: como está configurado (RESEND_API_KEY presente?, EMAIL_FROM?)
 *   - result: ok/falhou + messageId (Resend) ou modo dev (sem API key)
 *   - emailPreview: subject + primeiro snippet do html
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const to = String(body.to ?? auth.user.email)
  const courseSlug = body.courseSlug ?? 'pcdf-delegado' // default tem edital

  // 1) Diagnóstico do ambiente
  const env = {
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM ?? 'não definido (usa default onboarding@resend.dev)',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'não definido',
    hasGeminiKey: !!process.env.GEMINI_API_KEY, // pra análise estratégica do edital
  }

  // 2) Render do email (igual ao fluxo real do /api/leads)
  const rendered = await renderEditalEmail(courseSlug)

  // 3) Tenta enviar
  const result = await sendEmail({
    to,
    subject: `[TESTE] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  })

  return NextResponse.json({
    env,
    to,
    courseSlug,
    rendered: {
      subject: rendered.subject,
      htmlLength: rendered.html.length,
      htmlPreview: rendered.html.slice(0, 500),
    },
    result,
    diagnostico:
      result.mode === 'dev'
        ? '⚠️ MODO DEV: RESEND_API_KEY não está configurado no Vercel. Email só foi logado no console — NÃO foi enviado. Configure a env var em Vercel → Settings → Environment Variables.'
        : result.ok
          ? `✅ Email enviado com sucesso pelo Resend (messageId: ${result.messageId}). Confira a caixa de entrada e ESPECIALMENTE a pasta SPAM/PROMOÇÕES do destinatário.`
          : result.error?.statusCode === 403
            ? '❌ 403 — Resend rejeitou: provavelmente o domínio do EMAIL_FROM não está verificado. No plano free, "onboarding@resend.dev" só envia pro mesmo email cadastrado na conta Resend. Verifique seu domínio em https://resend.com/domains'
            : result.error?.statusCode === 401
              ? '❌ 401 — API key inválida. Confira RESEND_API_KEY no Vercel.'
              : `❌ Resend retornou erro: ${result.error?.message ?? 'desconhecido'}`,
  })
}
