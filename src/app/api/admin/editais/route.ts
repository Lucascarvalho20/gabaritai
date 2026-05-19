import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug') ?? undefined

  const editais = await prisma.edital.findMany({
    where: courseSlug ? { course: { slug: courseSlug } } : {},
    include: {
      course: { select: { id: true, name: true, slug: true, cargo: true, parentSlug: true } },
      banca: { select: { id: true, name: true, slug: true } },
      subjects: { select: { id: true } },
    },
    orderBy: [{ isActive: 'desc' }, { ano: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({
    editais: editais.map((e) => ({
      ...e,
      subjectsCount: e.subjects.length,
      subjects: undefined,
    })),
  })
}

// POST /api/admin/editais
// Body: { courseSlug, rawText?, dryRun?, manual? }
// - rawText: texto do edital pra IA extrair tudo (banca, ano, matérias, peso, qtd, programa)
// - dryRun: true = só retorna preview sem salvar
// - manual: alternativa pra admin já mandar JSON pronto sem IA
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { courseSlug, rawText, dryRun, manual } = body

  if (!courseSlug) return NextResponse.json({ message: 'courseSlug obrigatório' }, { status: 400 })

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  let parsed: any
  if (manual) {
    parsed = manual
  } else {
    if (!rawText || rawText.length < 200) {
      return NextResponse.json({ message: 'rawText muito curto (mín 200 caracteres)' }, { status: 400 })
    }

    const prompt = `Você é um analista de editais de concursos públicos brasileiros.
Analise o EDITAL abaixo e extraia em JSON estruturado os seguintes campos:

CAMPOS (use null se não encontrar):
- numero: número do edital (ex: "1/2026")
- ano: ano de publicação (number)
- titulo: título curto (ex: "Edital de Abertura PMDF 2026 - Soldado")
- bancaName: nome da banca (ex: "Cebraspe", "FGV", "FCC")
- vagas: total de vagas (number)
- salario: salário inicial em R$ (number)
- escolaridade: "MEDIO" | "SUPERIOR" | "TECNICO"
- dataAbertura: data abertura inscrições (ISO YYYY-MM-DD)
- dataInscricaoFim: data fim inscrições (ISO)
- dataProva: data da prova (ISO)
- totalQuestoes: número total de questões da prova objetiva
- duracaoMin: duração da prova em minutos
- hasRedacao: true/false (tem redação?)
- wrongAnnulsRight: true se errada anula certa (Cebraspe geralmente sim)
- examFormat: "CE" (Cebraspe certo/errado) | "ME_5" (múltipla A-E) | "ME_4" (A-D) | "MISTA"
- subjects: array de matérias da prova, cada uma com:
    - name: nome da matéria
    - expectedQuestions: número de questões esperadas
    - weight: peso relativo (1.0 padrão; se a banca dá peso diferente, ajusta)
    - programa: lista curta de tópicos cobrados (string)

EDITAL:
"""
${rawText.slice(0, 12000)}
"""

Retorne APENAS o JSON (sem texto extra, sem markdown).`

    const raw = await callAI(prompt, { maxTokens: 4000, temperature: 0.2 })
    parsed = parseAIJson<any>(raw)
  }

  if (dryRun) {
    return NextResponse.json({ preview: parsed, dryRun: true })
  }

  // Resolve banca por nome
  let bancaId: string | null = null
  if (parsed.bancaName) {
    const bancaSlug = parsed.bancaName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const banca = await prisma.banca.findFirst({
      where: { OR: [{ slug: bancaSlug }, { name: { equals: parsed.bancaName, mode: 'insensitive' } }] },
    })
    if (banca) bancaId = banca.id
  }

  // Resolve matérias por nome (cria se não existir)
  const subjectsResolved: Array<{ subjectId: string; expectedQuestions: number; weight: number; programa: string | null; order: number }> = []
  if (Array.isArray(parsed.subjects)) {
    for (let i = 0; i < parsed.subjects.length; i++) {
      const s = parsed.subjects[i]
      if (!s.name) continue
      const slug = String(s.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      let subject = await prisma.subject.findFirst({
        where: { OR: [{ slug }, { name: { equals: s.name, mode: 'insensitive' } }] },
      })
      if (!subject) {
        subject = await prisma.subject.create({ data: { slug, name: s.name } })
      }
      subjectsResolved.push({
        subjectId: subject.id,
        expectedQuestions: s.expectedQuestions ?? 10,
        weight: s.weight ?? 1.0,
        programa: s.programa ?? null,
        order: i,
      })
    }
  }

  const pdfHash = rawText ? crypto.createHash('sha256').update(rawText).digest('hex') : null

  const edital = await prisma.edital.create({
    data: {
      courseId: course.id,
      bancaId,
      numero: parsed.numero ?? null,
      ano: parsed.ano ?? new Date().getFullYear(),
      titulo: parsed.titulo ?? `Edital ${course.name} ${parsed.ano ?? new Date().getFullYear()}`,
      vagas: parsed.vagas ?? null,
      salario: parsed.salario ?? null,
      escolaridade: parsed.escolaridade ?? null,
      dataAbertura: parsed.dataAbertura ? new Date(parsed.dataAbertura) : null,
      dataInscricaoFim: parsed.dataInscricaoFim ? new Date(parsed.dataInscricaoFim) : null,
      dataProva: parsed.dataProva ? new Date(parsed.dataProva) : null,
      totalQuestoes: parsed.totalQuestoes ?? null,
      duracaoMin: parsed.duracaoMin ?? null,
      hasRedacao: !!parsed.hasRedacao,
      wrongAnnulsRight: !!parsed.wrongAnnulsRight,
      examFormat: parsed.examFormat ?? null,
      pdfHash,
      sourceApi: 'admin-manual',
      rawData: parsed,
      subjects: subjectsResolved.length
        ? { create: subjectsResolved }
        : undefined,
    },
    include: { banca: true, course: { select: { name: true, slug: true } } },
  })

  return NextResponse.json({ edital, subjectsCreated: subjectsResolved.length })
}
