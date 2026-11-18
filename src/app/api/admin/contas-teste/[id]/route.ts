import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit-log'
import { getClientIp } from '@/lib/rate-limit'
import { FONTE_CORTESIA } from '@/lib/plan-access'
import { ehContaDeTeste } from '@/lib/contas-teste'

export const dynamic = 'force-dynamic'

/** Matrícula criada pelo "acesso a todos os cursos": sai junto quando ele é desligado. */
const FONTE_TODOS = 'ADMIN_GIFT'

/**
 * PATCH — muda o acesso de uma conta de teste:
 *  { acao: 'liberar' | 'pausar' | 'reativar' | 'tirar', courseId } — um curso
 *    (liberar = cortesia: o curso vale como pago; pausar = stand-by, a matrícula
 *    fica e o acesso some; tirar = apaga a matrícula);
 *  { acao: 'todos', ligado } — acesso a todos os cursos, como um assinante do plano completo.
 * Conta que não é de teste: 404, como se não existisse.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const conta = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, role: true } })
  if (!ehContaDeTeste(conta)) return NextResponse.json({ message: 'Conta de teste não encontrada.' }, { status: 404 })
  const corpo = await req.json().catch(() => ({}))
  const acao = corpo?.acao
  const registrar = (action: 'USER_UPDATED_BY_ADMIN' | 'FULL_ACCESS_GRANTED' | 'FULL_ACCESS_REVOKED', metadata: object) =>
    audit({ actorId: auth.user!.id, targetId: conta!.id, action, ip: getClientIp(req), userAgent: req.headers.get('user-agent'), metadata: { contaDeTeste: true, ...metadata } })

  if (acao === 'todos') {
    const ligado = corpo?.ligado === true
    await prisma.user.update({ where: { id: conta!.id }, data: { hasFullAccess: ligado } })
    if (ligado) {
      const cursos = await prisma.course.findMany({ where: { active: true }, select: { id: true } })
      await prisma.userCourseEnrollment.createMany({
        data: cursos.map((c) => ({ userId: conta!.id, courseId: c.id, source: FONTE_TODOS, isActive: true })),
        skipDuplicates: true,
      })
    } else {
      await prisma.userCourseEnrollment.deleteMany({ where: { userId: conta!.id, source: FONTE_TODOS } })
    }
    await registrar(ligado ? 'FULL_ACCESS_GRANTED' : 'FULL_ACCESS_REVOKED', {})
    return NextResponse.json({ ok: true })
  }

  const courseId = typeof corpo?.courseId === 'string' ? corpo.courseId : ''
  const curso = courseId ? await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }) : null
  if (!curso) return NextResponse.json({ message: 'Curso não encontrado.' }, { status: 404 })
  const chave = { userId_courseId: { userId: conta!.id, courseId } }

  if (acao === 'liberar') {
    const temPrincipal = await prisma.userCourseEnrollment.count({ where: { userId: conta!.id, isPrimary: true } })
    await prisma.userCourseEnrollment.upsert({
      where: chave,
      create: { userId: conta!.id, courseId, source: FONTE_CORTESIA, isActive: true, isPrimary: temPrincipal === 0 },
      update: { source: FONTE_CORTESIA, isActive: true },
    })
  } else if (acao === 'pausar' || acao === 'reativar') {
    const r = await prisma.userCourseEnrollment.updateMany({ where: { userId: conta!.id, courseId }, data: { isActive: acao === 'reativar' } })
    if (!r.count) return NextResponse.json({ message: 'A conta não tem este curso.' }, { status: 404 })
  } else if (acao === 'tirar') {
    await prisma.userCourseEnrollment.deleteMany({ where: { userId: conta!.id, courseId } })
  } else {
    return NextResponse.json({ message: 'Ação desconhecida.' }, { status: 400 })
  }
  await registrar('USER_UPDATED_BY_ADMIN', { acao, courseId })
  return NextResponse.json({ ok: true })
}
