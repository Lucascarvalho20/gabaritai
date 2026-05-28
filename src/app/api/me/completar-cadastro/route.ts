import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isValidCpf, hashCpf, encryptCpf } from '@/lib/cpf'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import { telegramTrialFraudAttempt } from '@/lib/telegram'
import { createDefaultStudyPlan } from '@/lib/create-default-study-plan'

/**
 * POST /api/me/completar-cadastro
 * Body: { cpf: string, phone: string }
 *
 * Usado depois do cadastro via Google OAuth (que não pede CPF/telefone).
 * Valida CPF (algoritmo + banlist + dedup), salva criptografado, e grava telefone.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const ip = getClientIp(req)
  const { cpf, phone, courseSlug } = await req.json()

  if (!cpf || !phone) {
    return NextResponse.json({ message: 'CPF e telefone obrigatórios' }, { status: 400 })
  }
  if (!isValidCpf(cpf)) {
    return NextResponse.json({ message: 'CPF inválido. Verifique os dígitos.' }, { status: 400 })
  }
  const cleanPhone = String(phone).replace(/\D/g, '')
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return NextResponse.json({ message: 'Telefone deve ter DDD + número (10 ou 11 dígitos)' }, { status: 400 })
  }

  const cpfHashed = hashCpf(cpf)
  const cpfEncryptedValue = encryptCpf(cpf)

  // Banlist
  const banned = await prisma.cpfBlocklist.findUnique({ where: { cpfHash: cpfHashed } })
  if (banned) {
    await audit({
      actorId: user.id,
      action: 'TRIAL_BLOCKED_DUPLICATE',
      ip,
      metadata: { reason: 'cpf_banned', oauth: true },
    })
    return NextResponse.json({ message: 'Cadastro indisponível. Entre em contato com o suporte.' }, { status: 403 })
  }

  // Dedup — só rejeita se for OUTRO usuário
  const dup = await prisma.user.findFirst({
    where: { cpfHash: cpfHashed, NOT: { id: user.id } },
    select: { id: true },
  })
  if (dup) {
    await audit({
      actorId: user.id,
      action: 'TRIAL_BLOCKED_DUPLICATE',
      ip,
      metadata: { reason: 'cpf_duplicate_oauth' },
    })
    telegramTrialFraudAttempt({
      reason: 'CPF já cadastrado em outra conta (via OAuth)',
      ip,
      attemptedEmail: user.email ?? '(sem email)',
    }).catch(() => {})
    return NextResponse.json({ message: 'Este CPF já está cadastrado em outra conta' }, { status: 409 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      cpfHash: cpfHashed,
      cpfEncrypted: cpfEncryptedValue,
      phone: cleanPhone,
    },
  })

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
        await prisma.userCourseEnrollment.upsert({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          create: {
            userId: user.id,
            courseId: course.id,
            isActive: true,
            source: 'signup',
          },
          update: { isActive: true },
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
