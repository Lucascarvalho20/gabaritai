import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/env-check
 *
 * Diagnóstico de quais env vars estão chegando no runtime do servidor.
 * Retorna APENAS booleanos (se a var existe) — nunca os valores reais.
 *
 * Protegido por requireAdmin pra evitar que aluno descubra quais
 * integrações estão ativas.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const vars = [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'CPF_SALT',
    'CPF_ENCRYPTION_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'EMAIL_FROM',
    'RESEND_API_KEY',
    'CRON_TOKEN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'ANTHROPIC_API_KEY',
    'DEEPSEEK_API_KEY',
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY',
    'MERCADOPAGO_SANDBOX',
    'MERCADOPAGO_WEBHOOK_SECRET',
    'NEXT_PUBLIC_MP_READY',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ]

  const result: Record<string, { present: boolean; length: number; preview: string }> = {}
  for (const name of vars) {
    const val = process.env[name]
    result[name] = {
      present: !!val,
      length: val?.length ?? 0,
      // Mostra só 4 primeiros chars pra confirmar formato (sem vazar valor real)
      preview: val ? `${val.slice(0, 4)}…(${val.length} chars)` : '— vazio —',
    }
  }

  return NextResponse.json({
    runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
    nodeVersion: process.version,
    vars: result,
  })
}
