import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

  for (let mi = 0; mi < materias.length; mi++) {
    const m = materias[mi]
    if (!m.nome) continue

    // 1. Subject — reusa se já existe (matéria global)
    let subjectId: string = m.subjectId
    if (!subjectId) {
      const slug = slugify(m.nome)
      const existing = await prisma.subject.findFirst({ where: { OR: [{ slug }, { name: m.nome }] } })
      if (existing) {
        subjectId = existing.id
      } else {
        const created = await prisma.subject.create({ data: { name: m.nome, slug } })
        subjectId = created.id
      }
    }

    // 2. Vincula Subject ao Course (CourseSubject)
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId, subjectId } },
      update: { weight: m.peso ?? 1, order: m.ordem ?? mi },
      create: { courseId, subjectId, order: m.ordem ?? mi, weight: m.peso ?? 1 },
    }).catch(() => null)

    // 3. Tópicos (recursivamente, com hierarquia parent + dedupe Jaccard)
    const topicIds: string[] = []
    async function createTopics(items: any[], parentId: string | null) {
      for (let ti = 0; ti < items.length; ti++) {
        const t = items[ti]
        if (!t.nome) continue
        let existing = await prisma.topic.findFirst({
          where: { subjectId, name: t.nome, parentId: parentId ?? null, archivedAt: null },
        })
        if (!existing) {
          const siblings = await prisma.topic.findMany({
            where: { subjectId, parentId: parentId ?? null, archivedAt: null },
            select: { id: true, name: true },
          })
          for (const s of siblings) {
            if (jaccard(s.name, t.nome) >= 0.7) {
              existing = await prisma.topic.findUnique({ where: { id: s.id } })
              break
            }
          }
        }
        const topic = existing
          ? existing
          : await prisma.topic.create({
              data: {
                subjectId,
                parentId: parentId ?? null,
                name: t.nome,
                slug: slugify(t.nome),
                order: t.ordem ?? ti,
              },
            })
        topicIds.push(topic.id)
        if (Array.isArray(t.subtopicos) && t.subtopicos.length > 0) {
          await createTopics(t.subtopicos, topic.id)
        }
      }
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
