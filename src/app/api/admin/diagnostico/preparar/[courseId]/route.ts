import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/diagnostico/preparar/[courseId]
 *
 * Gera um POOL DE 50 QUESTÕES via IA pra ser usado no diagnóstico inicial
 * (Feature 1). Sortido entre alunos depois — cada aluno recebe 20 das 50.
 *
 * Distribuição: proporcional ao peso de cada matéria no EditalSubject.
 * Estilo: respeita banca do edital ativo (Cebraspe = C/E binário, FGV = ME etc.).
 *
 * Body: { regenerate?: boolean } — se true, apaga pool atual e regenera.
 *
 * Idempotente: chama 2x sem regenerate → não faz nada (pool já existe).
 *
 * Tag das questões geradas: ['diagnostico-pool', `course:${slug}`, bancaSlug]
 * source = AI_GENERATED. active = true.
 */
const POOL_SIZE = 50

export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const regenerate = Boolean(body?.regenerate)

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, slug: true, name: true, orgao: true, cargo: true, area: true },
  })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const edital = await prisma.edital.findFirst({
    where: { courseId: params.courseId, isActive: true },
    select: {
      id: true, ano: true, titulo: true, totalQuestoes: true,
      examFormat: true, wrongAnnulsRight: true,
      banca: { select: { id: true, slug: true, name: true, style: true } },
    },
  })
  if (!edital) {
    return NextResponse.json({ message: 'Curso não tem edital ativo' }, { status: 400 })
  }

  const editalSubjects = await prisma.editalSubject.findMany({
    where: { editalId: edital.id },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: 'asc' },
  })
  if (editalSubjects.length === 0) {
    return NextResponse.json({ message: 'Edital sem matérias cadastradas' }, { status: 400 })
  }

  // Tag usada pra identificar pool deste curso
  const POOL_TAG = `diagnostico-pool:${course.slug}`

  // Já existe pool? Conta
  const existing = await prisma.question.count({
    where: { tags: { has: POOL_TAG }, active: true, anulada: false },
  })

  if (existing >= POOL_SIZE && !regenerate) {
    return NextResponse.json({
      ok: true,
      noChange: true,
      poolSize: existing,
      message: 'Pool já existe. Use ?regenerate=true pra recriar.',
    })
  }

  // Regenera: marca antigas como inactive (não deleta pra preservar attempts históricos)
  if (regenerate && existing > 0) {
    await prisma.question.updateMany({
      where: { tags: { has: POOL_TAG } },
      data: { active: false },
    })
  }

  // ── Distribui 50 entre matérias proporcional ao peso ──────────────────
  const totalWeight = editalSubjects.reduce((s, es) => s + (es.weight || 1), 0)
  type Alloc = { subjectId: string; subjectName: string; qtd: number }
  const alocacao: Alloc[] = editalSubjects.map((es) => ({
    subjectId: es.subjectId,
    subjectName: es.subject.name,
    qtd: Math.max(1, Math.round(((es.weight || 1) / totalWeight) * POOL_SIZE)),
  }))
  // Ajusta soma exata
  let alocado = alocacao.reduce((s, a) => s + a.qtd, 0)
  while (alocado > POOL_SIZE) {
    const i = alocacao.reduce((mx, a, idx, arr) => (a.qtd > arr[mx].qtd ? idx : mx), 0)
    alocacao[i].qtd--
    alocado--
  }
  while (alocado < POOL_SIZE) {
    const i = alocacao.reduce((mx, a, idx, arr) => (a.qtd < arr[mx].qtd ? idx : mx), 0)
    alocacao[i].qtd++
    alocado++
  }

  // ── Gera por matéria (1 chamada IA por matéria, paralelo limitado) ────
  // Variáveis primitivas extraídas — TS preserva narrowing através de async
  const bancaName = edital.banca?.name ?? 'banca não definida'
  const bancaSlug = edital.banca?.slug ?? null
  const examFmt = String(edital.examFormat ?? 'ME_5')
  const isCE = examFmt === 'CE'
  const bancaStyleHint = edital.banca?.style ?? defaultStyleForBanca(bancaSlug)
  const wrongAnnuls = edital.wrongAnnulsRight
  const courseName = course.name
  const courseOrgao = course.orgao
  const courseCargo = course.cargo
  const editalAno = edital.ano

  type Generated = {
    subjectId: string
    subjectName: string
    enunciado: string
    alternativas: Array<{ letra: string; texto: string }>
    gabarito: string
    explicacao: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  }

  async function generateForMateria(a: Alloc): Promise<Generated[]> {
    const prompt = buildPrompt({
      banca: bancaName,
      bancaStyleHint,
      isCE,
      wrongAnnulsRight: wrongAnnuls,
      courseName,
      orgao: courseOrgao,
      cargo: courseCargo,
      materia: a.subjectName,
      qtd: a.qtd,
    })
    try {
      const raw = await callAI(prompt, { maxTokens: 8000, temperature: 0.5 })
      const parsed = parseAIJson<{ questoes: any[] }>(raw)
      const arr = Array.isArray(parsed?.questoes) ? parsed.questoes : []
      return arr
        .filter((q) => q?.enunciado && Array.isArray(q?.alternativas) && q?.gabarito)
        .map((q) => ({
          subjectId: a.subjectId,
          subjectName: a.subjectName,
          enunciado: String(q.enunciado),
          alternativas: q.alternativas,
          gabarito: String(q.gabarito),
          explicacao: String(q.explicacao ?? ''),
          difficulty: (q.dificuldade ?? 'MEDIUM') as any,
        }))
        .slice(0, a.qtd)
    } catch (err) {
      console.warn(`[preparar-diagnostico] falha gerando ${a.subjectName}:`, err)
      return []
    }
  }

  // Roda 3 matérias em paralelo (evita rate-limit do provider)
  const todasGeradas: Generated[] = []
  const failed: string[] = []
  const CONCURRENCY = 3
  for (let i = 0; i < alocacao.length; i += CONCURRENCY) {
    const batch = alocacao.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(generateForMateria))
    results.forEach((r, idx) => {
      const a = batch[idx]
      if (r.length === 0) failed.push(a.subjectName)
      todasGeradas.push(...r)
    })
  }

  if (todasGeradas.length === 0) {
    return apiError(
      new Error('IA não gerou questão alguma'),
      'IA falhou em todas as matérias',
      'preparar-diagnostico',
    )
  }

  // ── Salva no banco ───────────────────────────────────────────────────
  const tagsBase = [POOL_TAG, 'diagnostico']
  if (bancaSlug) tagsBase.push(`banca:${bancaSlug}`)

  await prisma.question.createMany({
    data: todasGeradas.map((g) => ({
      subjectId: g.subjectId,
      bancaSlug,
      orgao: courseOrgao,
      ano: editalAno,
      difficulty: g.difficulty,
      source: 'AI_GENERATED',
      enunciado: g.enunciado,
      alternativas: g.alternativas,
      gabarito: g.gabarito,
      explicacao: g.explicacao,
      tags: tagsBase,
      active: true,
      anulada: false,
    })),
  })

  return NextResponse.json({
    ok: true,
    poolSize: todasGeradas.length,
    porMateria: alocacao.map((a) => ({
      subjectName: a.subjectName,
      planejado: a.qtd,
      gerado: todasGeradas.filter((g) => g.subjectId === a.subjectId).length,
    })),
    materiasFalha: failed,
    banca: bancaName,
    courseName,
  })
}

