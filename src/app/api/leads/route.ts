import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { renderEditalEmail } from '@/lib/edital-renderer'
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

/**
 * Gate de cadastro automático.
 * Quando true (LEAD_REQUIRE_SIGNUP=true), cada lead vira:
 *   1. User com senha temporária aleatória
 *   2. TrialPeriod de 7 dias começando agora
 *   3. Email com edital + link de primeiro acesso + senha temporária
 *
 * Quando false (default — modo TESTE): só captura email e dispara edital,
 * sem criar conta. Útil pra testar o fluxo sem poluir base de usuários.
 *
 * Pra ativar em produção, defina LEAD_REQUIRE_SIGNUP=true no Vercel.
 */
const REQUIRE_SIGNUP = process.env.LEAD_REQUIRE_SIGNUP === 'true'

/**
 * POST /api/leads
 *
 * Captura email pra mailing list (sem precisar de cadastro completo).
 * Usado por lead magnets — "baixe o edital verticalizado", "receba aviso
 * de edital novo", etc.
 *
 * Body: { email, source, context?, courseSlug?, parentSlug? }
 *
 * Idempotente: se o mesmo email + source já existe, devolve ok=true e
 * NÃO cria duplicata (apenas atualiza context se vier diferente). Isso
 * evita o concurseiro spammar o form e poluir o banco.
 */
export async function POST(req: NextRequest) {
  // Rate limit por IP (protege contra bot que enche tabela Lead + dispara emails caros)
  const clientIp = getClientIp(req)
  const rl = checkRateLimit(`leads:${clientIp}`, clientIp)
  if (!rl.ok) {
    return NextResponse.json(
      { message: 'Muitas requisições. Aguarde alguns minutos.' },
      { status: 429 },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 })
  }

  const emailRaw = String(body.email ?? '').trim().toLowerCase()
  const source = String(body.source ?? '').trim()

  if (!emailRaw || !source) {
    recordFailedAttempt(`leads:${clientIp}`, clientIp)
    return NextResponse.json({ message: 'email e source obrigatórios' }, { status: 400 })
  }
  // Regex simples — não bate todas as edge cases mas elimina 99% do lixo
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    recordFailedAttempt(`leads:${clientIp}`, clientIp)
    return NextResponse.json({ message: 'Email inválido' }, { status: 400 })
  }

  // Hash do IP (não guarda o IP cru — privacidade)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null

  // Procura lead existente (mesmo email + source) pra idempotência
  const existing = await prisma.lead.findFirst({
    where: { email: emailRaw, source },
  })

  if (existing) {
    // Atualiza context/courseSlug se vier informação nova
    if (body.context || body.courseSlug || body.parentSlug) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          context: body.context ?? existing.context,
          courseSlug: body.courseSlug ?? existing.courseSlug,
          parentSlug: body.parentSlug ?? existing.parentSlug,
        },
      })
    }
    return NextResponse.json({ ok: true, alreadyExists: true })
  }

  await prisma.lead.create({
    data: {
      email: emailRaw,
      source,
      context: body.context ?? null,
      courseSlug: body.courseSlug ?? null,
      parentSlug: body.parentSlug ?? null,
      ipHash,
      userAgent,
    },
  })

  // Gate opcional: cria User + Trial automaticamente quando LEAD_REQUIRE_SIGNUP=true.
  // Resposta sai antes do email; criação de conta acontece em paralelo se necessário.
  const courseSlugForEmail = body.courseSlug ?? body.parentSlug ?? null

  void (async () => {
    let tempPassword: string | null = null
    let createdAccount = false

    // Cria conta automaticamente se gate ativo e usuário ainda não existe
    if (REQUIRE_SIGNUP) {
      const existingUser = await prisma.user.findUnique({ where: { email: emailRaw } })
      if (!existingUser) {
        try {
          tempPassword = crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10)
          const hash = await bcrypt.hash(tempPassword, 12)
          // Nome derivado do email (parte antes do @)
          const nameFromEmail = emailRaw.split('@')[0].replace(/[^a-z0-9]/gi, ' ').trim() || 'Concurseiro'
          await prisma.user.create({
            data: {
              name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
              email: emailRaw,
              password: hash,
              emailVerified: false,
              profile: { create: {} },
              trials: {
                create: {
                  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              },
            },
          })
          createdAccount = true
          console.log('[leads] auto-signup created', { email: emailRaw })
        } catch (err) {
          console.error('[leads] auto-signup failed:', err)
          tempPassword = null
        }
      }
    }

    // Renderiza e envia o email do edital
    try {
      const { subject, html, text } = await renderEditalEmail(courseSlugForEmail)

      // Se criou conta, prepend bloco com senha temporária no HTML
      const finalHtml = createdAccount && tempPassword
        ? prependFirstAccessBlock(html, emailRaw, tempPassword)
        : html

      const result = await sendEmail({ to: emailRaw, subject, html: finalHtml, text })
      if (!result.ok) {
        console.warn('[leads] email send returned ok=false', { to: emailRaw, mode: result.mode })
      } else {
        console.log('[leads] email sent', { to: emailRaw, mode: result.mode, messageId: result.messageId, withSignup: createdAccount })
      }
    } catch (err) {
      console.error('[leads] email pipeline failed:', err)
    }
  })()

  return NextResponse.json({ ok: true, emailSent: true, requireSignup: REQUIRE_SIGNUP })
}

/**
 * Insere bloco "primeiro acesso" no topo do conteúdo do email do edital
 * (depois do header, antes do título). Mantém o resto do template intacto.
 */
function prependFirstAccessBlock(html: string, email: string, tempPassword: string): string {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'
  const block = `
    <div style="background:linear-gradient(135deg,#1e40af 0%,#7c3aed 100%);padding:20px;border-radius:12px;color:white;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;margin:0 0 8px;color:#bfdbfe;">
        🎁 Seu trial de 7 dias começou
      </p>
      <h2 style="font-size:18px;font-weight:800;margin:0 0 8px;color:white;">
        Criamos sua conta automaticamente
      </h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.9);margin:0 0 14px;line-height:1.5;">
        Junto com o edital, liberamos pra você acesso completo à plataforma por 7 dias.
        Use as credenciais abaixo no primeiro acesso e troque sua senha:
      </p>
      <div style="background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:8px;font-family:'SF Mono',Menlo,monospace;font-size:12px;color:#e0e7ff;margin-bottom:14px;">
        <div style="margin-bottom:4px;"><span style="opacity:0.6;">login:</span> ${email}</div>
        <div><span style="opacity:0.6;">senha:</span> ${tempPassword}</div>
      </div>
      <a href="${BASE_URL}/login" style="display:inline-block;background:white;color:#1e40af;padding:11px 22px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">
        Entrar agora →
      </a>
    </div>`
  // Insere depois do primeiro <div style="padding:28px 24px;"> que abre o conteúdo
  return html.replace(
    /(<div style="padding:28px 24px;">)/,
    `$1\n${block}\n`,
  )
}
