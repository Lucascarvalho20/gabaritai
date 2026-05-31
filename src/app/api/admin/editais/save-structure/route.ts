import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Persiste a estrutura COMPLETA de UM cargo do edital — incluindo metadados
 * (vagas, salário, duração, redação, formato, regra de anulação) e a árvore
 * matéria→tópico.
 *
 * Body:
 * {
 *   courseId: string,                    // já matched pelo admin (cargo → curso)
 *   titulo: string,                      // ex "PF Agente — 2026"
 *   numero?: string,
 *   ano: number,
 *
 *   banca?: string,                       // slug/nome — vira bancaId
 *
 *   // Metadados do cargo (vindos do extract-structure → cargo selecionado)
 *   cargoNome?: string,                   // ex "Agente de Polícia Federal"
 *   vagas?: number,
 *   salario?: number,
 *   escolaridade?: string,
 *   totalQuestoes?: number,
 *   duracaoMin?: number,
 *   hasRedacao?: boolean,
 *   wrongAnnulsRight?: boolean,
 *   examFormat?: 'CE' | 'ME_5' | 'ME_4' | 'MISTA',
 *   regraAnulacaoTexto?: string,         // guardado em rawData
 *
 *   // Datas do edital (do editalGeral)
 *   dataAbertura?: string,
 *   dataInscricaoIni?: string,
 *   dataInscricaoFim?: string,
 *   dataProva?: string,
 *   taxaInscricao?: number,
 *
 *   pdfHash?: string,
 *   pdfUrl?: string,
 *
 *   materias: [
 *     {
 *       nome: string,
 *       subjectId?: string,               // se admin fez match
 *       ordem?: number,
 *       qtdQuestoes?: number,             // expectedQuestions
 *       peso?: number,                    // weight
 *       topicos: [{ nome, ordem?, subtopicos? }]
 *     }
 *   ]
 * }
 *
 * Comportamento:
 *  - Cria/reutiliza Subject (por slug normalizado do nome)
 *  - Cria/reutiliza Topic (com dedupe Jaccard ≥ 0.7 dentro do mesmo subject)
 *  - Vincula Subject ao Course via CourseSubject
 *  - Cria EditalSubject (peso + qtdQuestoes específicos desse edital)
 *  - Cria Edital com TODOS os metadados + desativa anteriores do mesmo curso
 *  - Idempotente: rodar 2x não duplica.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const {
    courseId, ano, banca, numero, titulo, pdfHash, pdfUrl, materias,
    cargoNome, vagas, salario, escolaridade,
    totalQuestoes, duracaoMin, duracaoSoObjetivasMin, hasRedacao, wrongAnnulsRight, examFormat,
    regraAnulacaoTexto,
    dataAbertura, dataInscricaoIni, dataInscricaoFim, dataProva, taxaInscricao,
  } = body

  if (!courseId || !ano || !titulo || !Array.isArray(materias)) {
    return NextResponse.json(
      { message: 'courseId, ano, titulo e materias são obrigatórios' },
      { status: 400 },
    )
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  // Banca (opcional — só salva se admin informou e existe)
  let bancaId: string | null = null
  if (banca) {
    const b = await prisma.banca.findFirst({ where: { OR: [{ slug: banca }, { name: banca }] } })
    bancaId = b?.id ?? null
  }

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  // Mapeia examFormat string → enum Prisma
  const examFormatEnum = (() => {
    const v = String(examFormat ?? '').toUpperCase()
    if (v === 'CE' || v === 'ME_5' || v === 'ME_4' || v === 'MISTA') return v
    return null
  })()

  // Datas: parse ISO seguro
  const parseDate = (v: any): Date | null => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim()
  function jaccard(a: string, b: string): number {
    const aT = new Set(norm(a).split(' ').filter((t) => t.length > 2))
    const bT = new Set(norm(b).split(' ').filter((t) => t.length > 2))
    if (aT.size === 0 || bT.size === 0) return norm(a) === norm(b) ? 1 : 0
    const inter = [...aT].filter((t) => bT.has(t)).length
    const uni = new Set([...aT, ...bT]).size
    return inter / uni
  }

  const materiasValidas = materias.filter((m: any) => m?.nome)

  // ════════════════════════════════════════════════════════════════════════
  // ETAPA 1 — Resolve subjects (cria os faltantes em batch)
  // ════════════════════════════════════════════════════════════════════════
  const subjectNames: string[] = materiasValidas.map((m: any) => m.nome)
  const subjectSlugs = subjectNames.map((n: string) => slugify(n))
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

  // Cria subjects faltantes em batch (createMany) — não dá pra retornar ids,
  // então faz createMany e depois findMany pra pegar tudo de uma vez.
  type SubjectStub = { name: string; slug: string }
  const toCreateSubjects: SubjectStub[] = []
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

  // Resolve subjectId final pra cada matéria
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

  // ════════════════════════════════════════════════════════════════════════
  // ETAPA 2 — Pré-busca TODOS topics existentes de TODAS subjects (1 query)
  // ════════════════════════════════════════════════════════════════════════
  const allSubjectIds = [...new Set(materiaResolved.map((r) => r.subjectId))]
  const allExistingTopics = allSubjectIds.length > 0
    ? await prisma.topic.findMany({
        where: { subjectId: { in: allSubjectIds }, archivedAt: null },
        select: { id: true, name: true, parentId: true, subjectId: true },
      })
    : []
  // Index: (subjectId|parentId) → topics[]
  const topicsByKey = new Map<string, typeof allExistingTopics>()
  for (const t of allExistingTopics) {
    const key = `${t.subjectId}|${t.parentId ?? 'root'}`
    if (!topicsByKey.has(key)) topicsByKey.set(key, [])
    topicsByKey.get(key)!.push(t)
  }

  // ════════════════════════════════════════════════════════════════════════
  // ETAPA 3 — Cria topics novos em paralelo (por nível) e coleta topicIds
  // ════════════════════════════════════════════════════════════════════════
  const topicIdsByMateria = new Map<number, string[]>()

  async function processTopics(
    subjectId: string,
    items: any[],
    parentId: string | null,
    collectInto: string[],
  ): Promise<void> {
    const key = `${subjectId}|${parentId ?? 'root'}`
    const siblings = topicsByKey.get(key) ?? []

    type Pending = { item: any; index: number }
    const toCreate: Pending[] = []
    const resolved: Array<{ id: string; item: any }> = []

    for (let ti = 0; ti < items.length; ti++) {
      const t = items[ti]
      if (!t?.nome) continue
      const tNorm = norm(t.nome)
      let existing = siblings.find((s) => norm(s.name) === tNorm)
      if (!existing) {
        for (const s of siblings) {
          if (jaccard(s.name, t.nome) >= 0.7) { existing = s; break }
        }
      }
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
    for (const r of allResolved) collectInto.push(r.id)

    await Promise.all(
      allResolved
        .filter((r) => Array.isArray(r.item.subtopicos) && r.item.subtopicos.length > 0)
        .map((r) => processTopics(subjectId, r.item.subtopicos, r.id, collectInto)),
    )
  }

  // Processa todas as matérias em PARALELO (cada uma pega sua própria slot
  // de topics; subjectIds são distintos então não há conflito).
  await Promise.all(
    materiaResolved.map(async (r, idx) => {
      const ids: string[] = []
      if (Array.isArray(r.m.topicos)) await processTopics(r.subjectId, r.m.topicos, null, ids)
      topicIdsByMateria.set(idx, ids)
    }),
  )

  // ════════════════════════════════════════════════════════════════════════
  // ETAPA 4 — CourseSubject em batch (createMany skipDuplicates + updateMany)
  // ════════════════════════════════════════════════════════════════════════
  if (materiaResolved.length > 0) {
    await prisma.courseSubject.createMany({
      data: materiaResolved.map((r) => ({
        courseId,
        subjectId: r.subjectId,
        order: r.order,
        weight: r.weight,
      })),
      skipDuplicates: true,
    })
    // Atualiza weight/order pra quem já existia (updateMany não faz por linha,
    // então fazemos N updates em paralelo, sem await sequencial)
    await Promise.all(
      materiaResolved.map((r) =>
        prisma.courseSubject.updateMany({
          where: { courseId, subjectId: r.subjectId },
          data: { order: r.order, weight: r.weight },
        }),
      ),
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ETAPA 5 — Cria Edital + EditalSubject + desativa antigos (em paralelo)
  // ════════════════════════════════════════════════════════════════════════
  const edital = await prisma.edital.create({
    data: {
      courseId,
      bancaId,
      ano,
      titulo,
      numero: numero ?? null,
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
      pdfHash: pdfHash ?? null,
      pdfUrl: pdfUrl ?? null,
      status: 'HOMOLOGADO',
      isActive: true,
      rawData: (regraAnulacaoTexto || duracaoSoObjetivasMin)
        ? {
            ...(regraAnulacaoTexto ? { regraAnulacaoTexto } : {}),
            ...(duracaoSoObjetivasMin ? { duracaoSoObjetivasMin } : {}),
          }
        : undefined,
    },
  })

  await Promise.all([
    materiaResolved.length > 0
      ? prisma.editalSubject.createMany({
          data: materiaResolved.map((r, i) => ({
            editalId: edital.id,
            subjectId: r.subjectId,
            weight: r.weight,
            expectedQuestions: r.expectedQuestions,
            order: i,
          })),
          skipDuplicates: true,
        })
      : Promise.resolve(),
    prisma.edital.updateMany({
      where: { courseId, isActive: true, NOT: { id: edital.id } },
      data: { isActive: false },
    }),
  ])

  const createdMaterias = materiaResolved.map((r, idx) => ({
    subjectId: r.subjectId,
    topicIds: topicIdsByMateria.get(idx) ?? [],
    weight: r.weight,
    expectedQuestions: r.expectedQuestions,
  }))

  return NextResponse.json({
    ok: true,
    editalId: edital.id,
    courseId,
    materiasSalvas: createdMaterias.length,
    topicosSalvos: createdMaterias.reduce((a, c) => a + c.topicIds.length, 0),
    detalhe: createdMaterias,
  })
}
