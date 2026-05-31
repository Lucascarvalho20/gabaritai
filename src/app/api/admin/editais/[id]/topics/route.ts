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
 * OTIMIZADO: 3 queries totais. Antes fazia ~2 queries por tópico
 * (count materials + findFirst resumo), o que pra um edital de 15 matérias
 * com ~20 tópicos cada virava 600+ queries e travava a página.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    select: { id: true, courseId: true, titulo: true, ano: true },
  })
  if (!edital) return NextResponse.json({ message: 'Edital não encontrado' }, { status: 404 })

  // QUERY 1 — Matérias do curso
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId: edital.courseId },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: 'asc' },
  })
  const subjectIds = courseSubjects.map((cs) => cs.subjectId)

  if (subjectIds.length === 0) {
    return NextResponse.json({
      edital: { id: edital.id, titulo: edital.titulo, ano: edital.ano },
      materias: [],
    })
  }

  // QUERY 2 — TODOS os tópicos das matérias do edital (raiz + filhos)
  const allTopics = await prisma.topic.findMany({
    where: { subjectId: { in: subjectIds }, archivedAt: null },
    select: { id: true, name: true, order: true, parentId: true, subjectId: true },
    orderBy: { order: 'asc' },
  })
  const topicIds = allTopics.map((t) => t.id)

  // QUERY 3 — TODOS os materials desses tópicos (filtra por type e origin em memória)
  const materials = topicIds.length > 0
    ? await prisma.material.findMany({
        where: { topicId: { in: topicIds } },
        select: { id: true, topicId: true, type: true, origin: true, status: true, updatedAt: true },
      })
    : []

  // Agrega em memória
  const sourcesCountByTopic = new Map<string, number>()
  const resumoByTopic = new Map<string, { id: string; status: string; updatedAt: Date }>()
  for (const m of materials) {
    if (!m.topicId) continue
    if (m.origin === 'source') {
      sourcesCountByTopic.set(m.topicId, (sourcesCountByTopic.get(m.topicId) ?? 0) + 1)
    }
    if (m.type === 'RESUMO') {
      const existing = resumoByTopic.get(m.topicId)
      if (!existing || m.updatedAt > existing.updatedAt) {
        resumoByTopic.set(m.topicId, { id: m.id, status: String(m.status), updatedAt: m.updatedAt })
      }
    }
  }

  // Constrói árvore matéria → tópicos (raiz) → children
  type EnrichedTopic = {
    id: string
    name: string
    order: number
    sourcesCount: number
    resumo: { id: string; status: string; updatedAt: string } | null
    children: EnrichedTopic[]
  }

  function enrich(t: { id: string; name: string; order: number }): EnrichedTopic {
    const resumo = resumoByTopic.get(t.id)
    return {
      id: t.id,
      name: t.name,
      order: t.order,
      sourcesCount: sourcesCountByTopic.get(t.id) ?? 0,
      resumo: resumo
        ? { id: resumo.id, status: resumo.status, updatedAt: resumo.updatedAt.toISOString() }
        : null,
      children: [],
    }
  }

  // Indexa tópicos por parentId
  const childrenByParent = new Map<string, typeof allTopics>()
  for (const t of allTopics) {
    if (!t.parentId) continue
    if (!childrenByParent.has(t.parentId)) childrenByParent.set(t.parentId, [])
    childrenByParent.get(t.parentId)!.push(t)
  }

  function buildSubtree(t: { id: string; name: string; order: number }): EnrichedTopic {
    const node = enrich(t)
    const children = childrenByParent.get(t.id) ?? []
    node.children = children.map(buildSubtree)
    return node
  }

  // Por matéria, pega tópicos raiz e monta a árvore
  const topicsBySubject = new Map<string, typeof allTopics>()
  for (const t of allTopics) {
    if (t.parentId) continue
    if (!topicsBySubject.has(t.subjectId)) topicsBySubject.set(t.subjectId, [])
    topicsBySubject.get(t.subjectId)!.push(t)
  }

  const result = courseSubjects.map((cs) => ({
    subjectId: cs.subjectId,
    name: cs.subject.name,
    slug: cs.subject.slug,
    topics: (topicsBySubject.get(cs.subjectId) ?? []).map(buildSubtree),
  }))

  return NextResponse.json({
    edital: { id: edital.id, titulo: edital.titulo, ano: edital.ano },
    materias: result,
  })
}
