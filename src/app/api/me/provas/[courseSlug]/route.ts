import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/provas/[courseSlug]
 *
 * Lista todas as provas oficiais cadastradas pra um curso, agrupadas por ano.
 * Inclui status: aluno já fez? quantas vezes? última nota?
 *
 * Provas vêm do model Prova (questões com source='OFFICIAL', provaId).
 */
export async function GET(req: NextRequest, { params }: { params: { courseSlug: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { slug: params.courseSlug },
    select: { id: true, name: true, slug: true, cargo: true, orgao: true },
  })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  // Provas do curso (mais novas primeiro)
  const provas = await prisma.prova.findMany({
    where: { courseId: course.id },
    include: {
      banca: { select: { name: true, slug: true } },
      _count: { select: { questions: true } },
    },
    orderBy: [{ ano: 'desc' }, { createdAt: 'desc' }],
  })

  if (provas.length === 0) {
    return NextResponse.json({
      course,
      provasPorAno: [],
      message: 'Esse curso ainda não tem provas oficiais cadastradas. Logo logo a equipe vai adicionar.',
    })
  }

  // Pra cada prova, busca tentativas do aluno (via MockExam derivado)
  const provaIds = provas.map((p) => p.id)
  const mockExams = await prisma.mockExam.findMany({
    where: {
      type: 'PERSONALIZADO',
      title: { in: provas.map((p) => `Prova ${p.titulo}`) },
    },
    select: { id: true, title: true },
  })
  const mockByTitle = new Map(mockExams.map((m) => [m.title, m.id]))

  const allResults = await prisma.mockExamResult.findMany({
    where: {
      userId: user.id,
      mockExamId: { in: mockExams.map((m) => m.id) },
    },
    select: { mockExamId: true, score: true, status: true, finishedAt: true, startedAt: true },
    orderBy: { finishedAt: 'desc' },
  })

  // Agrupa por ano
  const porAno = new Map<number, typeof provas>()
  for (const p of provas) {
    if (!porAno.has(p.ano)) porAno.set(p.ano, [])
    porAno.get(p.ano)!.push(p)
  }

  const provasPorAno = Array.from(porAno.entries())
    .sort(([a], [b]) => b - a)
    .map(([ano, provasDoAno]) => ({
      ano,
      provas: provasDoAno.map((p) => {
        const mockExamId = mockByTitle.get(`Prova ${p.titulo}`)
        const tentativas = mockExamId ? allResults.filter((r) => r.mockExamId === mockExamId) : []
        const submetidas = tentativas.filter((t) => t.status === 'SUBMITTED' || t.status === 'EXPIRED')
        const ultimaNota = submetidas[0]?.score ?? null
        const melhorNota = submetidas.length > 0
          ? Math.max(...submetidas.map((t) => t.score))
          : null
        return {
          id: p.id,
          titulo: p.titulo,
          ano: p.ano,
          etapa: p.etapa,
          cargo: p.cargo,
          banca: p.banca?.name ?? null,
          bancaSlug: p.banca?.slug ?? null,
          totalQuestoes: p._count.questions,
          stats: {
            tentativas: submetidas.length,
            ultimaNota,
            melhorNota,
            ultimaTentativaEm: submetidas[0]?.finishedAt ?? null,
          },
        }
      }),
    }))

  return NextResponse.json({ course, provasPorAno })
}
