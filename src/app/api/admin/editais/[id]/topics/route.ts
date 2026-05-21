import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/editais/[id]/topics
 * Retorna a árvore de matérias → tópicos do edital, com:
 *  - quantas fontes anexadas a cada tópico
 *  - status do resumo (none, DRAFT, REVIEWED, PUBLISHED, REJECTED)
 *
 * É o que alimenta a UI de revisão de conteúdo.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    select: { id: true, courseId: true, titulo: true, ano: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  // Matérias do curso (CourseSubject)
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId: edital.courseId },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: 'asc' },
  })

  const result = await Promise.all(
    courseSubjects.map(async (cs) => {
      // Carrega tópicos (raiz + filhos) da matéria
      const topics = await prisma.topic.findMany({
        where: { subjectId: cs.subjectId, parentId: null },
        include: {
          children: {
            include: {
              _count: { select: { materials: true } },
            },
            orderBy: { order: 'asc' },
          },
          _count: { select: { materials: true } },
        },
        orderBy: { order: 'asc' },
      })

      // Pra cada tópico (raiz e filho), conta sources e busca status do resumo
      async function enrich(t: any): Promise<any> {
        const sourcesCount = await prisma.material.count({
          where: { topicId: t.id, origin: 'source' },
        })
        const resumo = await prisma.material.findFirst({
          where: { topicId: t.id, type: 'RESUMO' },
          select: { id: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        })
        return {
          id: t.id,
          name: t.name,
          order: t.order,
          sourcesCount,
          resumo: resumo ?? null,
          children: t.children ? await Promise.all(t.children.map(enrich)) : [],
        }
      }
      const enriched = await Promise.all(topics.map(enrich))

      return {
        subjectId: cs.subjectId,
        name: cs.subject.name,
        slug: cs.subject.slug,
        topics: enriched,
      }
    }),
  )

  return NextResponse.json({
    edital: { id: edital.id, titulo: edital.titulo, ano: edital.ano },
    materias: result,
  })
}
