import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/subjects/[id]/topics-suggest
 *
 * Recebe uma lista de NOMES de tópicos (vindos da extração de edital) e
 * busca tópicos existentes na MESMA matéria global que parecem o mesmo.
 *
 * Retorna sugestões de reuso pra evitar duplicação cross-curso.
 *
 * Body: { topicNames: string[] }
 * Retorna: {
 *   suggestions: [{
 *     query: string,                          // nome consultado
 *     matches: [{ topicId, name, similarity, coursesUsing, materialsCount, questionsCount }]
 *   }]
 * }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const subjectId = params.id
  const body = await req.json()
  const topicNames: string[] = Array.isArray(body.topicNames) ? body.topicNames : []
  if (topicNames.length === 0) return NextResponse.json({ suggestions: [] })

  // Tópicos existentes desta matéria (não arquivados)
  const existing = await prisma.topic.findMany({
    where: { subjectId, archivedAt: null },
    select: {
      id: true, name: true, slug: true,
      _count: { select: { materials: true, questions: true, flashcards: true } },
    },
  })
  if (existing.length === 0) return NextResponse.json({ suggestions: [] })

  // Mapa de Topic → cursos que usam (via Subject → CourseSubject)
  const allCS = await prisma.courseSubject.findMany({
    where: { subjectId },
    include: { course: { select: { id: true, name: true } } },
  })
  const coursesUsingSubject = allCS.map((c) => c.course.name)

  const norm = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim()

  function similarity(a: string, b: string): number {
    const aT = new Set(norm(a).split(' ').filter((t) => t.length > 2))
    const bT = new Set(norm(b).split(' ').filter((t) => t.length > 2))
    if (aT.size === 0 || bT.size === 0) return norm(a) === norm(b) ? 1 : 0
    const inter = [...aT].filter((t) => bT.has(t)).length
    const uni = new Set([...aT, ...bT]).size
    return inter / uni
  }

  const suggestions = topicNames.map((query) => {
    const matches = existing
      .map((t) => ({
        topicId: t.id,
        name: t.name,
        similarity: Math.round(similarity(query, t.name) * 100) / 100,
        coursesUsing: coursesUsingSubject,
        materialsCount: t._count.materials,
        questionsCount: t._count.questions,
        flashcardsCount: t._count.flashcards,
      }))
      .filter((m) => m.similarity >= 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
    return { query, matches }
  }).filter((s) => s.matches.length > 0)

  return NextResponse.json({ suggestions })
}
