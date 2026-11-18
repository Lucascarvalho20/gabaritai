import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import { getUserPlanLimits } from '@/lib/plan-access'
import { cadastroDeTeste, DOMINIO_CONTA_TESTE, emailDeTeste, situacaoDaConta } from '@/lib/contas-teste'

export const dynamic = 'force-dynamic'

/** GET — as contas de teste, com a situação de cada uma e os cursos dela, e os cursos que dá para liberar. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const [contas, cursos] = await Promise.all([
    prisma.user.findMany({
      where: { email: { endsWith: DOMINIO_CONTA_TESTE }, role: 'STUDENT' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, hasFullAccess: true,
        enrollments: {
          orderBy: { enrolledAt: 'asc' },
          select: { courseId: true, isActive: true, isPrimary: true, source: true, course: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.course.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
  ])
  const comSituacao = await Promise.all(contas.map(async (c) => ({
    ...c, situacao: situacaoDaConta(await getUserPlanLimits(c.id)),
  })))
  return NextResponse.json({ contas: comSituacao, cursos })
}

/** POST { nome } — nova conta de teste. A senha é aleatória e ninguém a conhece: só se entra pelo "entrar como". */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const { nome } = await req.json().catch(() => ({}))
  const limpo = typeof nome === 'string' ? nome.replace(/\s+/g, ' ').trim().slice(0, 60) : ''
  if (limpo.length < 3) return NextResponse.json({ message: 'Dê um nome à conta (ex.: "Aluno teste — 3 cursos").' }, { status: 400 })
  const conta = await prisma.user.create({
    data: {
      name: limpo,
      email: emailDeTeste(limpo),
      password: await bcrypt.hash(randomBytes(32).toString('base64url'), 12),
      role: 'STUDENT',
      emailVerified: true,
      ...cadastroDeTeste(),
    },
    select: { id: true, name: true, email: true },
  })
  await audit({
    actorId: auth.user.id, targetId: conta.id, action: 'USER_CREATED_BY_ADMIN',
    ip: getClientIp(req), userAgent: req.headers.get('user-agent'), metadata: { contaDeTeste: true },
  })
  return NextResponse.json({ conta })
}
