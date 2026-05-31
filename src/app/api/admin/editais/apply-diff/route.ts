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
  const {
    courseId, ano, banca, numero, titulo, pdfHash, pdfUrl, materias, decisions,
    cargoNome, vagas, salario, escolaridade,
    totalQuestoes, duracaoMin, hasRedacao, wrongAnnulsRight, examFormat,
    regraAnulacaoTexto,
    dataAbertura, dataInscricaoIni, dataInscricaoFim, dataProva, taxaInscricao,
  } = body

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

  // Mapeia examFormat string → enum Prisma
  const examFormatEnum = (() => {
    const v = String(examFormat ?? '').toUpperCase()
    if (v === 'CE' || v === 'ME_5' || v === 'ME_4' || v === 'MISTA') return v
    return null
  })()

  const parseDate = (v: any): Date | null => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  // 2. Cria edital novo com TODOS os metadados
  const newEdital = await prisma.edital.create({
    data: {
      courseId, bancaId, ano, titulo,
      numero: numero ?? null,
      pdfHash: pdfHash ?? null,
      pdfUrl: pdfUrl ?? null,
      cargos: cargoNome ? [{ nome: cargoNome }] : undefined,
      vagas: vagas ?? null,
      salario: salario ?? null,
      escolaridade: escolaridade ?? null,
      totalQuestoes: totalQuestoes ?? null,
      duracaoMin: duracaoMin ?? null,
      hasRedacao: hasRedacao ?? false,
      wrongAnnulsRight: wrongAnnulsRight ?? false,
      examFormat: examFormatEnum as any,
      taxaInscricao: taxaInscricao ?? null,
      dataAbertura: parseDate(dataAbertura),
      dataInscricaoIni: parseDate(dataInscricaoIni),
      dataInscricaoFim: parseDate(dataInscricaoFim),
      dataProva: parseDate(dataProva),
      rawData: regraAnulacaoTexto ? { regraAnulacaoTexto } : undefined,
      status: 'HOMOLOGADO',
      isActive: true,
    },
  })

  // 3. Cria estrutura nova — coleta os IDs dos tópicos novos pra usar em renames
  // Mapeia nomePath → novoTopicId
  const newTopicIds = new Map<string, string>()
  const newPath = (subject: string, topic: string, sub?: string, gc?: string) =>
    [subject, topic, sub, gc].filter(Boolean).join(' → ')

  const materiasValidas = materias.filter((m: any) => m?.nome)

  // ── ETAPA A — Pré-carrega subjects e cria os faltantes em batch ─────
  const subjectNames: string[] = materiasValidas.map((m: any) => m.nome)
  const subjectSlugs = subjectNames.map((n: string) => slugify(n))
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const existingSubjects = subjectNames.length > 0
    ? await prisma.subject.findMany({
        where: { OR: [{ slug: { in: subjectSlugs } }, { name: { in: subjectNames } }] },
      })
    : []
  const subjectByKey = new Map<string, typeof existingSubjects[number]>()
  for (const s of existingSubjects) {
    subjectByKey.set(s.slug, s)
    subjectByKey.set(norm(s.name), s)
  }

  const toCreateSubjects: Array<{ name: string; slug: string }> = []
  for (const m of materiasValidas) {
    if (m.subjectId) continue
    const slug = slugify(m.nome)
    if (subjectByKey.get(slug) ?? subjectByKey.get(norm(m.nome))) continue
    if (toCreateSubjects.find((c) => c.slug === slug)) continue
    toCreateSubjects.push({ name: m.nome, slug })
  }
  if (toCreateSubjects.length > 0) {
    await prisma.subject.createMany({ data: toCreateSubjects, skipDuplicates: true })
    const fresh = await prisma.subject.findMany({
      where: { slug: { in: toCreateSubjects.map((s) => s.slug) } },
    })
    for (const s of fresh) {
      subjectByKey.set(s.slug, s)
      subjectByKey.set(norm(s.name), s)
    }
  }

  // Resolve subjectId pra cada matéria
  const materiaResolved: Array<{
    m: any
    subjectId: string
    weight: number
    expectedQuestions: number | null
    order: number
  }> = []
  for (let mi = 0; mi < materiasValidas.length; mi++) {
    const m = materiasValidas[mi]
    let subjectId: string = m.subjectId
    if (!subjectId) {
      const slug = slugify(m.nome)
      const cached = subjectByKey.get(slug) ?? subjectByKey.get(norm(m.nome))
      if (!cached) continue
      subjectId = cached.id
    }
    materiaResolved.push({
      m,
      subjectId,
      weight: m.peso ?? 1,
      expectedQuestions: m.qtdQuestoes ?? null,
      order: m.ordem ?? mi,
    })
  }

  // ── ETAPA B — Pré-busca TODOS topics dos subjects relevantes (1 query) ─
  const allSubjectIds = [...new Set(materiaResolved.map((r) => r.subjectId))]
  const allExistingTopics = allSubjectIds.length > 0
    ? await prisma.topic.findMany({
        where: { subjectId: { in: allSubjectIds }, archivedAt: null },
        select: { id: true, name: true, parentId: true, subjectId: true },
      })
    : []
  const topicsByKey = new Map<string, typeof allExistingTopics>()
  for (const t of allExistingTopics) {
    const key = `${t.subjectId}|${t.parentId ?? 'root'}`
    if (!topicsByKey.has(key)) topicsByKey.set(key, [])
    topicsByKey.get(key)!.push(t)
  }

  // ── ETAPA C — Cria topics novos em paralelo + popula newTopicIds ────
  async function processTopics(
    subjectId: string,
    items: any[],
    parentId: string | null,
    parentPath: string[],
  ): Promise<void> {
    const key = `${subjectId}|${parentId ?? 'root'}`
    const siblings = topicsByKey.get(key) ?? []

    type Pending = { item: any; index: number }
    const toCreate: Pending[] = []
    const resolved: Array<{ id: string; item: any }> = []

    for (let ti = 0; ti < items.length; ti++) {
      const t = items[ti]
      if (!t?.nome) continue
      const existing = siblings.find((s) => s.name === t.nome)
      if (existing) resolved.push({ id: existing.id, item: t })
      else toCreate.push({ item: t, index: ti })
    }

    const created = await Promise.all(
      toCreate.map(({ item, index }) =>
        prisma.topic.create({
          data: {
            subjectId,
            parentId: parentId ?? null,
            name: item.nome,
            slug: slugify(item.nome),
            order: item.ordem ?? index,
          },
        }),
      ),
    )
    for (const c of created) {
      const k = `${c.subjectId}|${c.parentId ?? 'root'}`
      if (!topicsByKey.has(k)) topicsByKey.set(k, [])
      topicsByKey.get(k)!.push({ id: c.id, name: c.name, parentId: c.parentId, subjectId: c.subjectId })
    }

    const allResolved = [
      ...resolved,
      ...created.map((c, i) => ({ id: c.id, item: toCreate[i].item })),
    ]
    for (const r of allResolved) {
      const path = [...parentPath, r.item.nome]
      newTopicIds.set(path.join(' → '), r.id)
    }

    await Promise.all(
      allResolved
        .filter((r) => Array.isArray(r.item.subtopicos) && r.item.subtopicos.length > 0)
        .map((r) => processTopics(subjectId, r.item.subtopicos, r.id, [...parentPath, r.item.nome])),
    )
  }

  // Processa todas as matérias em paralelo
  await Promise.all(
    materiaResolved.map((r) => processTopics(r.subjectId, r.m.topicos ?? [], null, [r.m.nome])),
  )

  // ── ETAPA D — CourseSubject + EditalSubject em batch ────────────────
  if (materiaResolved.length > 0) {
    await Promise.all([
      prisma.courseSubject.createMany({
        data: materiaResolved.map((r) => ({
          courseId,
          subjectId: r.subjectId,
          order: r.order,
          weight: r.weight,
        })),
        skipDuplicates: true,
      }),
      prisma.editalSubject.createMany({
        data: materiaResolved.map((r, i) => ({
          editalId: newEdital.id,
          subjectId: r.subjectId,
          weight: r.weight,
          expectedQuestions: r.expectedQuestions,
          order: i,
        })),
        skipDuplicates: true,
      }),
    ])
    // Atualiza weight/order de quem já existia (updateMany por par — em paralelo)
    await Promise.all(
      materiaResolved.map((r) =>
        prisma.courseSubject.updateMany({
          where: { courseId, subjectId: r.subjectId },
          data: { order: r.order, weight: r.weight },
        }),
      ),
    )
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

  // 5. Pra tópicos removidos com action=archive: arquiva (PARALELO)
  let archived = 0
  let materialsArchived = 0
  let flashcardsArchived = 0
  const toArchive = Array.from(removedDecisions.entries())
    .filter(([, action]) => action === 'archive')
    .map(([oldTopicId]) => oldTopicId)
  if (toArchive.length > 0) {
    const topicsToArchive = await prisma.topic.findMany({
      where: { id: { in: toArchive } },
      select: { id: true, name: true },
    })
    const topicNameById = new Map(topicsToArchive.map((t) => [t.id, t.name]))

    const archiveResults = await Promise.all(
      topicsToArchive.map(async (t) => {
        const [_, mUpd, fUpd] = await Promise.all([
          prisma.topic.update({
            where: { id: t.id },
            data: { archivedAt: new Date(), archivedReason: 'removido do edital ' + ano },
          }),
          prisma.material.updateMany({
            where: { topicId: t.id, status: { not: 'ARCHIVED' } },
            data: { status: 'ARCHIVED' },
          }),
          prisma.flashcard.updateMany({
            where: { topicId: t.id, active: true },
            data: { active: false },
          }),
          prisma.question.updateMany({
            where: { topicId: t.id, source: 'AI_GENERATED', active: true },
            data: { active: false },
          }),
        ])
        return { topicId: t.id, name: t.name, materialsArchived: mUpd.count, flashcardsArchived: fUpd.count }
      }),
    )

    for (const r of archiveResults) {
      materialsArchived += r.materialsArchived
      flashcardsArchived += r.flashcardsArchived
      log.push({
        type: 'ARCHIVED',
        description: `Tópico arquivado: '${r.name}'`,
        data: { topicId: r.topicId, materialsArchived: r.materialsArchived, flashcardsArchived: r.flashcardsArchived },
      })
      archived++
    }
  }

  // Loga adições (tópicos novos foram criados acima via createTopics)
  const added = newTopicIds.size - merged
  if (added > 0) {
    log.push({ type: 'ADDED', description: `${added} tópicos novos`, data: { count: added } })
  }

  // 6. Cria entradas no EditalChangeLog (BATCH)
  if (log.length > 0) {
    await prisma.editalChangeLog.createMany({
      data: log.map((entry) => ({
        newEditalId: newEdital.id,
        previousEditalId: previousEdital?.id ?? null,
        changeType: entry.type,
        description: entry.description,
        diffData: (entry.data ?? null) as any,
      })),
    })
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
