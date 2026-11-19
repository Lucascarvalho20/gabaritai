/**
 * As quatro contas de teste padrão, criadas com um clique no admin: um aluno
 * de 1 curso, um de 2 cursos parecidos, um com todos os cursos e uma conta
 * gratuita. E-mails fixos: rodar de novo não duplica, e o que o admin mudou
 * numa conta que já existe fica como está.
 */
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { FONTE_CORTESIA } from './plan-access'
import { cadastroDeTeste } from './contas-teste'

export const CONTAS_PADRAO = [
  { email: 'aluno-1-curso@exemplo.invalid', nome: 'Aluno teste — 1 curso', cursos: 1 },
  { email: 'aluno-2-cursos@exemplo.invalid', nome: 'Aluno teste — 2 cursos', cursos: 2 },
  { email: 'aluno-todos-os-cursos@exemplo.invalid', nome: 'Aluno teste — todos os cursos', cursos: 'todos' },
  { email: 'aluno-gratuito@exemplo.invalid', nome: 'Aluno teste — conta gratuita', cursos: 0 },
] as const

/** Matrícula do "acesso a todos os cursos" — a mesma origem do painel. */
const FONTE_TODOS = 'ADMIN_GIFT'
/** Os dois cursos parecidos de que a calculadora gosta (juntar dois cursos); sem eles, os de mais provas. */
const PREFERIDOS = ['pf-agente', 'pf-escrivao']

async function cursosParaTeste(): Promise<string[]> {
  const cursos = await prisma.course.findMany({
    where: { active: true },
    select: { id: true, slug: true, _count: { select: { provas: true } } },
  })
  const preferidos = PREFERIDOS.map((s) => cursos.find((c) => c.slug === s)).filter((c): c is (typeof cursos)[number] => !!c)
  const resto = cursos.filter((c) => !PREFERIDOS.includes(c.slug)).sort((a, b) => b._count.provas - a._count.provas)
  return [...preferidos, ...resto].map((c) => c.id)
}

export async function criarContasPadrao(): Promise<{ criadas: string[]; jaExistiam: string[] }> {
  const ordem = await cursosParaTeste()
  const criadas: string[] = []
  const jaExistiam: string[] = []
  for (const p of CONTAS_PADRAO) {
    if (await prisma.user.findUnique({ where: { email: p.email }, select: { id: true } })) {
      jaExistiam.push(p.email)
      continue
    }
    const conta = await prisma.user.create({
      data: {
        name: p.nome, email: p.email, role: 'STUDENT', emailVerified: true,
        password: await bcrypt.hash(randomBytes(32).toString('base64url'), 12),
        hasFullAccess: p.cursos === 'todos',
        ...cadastroDeTeste(),
      },
      select: { id: true },
    })
    if (p.cursos === 'todos') {
      const ativos = await prisma.course.findMany({ where: { active: true }, select: { id: true } })
      await prisma.userCourseEnrollment.createMany({
        data: ativos.map((c) => ({ userId: conta.id, courseId: c.id, source: FONTE_TODOS, isActive: true })),
        skipDuplicates: true,
      })
    } else if (p.cursos > 0) {
      await prisma.userCourseEnrollment.createMany({
        data: ordem.slice(0, p.cursos).map((courseId, i) => ({ userId: conta.id, courseId, source: FONTE_CORTESIA, isActive: true, isPrimary: i === 0 })),
      })
    }
    criadas.push(conta.id)
  }
  return { criadas, jaExistiam }
}
