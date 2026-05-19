import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

// POST /api/admin/broadcast
// Body: { title, body, target: 'ALL' | 'COURSE' | 'PLAN', courseSlug?, plan?, dryRun? }
// Cria Notification pra cada user no alvo. Em paralelo, envia email se RESEND_API_KEY setado.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { title, body, target, courseSlug, plan, dryRun } = await req.json()
  if (!title || !body) return NextResponse.json({ message: 'title e body obrigatórios' }, { status: 400 })
  if (!['ALL', 'COURSE', 'PLAN'].includes(target)) {
    return NextResponse.json({ message: 'target inválido' }, { status: 400 })
  }

  let where: any = { role: 'STUDENT', active: true, archivedAt: null }

  if (target === 'COURSE') {
    if (!courseSlug) return NextResponse.json({ message: 'courseSlug obrigatório' }, { status: 400 })
    const course = await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } })
    if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })
    where.enrollments = { some: { courseId: course.id, isActive: true } }
  }

  if (target === 'PLAN') {
    if (!plan) return NextResponse.json({ message: 'plan obrigatório' }, { status: 400 })
    where.plan = plan
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true,
      notifyEmail: true, notifyTelegram: true, telegramChatId: true,
    },
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldNotify: users.length,
      withEmail: users.filter((u) => u.notifyEmail && u.email).length,
      withTelegram: users.filter((u) => u.notifyTelegram && u.telegramChatId).length,
    })
  }

  // 1. Cria notificação in-app pra TODOS
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      body,
    })),
  })

  // 2. Envia email pra quem optou (fire-and-forget)
  const usersComEmail = users.filter((u) => u.notifyEmail && u.email)
  if (usersComEmail.length > 0 && process.env.RESEND_API_KEY) {
    import('@/lib/email').then(({ sendEmail }) => {
      for (const u of usersComEmail) {
        sendEmail({
          to: u.email!,
          subject: `[Gabaritai] ${title}`,
          html: `<h2>${title}</h2><p>${body.replace(/\n/g, '<br>')}</p>`,
        }).catch((err) => console.warn('[broadcast] email falhou pra', u.email, err.message))
      }
    }).catch(() => {})
  }

  // 3. Envia Telegram pra quem conectou bot
  const usersComTelegram = users.filter((u) => u.notifyTelegram && u.telegramChatId)
  if (usersComTelegram.length > 0 && process.env.TELEGRAM_BOT_TOKEN) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    for (const u of usersComTelegram) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: u.telegramChatId,
          text: `*${title}*\n\n${body}`,
          parse_mode: 'Markdown',
        }),
      }).catch((err) => console.warn('[broadcast] telegram falhou', err))
    }
  }

  // Audita
  await prisma.auditLog.create({
    data: {
      actorId: auth.user.id,
      action: 'USER_UPDATED_BY_ADMIN',
      metadata: { kind: 'broadcast', target, courseSlug, plan, recipients: users.length, title },
    },
  })

  return NextResponse.json({ ok: true, recipients: users.length })
}
