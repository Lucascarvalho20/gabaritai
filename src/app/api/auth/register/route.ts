import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidCpf, hashCpf, encryptCpf } from '@/lib/cpf'
import { sendEmail, buildVerificationEmail } from '@/lib/email'
import { audit } from '@/lib/audit-log'
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/rate-limit'
import { telegramNewSignup, telegramTrialFraudAttempt } from '@/lib/telegram'
import { findReferrerByCode } from '@/lib/referral'
import { bothAllowedToShareContact } from '@/lib/cpf-allowlist'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit no register pra evitar abuso
  const rl = checkRateLimit(`register:${ip}`, ip)
  if (!rl.ok) {
    return NextResponse.json({ message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  try {
    const { name, email, password, cpf, ref } = await req.json()

    // Resolve quem indicou (se veio ?ref=CODE)
    let referredByUserId: string | null = null
    if (ref && typeof ref === 'string') {
      referredByUserId = await findReferrerByCode(ref).catch(() => null)
    }

    if (!name || !email || !password || !cpf) {
      recordFailedAttempt(`register:${ip}`, ip)
      return NextResponse.json({ message: 'Todos os campos são obrigatórios: nome, email, senha, CPF' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ message: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }
    if (!isValidCpf(cpf)) {
      recordFailedAttempt(`register:${ip}`, ip)
      return NextResponse.json({ message: 'CPF inválido. Verifique os dígitos.' }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const cpfHash = hashCpf(cpf)
    const cpfEncrypted = encryptCpf(cpf)

    // Banlist: CPF foi banido pelo admin
    const banned = await prisma.cpfBlocklist.findUnique({ where: { cpfHash } })
    if (banned) {
      await audit({
        action: 'TRIAL_BLOCKED_DUPLICATE',
        ip,
        metadata: { reason: 'cpf_banned', attemptedEmail: normalizedEmail },
      })
      return NextResponse.json({ message: 'Cadastro indisponível. Entre em contato com o suporte.' }, { status: 403 })
    }

    // Dedup: email OR cpfHash
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { cpfHash }] },
      select: { id: true, email: true, cpfHash: true },
    })
    // Exceção: se o conflito é só de CPF e ambas as contas estão na allowlist
    // do dono, permite (não bloqueia). E-mail duplicado nunca passa.
    if (exists && exists.email !== normalizedEmail && bothAllowedToShareContact(normalizedEmail, exists.email)) {
      // segue o fluxo de criação normalmente (não retorna 409)
    } else if (exists) {
      const reason = exists.email === normalizedEmail ? 'email' : 'cpf'
      await audit({
        action: 'TRIAL_BLOCKED_DUPLICATE',
        ip,
        metadata: { reason, attemptedEmail: normalizedEmail },
      })
      // Notifica admin se for CPF duplicado (tentativa de fraude)
      if (reason === 'cpf') {
        telegramTrialFraudAttempt({
          reason: 'CPF já cadastrado em outra conta',
          ip,
          attemptedEmail: normalizedEmail,
        }).catch(() => {})
      }
      return NextResponse.json(
        { message: reason === 'email' ? 'Este e-mail já está cadastrado' : 'Este CPF já está cadastrado em outra conta' },
        { status: 409 },
      )
    }

    const hash = await bcrypt.hash(String(password), 12)
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const verifyExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hash,
        cpfHash,
        cpfEncrypted,
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
        referredByUserId,
        profile: { create: {} },
        // Cria registro de TrialPeriod automaticamente (7 dias)
        trials: {
          create: {
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: { id: true, name: true, email: true, role: true, plan: true },
    })

    // Envia email de verificação (modo dev: vai pro console)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/verificar-email?token=${verifyToken}`
    const emailContent = buildVerificationEmail(user.name, verifyUrl)
    const emailResult = await sendEmail({ to: normalizedEmail, ...emailContent })

    await audit({
      actorId: user.id,
      action: 'TRIAL_STARTED',
      ip,
      metadata: { email: normalizedEmail, emailSent: emailResult.ok, emailMode: emailResult.mode },
    })

    // Notifica admin sobre novo cadastro
    telegramNewSignup({ name: user.name, email: normalizedEmail, ip }).catch(() => {})

    return NextResponse.json(
      {
        message: 'Conta criada! Verifique seu e-mail pra ativar (válido por 48h).',
        emailSent: emailResult.ok,
        emailMode: emailResult.mode, // 'resend' ou 'dev'
        ...(emailResult.mode === 'dev' && { devVerifyUrl: verifyUrl }), // expõe link em dev
        user,
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('register error', err)
    recordFailedAttempt(`register:${ip}`, ip)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
