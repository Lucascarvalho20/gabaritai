import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isValidCpf, hashCpf, encryptCpf } from '@/lib/cpf'
import { isValidPhone, cleanPhone, hashPhone, encryptPhone } from '@/lib/phone'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import { telegramTrialFraudAttempt } from '@/lib/telegram'
import { createDefaultStudyPlan } from '@/lib/create-default-study-plan'

/**
 * POST /api/me/completar-cadastro
 * Body: { cpf: string, phone: string, courseSlug?: string }
 *
 * Usado depois do cadastro via Google OAuth (que não pede CPF/telefone)
 * e também pelo gate de cadastro forte.
 *
 * Valida CPF + phone (algoritmo + banlist + dedup com hash),
 * salva ambos criptografados, e opcionalmente matricula no curso.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const ip = getClientIp(req)
  const { cpf, phone, courseSlug } = await req.json()

  // Carrega user completo pra saber o que falta
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { cpfHash: true, phoneHash: true, email: true },
  })
  if (!me) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })

  const needsCpf = !me.cpfHash
  const needsPhone = !me.phoneHash

  if (needsCpf && !cpf) {
    return NextResponse.json({ message: 'CPF obrigatório' }, { status: 400 })
  }
  if (needsPhone && !phone) {
    return NextResponse.json({ message: 'Telefone obrigatório' }, { status: 400 })
  }
  if (cpf && !isValidCpf(cpf)) {
    return NextResponse.json({ message: 'CPF inválido. Verifique os dígitos.' }, { status: 400 })
  }
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json({ message: 'Telefone inválido. Use DDD + número (com 9 se celular).' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}

  // Processa CPF se foi enviado e ainda não tem
  if (needsCpf && cpf) {
    const cpfHashed = hashCpf(cpf)
    const banned = await prisma.cpfBlocklist.findUnique({ where: { cpfHash: cpfHashed } })
    if (banned) {
      await audit({ actorId: user.id, action: 'TRIAL_BLOCKED_DUPLICATE', ip, metadata: { reason: 'cpf_banned', oauth: true } })
      return NextResponse.json({ message: 'Cadastro indisponível. Entre em contato com o suporte.' }, { status: 403 })
    }
    const dupCpf = await prisma.user.findFirst({
      where: { cpfHash: cpfHashed, NOT: { id: user.id } },
      select: { id: true },
    })
    if (dupCpf) {
      await audit({ actorId: user.id, action: 'TRIAL_BLOCKED_DUPLICATE', ip, metadata: { reason: 'cpf_duplicate_oauth' } })
      telegramTrialFraudAttempt({
        reason: 'CPF já cadastrado em outra conta (via completar-cadastro)',
        ip,
        attemptedEmail: me.email ?? '(sem email)',
      }).catch(() => {})
      return NextResponse.json({ message: 'Este CPF já está cadastrado em outra conta' }, { status: 409 })
    }
    updateData.cpfHash = cpfHashed
    updateData.cpfEncrypted = encryptCpf(cpf)
  }

  // Processa PHONE se foi enviado e ainda não tem
  if (needsPhone && phone) {
    const phoneHashed = hashPhone(phone)
    const dupPhone = await prisma.user.findFirst({
      where: { phoneHash: phoneHashed, NOT: { id: user.id } },
      select: { id: true },
    })
    if (dupPhone) {
      await audit({ actorId: user.id, action: 'TRIAL_BLOCKED_DUPLICATE', ip, metadata: { reason: 'phone_duplicate_oauth' } })
      telegramTrialFraudAttempt({
        reason: 'Telefone já cadastrado em outra conta',
        ip,
        attemptedEmail: me.email ?? '(sem email)',
      }).catch(() => {})
      return NextResponse.json({ message: 'Este telefone já está cadastrado em outra conta' }, { status: 409 })
    }
    updateData.phone = cleanPhone(phone)
    updateData.phoneHash = phoneHashed
    updateData.phoneEncrypted = encryptPhone(phone)
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: user.id }, data: updateData })
  }

  // Garante TrialPeriod ativo — se aluno cadastrou via Google e callback falhou em criar
  // ou se trial já expirou e ele tá completando depois.
  const ativeTrial = await prisma.trialPeriod.findFirst({
    where: { userId: user.id, endsAt: { gte: new Date() } },
  })
  if (!ativeTrial) {
    await prisma.trialPeriod.create({
      data: {
        userId: user.id,
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).catch((err) => {
      console.error('[completar-cadastro] trial create failed', err)
    })
  }

  // Se aluno escolheu um curso, matricula + gera plano de estudo padrão.
  // Não bloqueia o cadastro se algo falhar — aluno entra no dashboard e
  // pode escolher curso/refazer plano depois.
  let courseEnrolled: { courseId: string; studyPlanId: string | null } | null = null
  if (courseSlug && typeof courseSlug === 'string') {
    try {
      const course = await prisma.course.findUnique({
        where: { slug: courseSlug },
        select: { id: true, active: true },
      })
      if (course?.active) {
        // Primeiro enrollment do usuário → automaticamente vira principal
        const hasOtherPrimary = await prisma.userCourseEnrollment.count({
          where: { userId: user.id, isPrimary: true },
        })
        const shouldMarkPrimary = hasOtherPrimary === 0
        await prisma.userCourseEnrollment.upsert({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          create: {
            userId: user.id,
            courseId: course.id,
            isActive: true,
            isPrimary: shouldMarkPrimary,
            source: 'signup',
          },
          update: {
            isActive: true,
            ...(shouldMarkPrimary && { isPrimary: true }),
          },
        })

        const planResult = await createDefaultStudyPlan({
          userId: user.id,
          courseId: course.id,
        }).catch((err) => {
          console.error('[completar-cadastro] create plan failed', err)
          return null
        })

        courseEnrolled = {
          courseId: course.id,
          studyPlanId: planResult?.studyPlanId ?? null,
        }
      }
    } catch (err) {
      console.error('[completar-cadastro] enroll failed', err)
    }
  }

  return NextResponse.json({ ok: true, courseEnrolled })
}
