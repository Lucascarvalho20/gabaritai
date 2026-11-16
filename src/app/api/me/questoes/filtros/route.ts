import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/questoes/filtros[?subjectId=...]
 *
 * Opções dos filtros da aba Questões, cada uma com quantas questões existem
 * — opção que não traz nada não aparece. Matérias e provas ficam no escopo
 * dos cursos do aluno (sem matrícula, o banco todo), igual à lista.
 * Com `subjectId`, devolve também os assuntos (tópicos) daquela matéria.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const subjectId = new URL(req.url).searchParams.get('subjectId')?.trim() || null
  const ativas = { active: true, anulada: false }

  const vinculos = await prisma.courseSubject.findMany({
    where: { course: { enrollments: { some: { userId: user.id, isActive: true } } } },
    select: { subjectId: true },
    distinct: ['subjectId'],
  })
  const escopo = vinculos.length > 0 ? { subjectId: { in: vinculos.map((v) => v.subjectId) } } : {}

  const [porMateria, porProva, porAssunto, bancaSlugs, anosRows, bancasFull] = await Promise.all([
    prisma.question.groupBy({ by: ['subjectId'], where: { ...ativas, ...escopo, subjectId: escopo.subjectId ?? { not: null } }, _count: { _all: true } }),
    prisma.question.groupBy({ by: ['provaId'], where: { ...ativas, provaId: { not: null } }, _count: { _all: true } }),
    subjectId
      ? prisma.question.groupBy({ by: ['topicId'], where: { ...ativas, subjectId, topicId: { not: null } }, _count: { _all: true } })
      : Promise.resolve([]),
    prisma.question.findMany({ where: { ...ativas, bancaSlug: { not: null } }, select: { bancaSlug: true }, distinct: ['bancaSlug'], take: 50 }),
    prisma.question.findMany({ where: { ...ativas, ano: { not: null } }, select: { ano: true }, distinct: ['ano'], take: 30, orderBy: { ano: 'desc' } }),
    prisma.banca.findMany({ select: { slug: true, name: true } }),
  ])

  const [materias, provas, assuntos] = await Promise.all([
    prisma.subject.findMany({ where: { id: { in: porMateria.map((m) => m.subjectId!) } }, select: { id: true, name: true } }),
    prisma.prova.findMany({
      where: {
        id: { in: porProva.map((p) => p.provaId!) },
        // A prova entra se for de um curso do aluno (ou se não houver matrícula).
        ...(vinculos.length > 0 && { OR: [{ courseId: null }, { course: { enrollments: { some: { userId: user.id, isActive: true } } } }] }),
      },
      select: { id: true, titulo: true, ano: true },
    }),
    porAssunto.length > 0
      ? prisma.topic.findMany({ where: { id: { in: porAssunto.map((a) => a.topicId!) } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ])

  const conta = <T extends { _count: { _all: number } }>(linhas: T[], chave: (l: T) => string | null) =>
    new Map(linhas.map((l) => [chave(l), l._count._all]))
  const qtdMateria = conta(porMateria, (l) => l.subjectId)
  const qtdProva = conta(porProva, (l) => l.provaId)
  const qtdAssunto = conta(porAssunto as { topicId: string | null; _count: { _all: number } }[], (l) => l.topicId)

  const bancaByName = new Map(bancasFull.map((b) => [b.slug, b.name]))

  return NextResponse.json({
    materias: materias
      .map((m) => ({ id: m.id, name: m.name, total: qtdMateria.get(m.id) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    provas: provas
      .map((p) => ({ id: p.id, titulo: p.titulo, ano: p.ano, total: qtdProva.get(p.id) ?? 0 }))
      .sort((a, b) => b.ano - a.ano || a.titulo.localeCompare(b.titulo, 'pt-BR')),
    assuntos: assuntos
      .map((t) => ({ id: t.id, name: t.name, total: qtdAssunto.get(t.id) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR')),
    bancas: bancaSlugs
      .map((b) => ({ slug: b.bancaSlug!, name: bancaByName.get(b.bancaSlug!) ?? b.bancaSlug! }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    anos: anosRows.map((r) => r.ano!).filter((a) => typeof a === 'number').sort((a, b) => b - a),
  })
}
