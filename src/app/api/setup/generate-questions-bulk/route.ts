import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/setup/generate-questions-bulk
 *
 * Dispara geração de pool de 50 questões via IA pra TODOS os cursos com edital
 * ativo que ainda NÃO têm pool. Protegido por SETUP_SECRET ou ADMIN_PASSWORD.
 *
 * Body opcional:
 *   { onlySlugs?: string[], regenerate?: boolean, poolSize?: number }
 *
 * Auth: `Authorization: Bearer <SETUP_SECRET ou ADMIN_PASSWORD>`
 *
 * Custo estimado: ~$0.50-2 por curso (Claude Sonnet). 10 cursos = ~$10-15.
 * Demora: ~5-15 min total (CONCURRENCY=2 entre matérias dentro de cada curso).
 *
 * Idempotente: cursos com pool existente são pulados (a menos que regenerate=true).
 */
const DEFAULT_POOL_SIZE = 50

export async function POST(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@2024!'

  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const okSecret = setupSecret && bearer === setupSecret
  const okAdminPass = bearer === adminPassword
  if (!okSecret && !okAdminPass) {
    return NextResponse.json({
      message: 'Não autorizado. Envie Authorization: Bearer <SETUP_SECRET> ou <ADMIN_PASSWORD>.',
    }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const onlySlugs: string[] | undefined = Array.isArray(body?.onlySlugs) ? body.onlySlugs : undefined
  const regenerate = Boolean(body?.regenerate)
  const POOL_SIZE = Math.min(Math.max(Number(body?.poolSize) || DEFAULT_POOL_SIZE, 10), 100)

  // Lista cursos com edital ativo
  const cursos = await prisma.course.findMany({
    where: {
      active: true,
      ...(onlySlugs ? { slug: { in: onlySlugs } } : {}),
      editais: { some: { isActive: true } },
    },
    select: { id: true, slug: true, name: true, orgao: true, cargo: true },
    orderBy: { slug: 'asc' },
  })

  if (cursos.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Nenhum curso com edital ativo encontrado.' })
  }

  const results: Array<{
    slug: string
    name: string
    action: 'generated' | 'skipped' | 'failed'
    poolSize?: number
    error?: string
    porMateria?: Array<{ subjectName: string; planejado: number; gerado: number }>
  }> = []

  for (const course of cursos) {
    const POOL_TAG = `diagnostico-pool:${course.slug}`
    const existing = await prisma.question.count({
      where: { tags: { has: POOL_TAG }, active: true, anulada: false },
    })

    if (existing >= POOL_SIZE && !regenerate) {
      results.push({ slug: course.slug, name: course.name, action: 'skipped', poolSize: existing })
      continue
    }

    const edital = await prisma.edital.findFirst({
      where: { courseId: course.id, isActive: true },
      select: {
        id: true, ano: true, totalQuestoes: true,
        examFormat: true, wrongAnnulsRight: true,
        banca: { select: { id: true, slug: true, name: true, style: true } },
      },
    })
    if (!edital) {
      results.push({ slug: course.slug, name: course.name, action: 'failed', error: 'Sem edital ativo' })
      continue
    }

    const editalSubjects = await prisma.editalSubject.findMany({
      where: { editalId: edital.id },
      include: { subject: { select: { id: true, name: true, slug: true } } },
      orderBy: { order: 'asc' },
    })
    if (editalSubjects.length === 0) {
      results.push({ slug: course.slug, name: course.name, action: 'failed', error: 'Edital sem matérias' })
      continue
    }

    if (regenerate && existing > 0) {
      await prisma.question.updateMany({
        where: { tags: { has: POOL_TAG } },
        data: { active: false },
      })
    }

    // Distribui POOL_SIZE entre matérias proporcional ao peso
    const totalWeight = editalSubjects.reduce((s, es) => s + (es.weight || 1), 0)
    type Alloc = { subjectId: string; subjectName: string; qtd: number }
    const alocacao: Alloc[] = editalSubjects.map((es) => ({
      subjectId: es.subjectId,
      subjectName: es.subject.name,
      qtd: Math.max(1, Math.round(((es.weight || 1) / totalWeight) * POOL_SIZE)),
    }))
    let alocado = alocacao.reduce((s, a) => s + a.qtd, 0)
    while (alocado > POOL_SIZE) {
      const i = alocacao.reduce((mx, a, idx, arr) => (a.qtd > arr[mx].qtd ? idx : mx), 0)
      alocacao[i].qtd--; alocado--
    }
    while (alocado < POOL_SIZE) {
      const i = alocacao.reduce((mx, a, idx, arr) => (a.qtd < arr[mx].qtd ? idx : mx), 0)
      alocacao[i].qtd++; alocado++
    }

    const bancaName = edital.banca?.name ?? 'banca não definida'
    const bancaSlug = edital.banca?.slug ?? null
    const isCE = String(edital.examFormat ?? 'ME_5') === 'CE'
    const bancaStyleHint = edital.banca?.style ?? defaultStyleForBanca(bancaSlug)
    const wrongAnnuls = edital.wrongAnnulsRight

    type Generated = {
      subjectId: string; subjectName: string; enunciado: string
      alternativas: Array<{ letra: string; texto: string }>; gabarito: string
      explicacao: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    }

    async function generateForMateria(a: Alloc): Promise<Generated[]> {
      const prompt = buildPrompt({
        banca: bancaName, bancaStyleHint, isCE, wrongAnnulsRight: wrongAnnuls,
        courseName: course.name, orgao: course.orgao, cargo: course.cargo,
        materia: a.subjectName, qtd: a.qtd,
      })
      try {
        const raw = await callAI(prompt, { maxTokens: 8000, temperature: 0.5 })
        const parsed = parseAIJson<{ questoes: any[] }>(raw)
        const arr = Array.isArray(parsed?.questoes) ? parsed.questoes : []
        return arr
          .filter((q) => q?.enunciado && Array.isArray(q?.alternativas) && q?.gabarito)
          .map((q) => ({
            subjectId: a.subjectId, subjectName: a.subjectName,
            enunciado: String(q.enunciado), alternativas: q.alternativas,
            gabarito: String(q.gabarito), explicacao: String(q.explicacao ?? ''),
            difficulty: (q.dificuldade ?? 'MEDIUM') as any,
          }))
          .slice(0, a.qtd)
      } catch (err) {
        console.warn(`[bulk] ${course.slug} - falha em ${a.subjectName}:`, err)
        return []
      }
    }

    const todasGeradas: Generated[] = []
    const CONCURRENCY = 2
    for (let i = 0; i < alocacao.length; i += CONCURRENCY) {
      const batch = alocacao.slice(i, i + CONCURRENCY)
      const r = await Promise.all(batch.map(generateForMateria))
      r.forEach((rs) => todasGeradas.push(...rs))
    }

    if (todasGeradas.length === 0) {
      results.push({ slug: course.slug, name: course.name, action: 'failed', error: 'IA não gerou nenhuma questão' })
      continue
    }

    const tagsBase = [POOL_TAG, 'diagnostico']
    if (bancaSlug) tagsBase.push(`banca:${bancaSlug}`)

    await prisma.question.createMany({
      data: todasGeradas.map((g) => ({
        subjectId: g.subjectId, bancaSlug, orgao: course.orgao,
        ano: edital.ano, difficulty: g.difficulty, source: 'AI_GENERATED',
        enunciado: g.enunciado, alternativas: g.alternativas,
        gabarito: g.gabarito, explicacao: g.explicacao,
        tags: tagsBase, active: true, anulada: false,
      })),
    })

    results.push({
      slug: course.slug, name: course.name, action: 'generated',
      poolSize: todasGeradas.length,
      porMateria: alocacao.map((a) => ({
        subjectName: a.subjectName, planejado: a.qtd,
        gerado: todasGeradas.filter((g) => g.subjectId === a.subjectId).length,
      })),
    })
  }

  return NextResponse.json({
    ok: true,
    totalCursos: cursos.length,
    geradas: results.filter((r) => r.action === 'generated').length,
    puladas: results.filter((r) => r.action === 'skipped').length,
    falharam: results.filter((r) => r.action === 'failed').length,
    detalhes: results,
  })
}

function defaultStyleForBanca(slug: string | null): string {
  switch ((slug ?? '').toLowerCase()) {
    case 'cebraspe': case 'cespe':
      return 'Cebraspe (CESPE): itens CERTO/ERRADO. Cada item é uma afirmação a julgar. Conceitual, pega pegadinhas em detalhes técnicos. Linguagem formal, citando lei seca e doutrina majoritária.'
    case 'iades':
      return 'IADES: múltipla escolha A-E. Estilo direto, foco em letra de lei e jurisprudência.'
    case 'instituto-aocp':
      return 'Instituto AOCP: múltipla escolha A-E. Estilo conceitual, foco em letra de lei e princípios.'
    case 'fgv':
      return 'FGV: múltipla escolha A-E. Casos práticos curtos, jurisprudência STF/STJ recente.'
    case 'fcc':
      return 'FCC: múltipla escolha A-E. Cobra LETRA DA LEI quase literal.'
    case 'vunesp':
      return 'Vunesp: múltipla escolha A-E. Estilo equilibrado, contextual, didático.'
    default:
      return 'Banca generalista brasileira: estilo formal, lei seca + doutrina majoritária.'
  }
}

function buildPrompt(opts: {
  banca: string; bancaStyleHint: string; isCE: boolean; wrongAnnulsRight: boolean
  courseName: string; orgao: string | null; cargo: string | null
  materia: string; qtd: number
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
3. Cada questão deve ser AUTOCONTIDA — sem dependência de texto-base externo.
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
