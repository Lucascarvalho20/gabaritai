import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/editais/apply-diff
 *
 * Aplica as decisões do admin no diff entre edital novo e atual.
 *
 * Body: {
 *   courseId: string,
 *   ano: number,
 *   banca?: string,
 *   numero?: string,
 *   titulo: string,
 *   pdfHash?: string,
 *   materias: [...]  // estrutura completa do novo edital (mesma shape do save-structure)
 *
 *   decisions: {
 *     // Pra cada tópico removido, ação:
 *     removed: Array<{ topicId: string, action: 'archive' | 'keep' }>,
 *
 *     // Pra cada suspeita de renomeação, ação:
 *     renames: Array<{ oldTopicId: string, isRename: boolean }>,
 *
 *     // Por padrão: arquivar conteúdo de tópicos removidos (Materials + Flashcards),
 *     // MAS questões oficiais ficam ativas (são patrimônio).
 *   }
 * }
 *
 * Operação atômica:
 *  1. Desativa edital anterior
 *  2. Cria edital novo
 *  3. Cria estrutura nova (Subjects + Topics)
 *  4. Pra tópicos renomeados: merge — move Material/Question/Flashcard pro novo
 *  5. Pra tópicos removidos com action=archive: archivedAt na Topic, ARCHIVED em Material, isActive=false em Flashcard
 *  6. Questões OFICIAIS NUNCA são desativadas (sempre patrimônio)
 *  7. Loga cada mudança em EditalChangeLog
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { courseId, ano, banca, numero, titulo, pdfHash, pdfUrl, materias, decisions } = body

  if (!courseId || !ano || !titulo || !Array.isArray(materias) || !decisions) {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 })
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const previousEdital = await prisma.edital.findFirst({
    where: { courseId, isActive: true },
    select: { id: true },
  })

  let bancaId: string | null = null
  if (banca) {
    const b = await prisma.banca.findFirst({ where: { OR: [{ slug: banca }, { name: banca }] } })
    bancaId = b?.id ?? null
  }

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const removedDecisions = new Map<string, 'archive' | 'keep'>()
  for (const d of (decisions.removed ?? [])) removedDecisions.set(d.topicId, d.action)

  const renameDecisions = new Map<string, boolean>() // oldTopicId → isRename
  for (const d of (decisions.renames ?? [])) renameDecisions.set(d.oldTopicId, d.isRename)

  // Operação grande — fazemos fora de transaction porque tem chamadas longas e várias
  // ações independentes. Cada falha é logada.
  const log: Array<{ type: string; description: string; data?: any }> = []

  // 1. Desativa edital anterior
  if (previousEdital) {
    await prisma.edital.update({
      where: { id: previousEdital.id },
      data: { isActive: false },
    })
  }

  // 2. Cria edital novo
  const newEdital = await prisma.edital.create({
    data: {
      courseId, bancaId, ano, titulo,
      numero: numero ?? null,
      pdfHash: pdfHash ?? null,
      pdfUrl: pdfUrl ?? null,
      status: 'HOMOLOGADO',
      isActive: true,
    },
  })

  // 3. Cria estrutura nova — coleta os IDs dos tópicos novos pra usar em renames
  // Mapeia nomePath → novoTopicId
  const newTopicIds = new Map<string, string>()
  const newPath = (subject: string, topic: string, sub?: string, gc?: string) =>
    [subject, topic, sub, gc].filter(Boolean).join(' → ')

  for (let mi = 0; mi < materias.length; mi++) {
    const m = materias[mi]
    if (!m.nome) continue

    // Subject (reusa se já existe global)
    let subjectId = m.subjectId
    if (!subjectId) {
      const slug = slugify(m.nome)
      const existing = await prisma.subject.findFirst({ where: { OR: [{ slug }, { name: m.nome }] } })
      subjectId = existing ? existing.id : (await prisma.subject.create({ data: { name: m.nome, slug } })).id
    }

    // CourseSubject (re-cria os vinculos do edital atual)
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId, subjectId } },
      update: {},
      create: { courseId, subjectId, order: m.ordem ?? mi },
    }).catch(() => null)

    // Tópicos (re-cria, dedupe por nome+parent)
    async function createTopics(items: any[], parentId: string | null, parentPath: string[]) {
      for (let ti = 0; ti < items.length; ti++) {
        const t = items[ti]
        if (!t.nome) continue
        const existing = await prisma.topic.findFirst({
          where: { subjectId, name: t.nome, parentId: parentId ?? null, archivedAt: null },
        })
        const topic = existing ?? await prisma.topic.create({
          data: {
            subjectId, parentId: parentId ?? null, name: t.nome,
            slug: slugify(t.nome), order: t.ordem ?? ti,
          },
        })
        const path = [...parentPath, t.nome]
        newTopicIds.set(path.join(' → '), topic.id)
        if (Array.isArray(t.subtopicos) && t.subtopicos.length > 0) {
          await createTopics(t.subtopicos, topic.id, path)
        }
      }
    }
    await createTopics(m.topicos ?? [], null, [m.nome])
  }

  // 4. Pra renames marcados como tal: move conteúdo do tópico antigo → tópico novo
  let merged = 0
  for (const r of (decisions.renames ?? [])) {
    if (!r.isRename) continue
    const oldTopicId = r.oldTopicId
    const newTopicPath = r.newName // ex: "Matéria → Tópico"
    const newTopicId = newTopicIds.get(newTopicPath)
    if (!newTopicId) continue

    // Move materials, questions, flashcards do oldTopic pro newTopic
    const [mUpd, qUpd, fUpd] = await Promise.all([
      prisma.material.updateMany({ where: { topicId: oldTopicId }, data: { topicId: newTopicId } }),
      prisma.question.updateMany({ where: { topicId: oldTopicId }, data: { topicId: newTopicId } }),
      prisma.flashcard.updateMany({ where: { topicId: oldTopicId }, data: { topicId: newTopicId } }),
    ])

    // Marca o tópico antigo como arquivado + mergedInto
    await prisma.topic.update({
      where: { id: oldTopicId },
      data: {
        archivedAt: new Date(),
        archivedReason: 'mesclado em renomeação do edital ' + ano,
        mergedIntoId: newTopicId,
      },
    })

    log.push({
      type: 'RENAMED',
      description: `Renomeação: '${r.oldName}' → '${newTopicPath}'`,
      data: { oldTopicId, newTopicId, materialsMoved: mUpd.count, questionsMoved: qUpd.count, flashcardsMoved: fUpd.count },
    })
    merged++
  }

  // 5. Pra tópicos removidos com action=archive: arquiva
  let archived = 0
  let materialsArchived = 0
  let flashcardsArchived = 0
  for (const [oldTopicId, action] of removedDecisions.entries()) {
    if (action !== 'archive') continue

    const topic = await prisma.topic.findUnique({ where: { id: oldTopicId }, select: { name: true } })
    if (!topic) continue

    // Arquiva Topic
    await prisma.topic.update({
      where: { id: oldTopicId },
      data: { archivedAt: new Date(), archivedReason: 'removido do edital ' + ano },
    })

    // Materials: vão pra ARCHIVED
    const mUpd = await prisma.material.updateMany({
      where: { topicId: oldTopicId, status: { not: 'ARCHIVED' } },
      data: { status: 'ARCHIVED' },
    })
    materialsArchived += mUpd.count

    // Flashcards: inactive (preserva pro caso de voltar)
    const fUpd = await prisma.flashcard.updateMany({
      where: { topicId: oldTopicId, active: true },
      data: { active: false },
    })
    flashcardsArchived += fUpd.count

    // Questões OFICIAIS ficam ativas (patrimônio). Questões AI ficam inativas.
    await prisma.question.updateMany({
      where: { topicId: oldTopicId, source: 'AI_GENERATED', active: true },
      data: { active: false },
    })

    log.push({
      type: 'ARCHIVED',
      description: `Tópico arquivado: '${topic.name}'`,
      data: { topicId: oldTopicId, materialsArchived: mUpd.count, flashcardsArchived: fUpd.count },
    })
    archived++
  }

  // Loga adições (tópicos novos foram criados acima via createTopics)
  const added = newTopicIds.size - merged
  if (added > 0) {
    log.push({ type: 'ADDED', description: `${added} tópicos novos`, data: { count: added } })
  }

  // 6. Cria entradas no EditalChangeLog
  for (const entry of log) {
    await prisma.editalChangeLog.create({
      data: {
        newEditalId: newEdital.id,
        previousEditalId: previousEdital?.id ?? null,
        changeType: entry.type,
        description: entry.description,
        diffData: (entry.data ?? null) as any,
      },
    }).catch(() => null)
  }

  return NextResponse.json({
    ok: true,
    editalId: newEdital.id,
    summary: {
      added,
      removed: archived,
      kept: removedDecisions.size - archived,
      merged,
      materialsArchived,
      flashcardsArchived,
    },
    log,
  })
}
