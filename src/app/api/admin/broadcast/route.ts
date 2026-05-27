import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { notifyMany } from '@/lib/notify'

export const maxDuration = 60

// POST /api/admin/broadcast
// Body: { title, body, target: 'ALL' | 'COURSE' | 'PLAN', courseSlug?, plan?, dryRun? }
// Cria Notification pra cada user no alvo. Em paralelo, envia email se RESEND_API_KEY setado.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { title, body, target, courseSlug, plan, dryRun, link } = await req.json()
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
      notifyEmail: true,
    },
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldNotify: users.length,
      withEmail: users.filter((u) => u.notifyEmail && u.email).length,
    })
  }

  // Cria notificação in-app + email pra cada um (notify() respeita notifyEmail)
  await notifyMany(users.map((u) => u.id), {
    title,
    body,
    link: link || undefined,
    category: 'system',
    icon: 'Megaphone',
    email: true,
  })

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
