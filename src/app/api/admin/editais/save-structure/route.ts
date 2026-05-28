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
    totalQuestoes, duracaoMin, hasRedacao, wrongAnnulsRight, examFormat,
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

  const createdMaterias: Array<{ subjectId: string; topicIds: string[]; weight: number; expectedQuestions: number | null }> = []

  // ── OTIMIZAÇÃO: pré-busca TODOS subjects que vão ser usados (1 query)
  const subjectNames = materias.map((m: any) => m.nome).filter(Boolean)
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

  for (let mi = 0; mi < materias.length; mi++) {
    const m = materias[mi]
    if (!m.nome) continue

    // 1. Subject — reusa se já existe (matéria global), senão cria
    let subjectId: string = m.subjectId
    if (!subjectId) {
      const slug = slugify(m.nome)
      const cached = subjectByKey.get(slug) ?? subjectByKey.get(norm(m.nome))
      if (cached) {
        subjectId = cached.id
      } else {
        const created = await prisma.subject.create({ data: { name: m.nome, slug } })
        subjectId = created.id
        subjectByKey.set(slug, created)
        subjectByKey.set(norm(m.nome), created)
      }
    }

    // 2. Vincula Subject ao Course (CourseSubject)
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId, subjectId } },
      update: { weight: m.peso ?? 1, order: m.ordem ?? mi },
      create: { courseId, subjectId, order: m.ordem ?? mi, weight: m.peso ?? 1 },
    }).catch(() => null)

    // 3. OTIMIZAÇÃO: pré-busca TODOS topics do subject (1 query por matéria),
    //    faz dedupe em memória, e cria os novos em PARALELO via Promise.all
    const allTopics = await prisma.topic.findMany({
      where: { subjectId, archivedAt: null },
      select: { id: true, name: true, parentId: true },
    })
    // Index por (parentId || 'root') → array
    const byParent = new Map<string, typeof allTopics>()
    for (const t of allTopics) {
      const key = t.parentId ?? 'root'
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(t)
    }

    const topicIds: string[] = []
    async function createTopics(items: any[], parentId: string | null) {
      const parentKey = parentId ?? 'root'
      const siblings = byParent.get(parentKey) ?? []

      // Separa: o que já existe vs precisa criar
      type Pending = { item: any; index: number }
      const toCreate: Pending[] = []
      const resolved: Array<{ id: string; item: any }> = []

      for (let ti = 0; ti < items.length; ti++) {
        const t = items[ti]
        if (!t.nome) continue
        // Match exato ou Jaccard >= 0.7 entre os siblings em memória
        const tNorm = norm(t.nome)
        let existing = siblings.find((s) => norm(s.name) === tNorm)
        if (!existing) {
          for (const s of siblings) {
            if (jaccard(s.name, t.nome) >= 0.7) { existing = s; break }
          }
        }
        if (existing) {
          resolved.push({ id: existing.id, item: t })
        } else {
          toCreate.push({ item: t, index: ti })
        }
      }

      // Cria todos os novos em paralelo
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
      // Atualiza cache em memória pra criações subsequentes (subtópicos)
      for (const c of created) {
        const key = c.parentId ?? 'root'
        if (!byParent.has(key)) byParent.set(key, [])
        byParent.get(key)!.push({ id: c.id, name: c.name, parentId: c.parentId })
      }

      // Agora todos os tópicos desse nível têm id. Processa subtópicos.
      const allResolved = [
        ...resolved,
        ...created.map((c, i) => ({ id: c.id, item: toCreate[i].item })),
      ]
      for (const r of allResolved) topicIds.push(r.id)

      // Processa subtópicos em paralelo por tópico pai
      await Promise.all(
        allResolved
          .filter((r) => Array.isArray(r.item.subtopicos) && r.item.subtopicos.length > 0)
          .map((r) => createTopics(r.item.subtopicos, r.id)),
      )
    }
    if (Array.isArray(m.topicos)) await createTopics(m.topicos, null)
    createdMaterias.push({
      subjectId,
      topicIds,
      weight: m.peso ?? 1,
      expectedQuestions: m.qtdQuestoes ?? null,
    })
  }

  // 4. Cria o Edital COM metadados completos
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
      rawData: regraAnulacaoTexto ? { regraAnulacaoTexto } : undefined,
    },
  })

  // 5. Vincula EditalSubject com weight + expectedQuestions
  for (let i = 0; i < createdMaterias.length; i++) {
    const cm = createdMaterias[i]
    await prisma.editalSubject.upsert({
      where: { editalId_subjectId: { editalId: edital.id, subjectId: cm.subjectId } },
      update: { weight: cm.weight, expectedQuestions: cm.expectedQuestions, order: i },
      create: {
        editalId: edital.id,
        subjectId: cm.subjectId,
        weight: cm.weight,
        expectedQuestions: cm.expectedQuestions,
        order: i,
      },
    }).catch(() => null)
  }

  // 6. Desativa editais antigos do mesmo curso
  await prisma.edital.updateMany({
    where: { courseId, isActive: true, NOT: { id: edital.id } },
    data: { isActive: false },
  })

  return NextResponse.json({
    ok: true,
    editalId: edital.id,
    courseId,
    materiasSalvas: createdMaterias.length,
    topicosSalvos: createdMaterias.reduce((a, c) => a + c.topicIds.length, 0),
    detalhe: createdMaterias,
  })
}