// ────────────────────────────────────────────────────────────────────────
// Prompt builder e style hints
// ────────────────────────────────────────────────────────────────────────

function defaultStyleForBanca(slug: string | null): string {
  switch ((slug ?? '').toLowerCase()) {
    case 'cebraspe':
    case 'cespe':
      return 'Cebraspe (CESPE): itens CERTO/ERRADO. Cada item é uma afirmação a julgar (binário). Conceitual, pega pegadinhas em detalhes técnicos. Linguagem formal, citando lei seca e doutrina majoritária.'
    case 'fgv':
      return 'FGV: múltipla escolha A-E. Casos práticos curtos, jurisprudência STF/STJ recente. Enunciado contextualizado, alternativas todas plausíveis (uma só certa pelo detalhe).'
    case 'fcc':
      return 'FCC: múltipla escolha A-E. Cobra LETRA DA LEI quase literal. Enunciado seco, alternativas com pequenas trocas de palavras (vírgula, "ou" no lugar de "e").'
    case 'vunesp':
      return 'Vunesp: múltipla escolha A-E. Estilo equilibrado, contextual, didático. Sem armadilhas pesadas. Cita lei e princípios.'
    case 'quadrix':
      return 'Quadrix: múltipla escolha A-E. Mais técnica e específica. Enunciado direto, alternativas pegam detalhes operacionais.'
    default:
      return 'Banca generalista brasileira: estilo formal, lei seca + doutrina majoritária.'
  }
}

function buildPrompt(opts: {
  banca: string
  bancaStyleHint: string
  isCE: boolean
  wrongAnnulsRight: boolean
  courseName: string
  orgao: string | null
  cargo: string | null
  materia: string
  qtd: number
}): string {
  const formatoSecao = opts.isCE
    ? `FORMATO CERTO/ERRADO (estilo Cebraspe):
- Cada questão é UMA afirmação a julgar (C ou E).
- "alternativas": [{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]
- "gabarito": "C" ou "E"`
    : `FORMATO MÚLTIPLA ESCOLHA A-E:
- "alternativas": array com 5 objetos {"letra":"A"-"E","texto":"..."}
- "gabarito": "A"|"B"|"C"|"D"|"E"`

  return `Você é um especialista em elaboração de questões de concursos públicos brasileiros, ESPECIALMENTE no estilo da banca ${opts.banca}.

CONTEXTO:
- Concurso: ${opts.courseName}${opts.orgao ? ` (${opts.orgao})` : ''}
- Cargo: ${opts.cargo ?? 'não especificado'}
- Banca: ${opts.banca}
- Matéria: ${opts.materia}
- Quantidade: ${opts.qtd} questões

ESTILO DA BANCA:
${opts.bancaStyleHint}

${opts.wrongAnnulsRight ? '⚠ NESTA BANCA, ERRADA ANULA CERTA. Faça questões em que o concurseiro precisa decidir entre marcar e deixar em branco.\n' : ''}
${formatoSecao}

REGRAS RÍGIDAS:
1. ${opts.qtd} questões, distribuídas em dificuldade: ~30% EASY, ~50% MEDIUM, ~20% HARD.
2. Cobrir os assuntos PRINCIPAIS da matéria que mais caem em prova de ${opts.banca}.
3. Cada questão deve ser AUTOCONTIDA — não pode depender de texto-base externo.
4. Explicação obrigatória: por que o gabarito está certo + erro das demais.
5. NÃO copiar questões reais — gere ORIGINAIS no estilo da banca.
6. Gabarito variado, não concentrar em uma letra.

FORMATO DE RESPOSTA — APENAS JSON puro (sem markdown):

{
  "questoes": [
    {
      "enunciado": "...",
      "alternativas": [...],
      "gabarito": "...",
      "explicacao": "...",
      "dificuldade": "EASY" | "MEDIUM" | "HARD"
    }
  ]
}`
}
