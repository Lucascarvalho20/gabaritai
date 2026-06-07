import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { renderEditalEmail } from '@/lib/edital-renderer'
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rate-limit'
import { validateEmail } from '@/lib/email-validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

/**
 * Gate de cadastro automático.
 *
 * Default ATIVO (2026-06-07): cada lead vira:
 *   1. User com senha temporária aleatória (10 chars)
 *   2. TrialPeriod de 7 dias começando agora
 *   3. Email com edital verticalizado do curso escolhido + login + senha
 *
 * Se já existe User com mesmo email → preserva perfil, NÃO recria conta,
 * NÃO cria novo trial. Email avisa "bem-vindo de volta".
 *
 * Pra desativar (modo só captura, sem criar conta) defina
 * LEAD_REQUIRE_SIGNUP=false no Vercel.
 */
const REQUIRE_SIGNUP = process.env.LEAD_REQUIRE_SIGNUP !== 'false'

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

  const source = String(body.source ?? '').trim()
  if (!source) {
    recordFailedAttempt(`leads:${clientIp}`, clientIp)
    return NextResponse.json({ message: 'source obrigatório' }, { status: 400 })
  }

  // Validação robusta de email — formato + descartáveis + padrões de teste
  const validation = validateEmail(String(body.email ?? ''))
  if (!validation.ok) {
    recordFailedAttempt(`leads:${clientIp}`, clientIp)
    return NextResponse.json({ message: validation.reason }, { status: 400 })
  }
  const emailRaw = validation.normalized

  // Hash do IP (não guarda o IP cru — privacidade)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null

  // Procura lead existente (mesmo email + source) pra idempotência DO BANCO
  // (não duplicar registro). NÃO pode bloquear o envio do email — usuário
  // pode legitimamente pedir o edital de novo (perdeu, foi pra spam, etc).
  const existing = await prisma.lead.findFirst({
    where: { email: emailRaw, source },
  })

  if (existing) {
    // Atualiza context/courseSlug se vieram informações novas (ex: agora
    // o usuário selecionou um curso específico)
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
    // Segue pro pipeline de email — NÃO retorna aqui (bug corrigido 2026-06-07)
  } else {
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
  }

  // Pipeline de email — agora SÍNCRONO (com await) porque a IA foi removida
  // e o render leva ~500ms. Antes era fire-and-forget, mas o Vercel serverless
  // matava o processo antes do Resend ser chamado, e o email NUNCA chegava.
  // Agora await direto: render rápido + sendEmail rápido (~2s total max).
  const courseSlugForEmail = body.courseSlug ?? body.parentSlug ?? null

  let tempPassword: string | null = null
  let createdAccount = false
  let returningUser = false
  let userName: string | null = null

  // SEMPRE checa se já existe user com esse email — preserva perfil
  const existingUser = await prisma.user.findUnique({
    where: { email: emailRaw },
    select: { id: true, name: true },
  })

  if (existingUser) {
    returningUser = true
    userName = existingUser.name
    console.log('[leads] returning user — profile preserved', { email: emailRaw, userId: existingUser.id })
  } else if (REQUIRE_SIGNUP) {
    // Novo usuário + gate ativo → cria conta + trial 7d
    try {
      tempPassword = crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10)
      const hash = await bcrypt.hash(tempPassword, 12)
      const nameFromEmail = emailRaw.split('@')[0].replace(/[^a-z0-9]/gi, ' ').trim() || 'Concurseiro'
      await prisma.user.create({
        data: {
          name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
          email: emailRaw,
          password: hash,
          emailVerified: false,
          profile: { create: {} },
          trials: {
            create: { endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
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

  // Render + envio síncrono. Em caso de erro, NÃO falha a resposta — usuário
  // não precisa saber se o email pingou ou não (privacidade) e a tentativa fica
  // logada no Vercel pra debug.
  let emailDelivered = false
  let emailError: string | null = null
  try {
    const { subject, html, text } = await renderEditalEmail(courseSlugForEmail)

    let finalHtml = html
    if (createdAccount && tempPassword) {
      finalHtml = prependFirstAccessBlock(html, emailRaw, tempPassword)
    } else if (returningUser) {
      finalHtml = prependReturningUserBlock(html, userName ?? 'Concurseiro')
    }

    const result = await sendEmail({ to: emailRaw, subject, html: finalHtml, text })
    emailDelivered = result.ok && result.mode === 'resend'
    if (!result.ok) {
      emailError = result.error?.message ?? 'envio retornou ok=false'
      console.warn('[leads] email send returned ok=false', {
        to: emailRaw,
        mode: result.mode,
        error: result.error,
      })
    } else {
      console.log('[leads] email sent', {
        to: emailRaw,
        mode: result.mode,
        messageId: result.messageId,
        withSignup: createdAccount,
        returning: returningUser,
      })
    }
  } catch (err: any) {
    emailError = err?.message ?? String(err)
    console.error('[leads] email pipeline failed:', err)
  }

  return NextResponse.json({
    ok: true,
    emailSent: emailDelivered,
    emailError, // null se OK, mensagem se falhou (útil só pra admin/debug, frontend ignora)
    requireSignup: REQUIRE_SIGNUP,
  })
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

/**
 * Bloco para usuário RETORNANTE (perfil preservado).
 * Aparece quando o email já tem conta — informa que o perfil dele continua
 * salvo e oferece atalhos pra entrar ou recuperar senha.
 */
function prependReturningUserBlock(html: string, userName: string): string {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'
  const firstName = userName.split(' ')[0]
  const block = `
    <div style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);padding:20px;border-radius:12px;color:white;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;margin:0 0 8px;color:#a7f3d0;">
        👋 Bem-vindo de volta, ${firstName}
      </p>
      <h2 style="font-size:17px;font-weight:800;margin:0 0 8px;color:white;">
        Seu perfil continua aqui esperando você
      </h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.92);margin:0 0 14px;line-height:1.55;">
        Seguimos com tudo salvo: seus cursos, progresso de estudo, flashcards e histórico
        de simulados. Entra com seu email e senha pra continuar de onde parou.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="${BASE_URL}/login" style="display:inline-block;background:white;color:#047857;padding:11px 22px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">
          Entrar →
        </a>
        <a href="${BASE_URL}/login?recuperar=1" style="display:inline-block;background:rgba(255,255,255,0.15);color:white;padding:11px 22px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;border:1px solid rgba(255,255,255,0.3);">
          Esqueci minha senha
        </a>
      </div>
    </div>`
  return html.replace(
    /(<div style="padding:28px 24px;">)/,
    `$1\n${block}\n`,
  )
}
