import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/editais/diff
 *
 * Compara a estrutura EXTRAÍDA de um edital novo contra a do edital ATIVO atual
 * do mesmo curso. Devolve um diff anotado pra UI mostrar ao admin.
 *
 * Body: {
 *   courseId: string,
 *   materias: [{nome, topicos: [{nome, subtopicos: [...]}]}]  // mesma shape do save-structure
 * }
 *
 * Retorna:
 *   {
 *     hasCurrentEdital: bool,
 *     currentEditalId?: string,
 *     diff: {
 *       added:    { name, where, suggestedSubjectId? }[],         // tópicos/matérias novos
 *       removed:  { topicId, name, subjectName, hasContent }[],   // do edital atual, fora do novo
 *       unchanged: { topicId, name }[],                            // mesmo nome literal nos 2
 *       renamed_suspected: { oldTopicId, oldName, newName, similarity }[]  // matching difuso
 *     }
 *   }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { courseId, materias } = body
  if (!courseId || !Array.isArray(materias)) {
    return NextResponse.json({ message: 'courseId e materias obrigatórios' }, { status: 400 })
  }

  // Edital atual ativo
  const current = await prisma.edital.findFirst({
    where: { courseId, isActive: true },
    select: { id: true, titulo: true, ano: true },
  })
  if (!current) {
    return NextResponse.json({
      hasCurrentEdital: false,
      diff: { added: [], removed: [], unchanged: [], renamed_suspected: [] },
    })
  }

  // Tópicos atuais do curso (via CourseSubject → Subject → Topic)
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId },
    include: {
      subject: {
        select: {
          id: true, name: true,
          topics: {
            where: { parentId: null, archivedAt: null },
            select: {
              id: true, name: true,
              children: {
                where: { archivedAt: null },
                select: { id: true, name: true, children: { select: { id: true, name: true } } },
              },
              _count: { select: { materials: true, questions: true, flashcards: true } },
            },
          },
        },
      },
    },
  })

  // Flatten estrutura atual num array { topicId, name, fullPath, subjectName, hasContent }
  type CurTopic = { topicId: string; name: string; fullPath: string; subjectName: string; hasContent: boolean }
  const current_flat: CurTopic[] = []
  for (const cs of courseSubjects) {
    for (const t of cs.subject.topics) {
      const hasContent = t._count.materials > 0 || t._count.questions > 0 || t._count.flashcards > 0
      current_flat.push({
        topicId: t.id,
        name: t.name,
        fullPath: `${cs.subject.name} → ${t.name}`,
        subjectName: cs.subject.name,
        hasContent,
      })
      for (const c of t.children) {
        current_flat.push({
          topicId: c.id, name: c.name,
          fullPath: `${cs.subject.name} → ${t.name} → ${c.name}`,
          subjectName: cs.subject.name, hasContent: false,
        })
        for (const gc of c.children) {
          current_flat.push({
            topicId: gc.id, name: gc.name,
            fullPath: `${cs.subject.name} → ${t.name} → ${c.name} → ${gc.name}`,
            subjectName: cs.subject.name, hasContent: false,
          })
        }
      }
    }
  }

  // Flatten estrutura nova
  type NewTopic = { name: string; fullPath: string; subjectName: string }
  const new_flat: NewTopic[] = []
  for (const m of materias) {
    for (const t of (m.topicos ?? [])) {
      new_flat.push({ name: t.nome, fullPath: `${m.nome} → ${t.nome}`, subjectName: m.nome })
      for (const c of (t.subtopicos ?? [])) {
        new_flat.push({ name: c.nome, fullPath: `${m.nome} → ${t.nome} → ${c.nome}`, subjectName: m.nome })
      }
    }
  }

  // Normaliza nome pra comparação (lowercase, sem acentos, sem pontuação)
  const norm = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim()

  const curByNorm = new Map<string, CurTopic>()
  for (const c of current_flat) curByNorm.set(norm(c.fullPath), c)

  const newByNorm = new Map<string, NewTopic>()
  for (const n of new_flat) newByNorm.set(norm(n.fullPath), n)

  // Unchanged: mesma fullPath normalizada nos 2
  const unchanged: { topicId: string; name: string }[] = []
  const newMatched = new Set<string>()
  const curMatched = new Set<string>()

  for (const [key, cur] of curByNorm.entries()) {
    if (newByNorm.has(key)) {
      unchanged.push({ topicId: cur.topicId, name: cur.fullPath })
      newMatched.add(key)
      curMatched.add(key)
    }
  }

  // Added: no novo mas não no atual
  const added: { name: string; where: string; subjectName: string }[] = []
  for (const [key, n] of newByNorm.entries()) {
    if (!newMatched.has(key)) {
      added.push({ name: n.name, where: n.fullPath, subjectName: n.subjectName })
    }
  }

  // Removed: no atual mas não no novo
  const removedRaw: CurTopic[] = []
  for (const [key, cur] of curByNorm.entries()) {
    if (!curMatched.has(key)) removedRaw.push(cur)
  }

  // Suspected rename: pra cada removed, busca added com similaridade > 0.6 (token overlap)
  const renamed_suspected: { oldTopicId: string; oldName: string; newName: string; similarity: number }[] = []
  const renamedAdded = new Set<string>()
  const renamedRemoved = new Set<string>()
  for (const r of removedRaw) {
    const rTokens = new Set(norm(r.name).split(' ').filter((t) => t.length > 2))
    let best: { added: typeof added[number]; sim: number } | null = null
    for (const a of added) {
      if (renamedAdded.has(a.where)) continue
      // Só considera renomeação dentro da MESMA matéria
      if (norm(a.subjectName) !== norm(r.subjectName)) continue
      const aTokens = new Set(norm(a.name).split(' ').filter((t) => t.length > 2))
      const inter = [...rTokens].filter((t) => aTokens.has(t)).length
      const uni = new Set([...rTokens, ...aTokens]).size
      const sim = uni === 0 ? 0 : inter / uni
      if (sim >= 0.5 && (!best || sim > best.sim)) {
        best = { added: a, sim }
      }
    }
    if (best) {
      renamed_suspected.push({
        oldTopicId: r.topicId, oldName: r.fullPath, newName: best.added.where, similarity: Math.round(best.sim * 100) / 100,
      })
      renamedAdded.add(best.added.where)
      renamedRemoved.add(r.topicId)
    }
  }

  const removed = removedRaw
    .filter((r) => !renamedRemoved.has(r.topicId))
    .map((r) => ({ topicId: r.topicId, name: r.fullPath, subjectName: r.subjectName, hasContent: r.hasContent }))

  const addedFiltered = added.filter((a) => !renamedAdded.has(a.where))

  return NextResponse.json({
    hasCurrentEdital: true,
    currentEditalId: current.id,
    currentEditalTitulo: current.titulo,
    diff: {
      added: addedFiltered,
      removed,
      unchanged,
      renamed_suspected,
    },
    stats: {
      total_atual: current_flat.length,
      total_novo: new_flat.length,
      adicionados: addedFiltered.length,
      removidos: removed.length,
      renomeados_provaveis: renamed_suspected.length,
      inalterados: unchanged.length,
    },
  })
}
