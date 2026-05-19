import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { Plan, Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const plan = searchParams.get('plan')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20', 10), 100)

  const where = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    ...(plan && plan !== 'ALL' && { plan: plan as Plan }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        emailVerified: true,
        role: true,
        plan: true,
        active: true,
        hasFullAccess: true,
        isBetaTester: true,
        accessNote: true,
        lastLoginAt: true,
        createdAt: true,
        profile: { select: { concursoLabel: true, lastStudyAt: true, streakDays: true, totalStudyMin: true } },
        _count: { select: { enrollments: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { name, email, username, password, plan, hasFullAccess, isBetaTester, accessNote, role, courseSlugs } = body

  if (!name || !password) {
    return NextResponse.json({ message: 'name e password obrigatórios' }, { status: 400 })
  }
  if (!email && !username) {
    return NextResponse.json({ message: 'Informe email OU username' }, { status: 400 })
  }
  if (String(password).length < 6) {
    return NextResponse.json({ message: 'Senha mínima 6 caracteres' }, { status: 400 })
  }

  const normalizedEmail = email ? String(email).toLowerCase().trim() : null
  const normalizedUsername = username
    ? String(username).toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '')
    : null

  if (normalizedUsername && normalizedUsername.length < 3) {
    return NextResponse.json({ message: 'Username deve ter mínimo 3 caracteres (letras, números, _ . -)' }, { status: 400 })
  }

  if (normalizedEmail) {
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (exists) return NextResponse.json({ message: 'E-mail já cadastrado' }, { status: 409 })
  }
  if (normalizedUsername) {
    const exists = await prisma.user.findUnique({ where: { username: normalizedUsername } })
    if (exists) return NextResponse.json({ message: 'Username já cadastrado' }, { status: 409 })
  }

  const hash = await bcrypt.hash(String(password), 12)
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      // Usuários criados pelo admin são pré-verificados (não passam por email verification)
      emailVerified: normalizedEmail ? true : false,
      password: hash,
      role: (role === 'ADMIN' ? Role.ADMIN : Role.STUDENT),
      plan: (plan as Plan) ?? Plan.FREE,
      hasFullAccess: Boolean(hasFullAccess),
      isBetaTester: Boolean(isBetaTester),
      accessNote: accessNote ? String(accessNote) : null,
      profile: { create: {} },
    },
    select: { id: true, name: true, email: true, username: true, role: true, plan: true, hasFullAccess: true },
  })

  await audit({
    actorId: auth.user.id,
    targetId: user.id,
    action: 'USER_CREATED_BY_ADMIN',
    metadata: { username: user.username, email: user.email, hasFullAccess: user.hasFullAccess },
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  // Se acesso total → matricular em todos os cursos ativos
  if (hasFullAccess) {
    const allCourses = await prisma.course.findMany({ where: { active: true }, select: { id: true } })
    await prisma.userCourseEnrollment.createMany({
      data: allCourses.map((c) => ({
        userId: user.id, courseId: c.id, source: 'ADMIN_GIFT', isActive: true,
      })),
      skipDuplicates: true,
    })
  } else if (Array.isArray(courseSlugs) && courseSlugs.length > 0) {
    const courses = await prisma.course.findMany({
      where: { slug: { in: courseSlugs }, active: true },
      select: { id: true },
    })
    await prisma.userCourseEnrollment.createMany({
      data: courses.map((c) => ({
        userId: user.id, courseId: c.id, source: 'ADMIN_GIFT', isActive: true,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(user, { status: 201 })
}
