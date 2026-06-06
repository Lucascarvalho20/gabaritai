import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/cursos/[courseId]/topicos
 *
 * Lista TODAS as matérias do curso (via EditalSubject do edital ativo) com seus
 * tópicos, marcando quais têm material publicado e quais o aluno já estudou.
 *
 * Usado pra:
 *  - Página do curso (overview com progresso por matéria)
 *  - Cronograma (saber quanto falta zerar o edital)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  // 1) Edital ativo do curso
  const edital = await prisma.edital.findFirst({
    where: { courseId: params.courseId, isActive: true },
    include: {
      subjects: {
        include: {
          subject: {
            include: {
              topics: {
                where: { archivedAt: null },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
                select: {
                  id: true,
                  name: true,
                  description: true,
                  order: true,
                  weight: true,
                  materials: {
                    where: { status: 'PUBLISHED', active: true },
                    select: { id: true, updatedAt: true, resumo: { select: { id: true } } },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!edital) {
    return NextResponse.json({
      edital: null,
      materias: [],
      totalTopicos: 0,
      topicosEstudados: 0,
      coverage: 0,
    })
  }

  // 2) topic_attempts do aluno (lookup rápido)
  const topicIds = edital.subjects.flatMap((es) => es.subject.topics.map((t) => t.id))
  const attempts = topicIds.length
    ? await prisma.topicAttempt.findMany({
        where: { userId: auth.user.id, topicId: { in: topicIds } },
        select: { topicId: true, completedAt: true, masteryScore: true },
      })
    : []
  const byTopic = new Map(attempts.map((a) => [a.topicId, a]))

  // 3) Monta resposta por matéria
  let totalTopicos = 0
  let topicosEstudados = 0
  let topicosComMaterial = 0

  const materias = edital.subjects.map((es) => {
    const topicos = es.subject.topics.map((t) => {
      const att = byTopic.get(t.id)
      const studied = !!att?.completedAt
      const hasMaterial = t.materials.length > 0
      totalTopicos++
      if (studied) topicosEstudados++
      if (hasMaterial) topicosComMaterial++
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        order: t.order,
        weight: t.weight,
        hasMaterial,
        hasResumo: hasMaterial && !!t.materials[0]?.resumo,
        studied,
        masteryScore: att?.masteryScore ?? 0,
      }
    })

    const estudadosMat = topicos.filter((t) => t.studied).length
    const totalMat = topicos.length
    return {
      subjectId: es.subject.id,
      slug: es.subject.slug,
      name: es.subject.name,
      ordem: es.order,
      pesoEdital: es.weight,
      programa: es.programa,
      expectedQuestions: es.expectedQuestions,
      totalTopicos: totalMat,
      topicosEstudados: estudadosMat,
      coverage: totalMat ? Math.round((estudadosMat / totalMat) * 100) : 0,
      topicos,
    }
  })

  return NextResponse.json({
    edital: {
      id: edital.id,
      numero: edital.numero,
      ano: edital.ano,
    },
    materias,
    totalTopicos,
    topicosEstudados,
    topicosComMaterial,
    coverage: totalTopicos ? Math.round((topicosEstudados / totalTopicos) * 100) : 0,
    coverageMaterial: totalTopicos
      ? Math.round((topicosComMaterial / totalTopicos) * 100)
      : 0,
  })
}
