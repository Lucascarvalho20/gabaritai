import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/me/diagnostico/start
 *
 * Inicia o diagnóstico inicial do aluno: seleciona 20 questões do curso
 * principal, distribuídas proporcionalmente ao peso de cada matéria no
 * EDITAL VERTICALIZADO ativo daquele curso.
 *
 * Regras (definidas pelo João 2026-05-29):
 *  - Curso usado = enrollment com isPrimary=true do aluno.
 *  - Distribuição: peso de cada matéria no EditalSubject → quantas das 20.
 *  - Mistura dificuldade (não só fácil).
 *  - Prioriza OFFICIAL > AI_GENERATED.
 *  - Não tem cronômetro, sem pressão de tempo.
 *
 * Resposta: { sessionId, questions[], course, materiasPlanejadas[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const userId = auth.user.id

  // 1. Acha curso principal
  const primaryEnrollment = await prisma.userCourseEnrollment.findFirst({
    where: { userId, isPrimary: true, isActive: true },
    include: {
      course: { select: { id: true, slug: true, name: true, orgao: true, area: true, parentSlug: true } },
    },
  })

  if (!primaryEnrollment) {
    return NextResponse.json({
      message: 'Você precisa ter um curso principal ativo antes de fazer o diagnóstico. Vá em "Meus cursos" e escolha um.',
      code: 'NO_PRIMARY_COURSE',
    }, { status: 400 })
  }

  // 2. Acha edital ativo do curso principal + dados da BANCA (estilo da prova)
  const edital = await prisma.edital.findFirst({
    where: { courseId: primaryEnrollment.courseId, isActive: true },
    select: {
      id: true, ano: true, titulo: true, totalQuestoes: true,
      banca: { select: { id: true, slug: true, name: true } },
    },
  })

  if (!edital) {
    return NextResponse.json({
      message: `O curso "${primaryEnrollment.course.name}" ainda não tem edital cadastrado. Volte mais tarde — a equipe está atualizando.`,
      code: 'NO_EDITAL',
    }, { status: 400 })
  }

  const bancaSlug = edital.banca?.slug ?? null
  const orgao = primaryEnrollment.course.orgao ?? null
  const area = primaryEnrollment.course.area ?? null
  const parentSlug = primaryEnrollment.course.parentSlug ?? null

  // 3. Pega EditalSubject (peso por matéria)
  const editalSubjects = await prisma.editalSubject.findMany({
    where: { editalId: edital.id },
    include: { subject: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: 'asc' },
  })

  if (editalSubjects.length === 0) {
    return NextResponse.json({
      message: 'O edital deste curso não tem matérias mapeadas ainda. Avise o admin.',
      code: 'NO_EDITAL_SUBJECTS',
    }, { status: 400 })
  }

  // 4. Distribui 20 questões proporcionalmente ao peso
  const TOTAL = 20
  const totalWeight = editalSubjects.reduce((s, es) => s + (es.weight || 1), 0)
  type Plan = { subjectId: string; subjectName: string; weight: number; qtd: number }
  const planos: Plan[] = editalSubjects.map((es) => {
    const share = (es.weight || 1) / totalWeight
    return {
      subjectId: es.subjectId,
      subjectName: es.subject.name,
      weight: es.weight || 1,
      qtd: Math.max(1, Math.round(share * TOTAL)), // mínimo 1 por matéria
    }
  })
  // Ajusta soma pra bater exatamente 20 (arredondamento pode dar 18-22)
  let totalAlocado = planos.reduce((s, p) => s + p.qtd, 0)
  while (totalAlocado > TOTAL) {
    const i = planos.reduce((maxIdx, p, idx, arr) => (p.qtd > arr[maxIdx].qtd ? idx : maxIdx), 0)
    planos[i].qtd--
    totalAlocado--
  }
  while (totalAlocado < TOTAL) {
    const i = planos.reduce((maxIdx, p, idx, arr) => (p.weight > arr[maxIdx].weight ? idx : maxIdx), 0)
    planos[i].qtd++
    totalAlocado++
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. SELEÇÃO DO POOL DE DIAGNÓSTICO (gerado pela IA via admin/preparar)
  // ════════════════════════════════════════════════════════════════════════
  // Regra do produto (2026-05-30): diagnóstico usa SÓ questões IA preparadas
  // pelo endpoint /api/admin/diagnostico/preparar/[courseId], identificadas
  // pela tag `diagnostico-pool:<courseSlug>`. NÃO toca em questões de provas.
  //
  // Sorteia 20 do pool proporcional ao peso de cada matéria.

  type QuestionLite = {
    id: string
    enunciado: string
    alternativas: any
    subjectId: string | null
    bancaSlug: string | null
    ano: number | null
    difficulty: string
    source: string
  }

  const POOL_TAG = `diagnostico-pool:${primaryEnrollment.course.slug}`

  const poolByMateria = new Map<string, QuestionLite[]>()
  for (const p of planos) {
    if (p.qtd <= 0) continue
    const items = await prisma.question.findMany({
      where: {
        subjectId: p.subjectId,
        tags: { has: POOL_TAG },
        active: true,
        anulada: false,
      },
      select: {
        id: true, enunciado: true, alternativas: true, subjectId: true,
        bancaSlug: true, ano: true, difficulty: true, source: true,
      },
    })
    poolByMateria.set(p.subjectId, items)
  }

  const totalDisponivel = Array.from(poolByMateria.values()).reduce((s, arr) => s + arr.length, 0)
  if (totalDisponivel === 0) {
    return NextResponse.json({
      message: `Pool de questões do diagnóstico ainda não foi gerado pra "${primaryEnrollment.course.name}". Admin precisa rodar a geração em /admin/cursos.`,
      code: 'POOL_NOT_PREPARED',
    }, { status: 409 })
  }

  const selecionadas: QuestionLite[] = []
  const materiasComFallback: string[] = []
  for (const p of planos) {
    if (p.qtd <= 0) continue
    const pool = poolByMateria.get(p.subjectId) ?? []
    if (pool.length === 0) {
      materiasComFallback.push(`${p.subjectName} (pool vazio)`)
      continue
    }
    if (pool.length < p.qtd) materiasComFallback.push(p.subjectName)

    // Shuffle do pool da matéria
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Tenta diversificar dificuldade: 1 fácil + 1 difícil + resto médio
    const easy = shuffled.filter((q) => q.difficulty === 'EASY')
    const med = shuffled.filter((q) => q.difficulty === 'MEDIUM')
    const hard = shuffled.filter((q) => q.difficulty === 'HARD')
    const mix: QuestionLite[] = []
    if (easy[0] && p.qtd >= 1) mix.push(easy[0])
    if (hard[0] && p.qtd >= 2) mix.push(hard[0])
    let rest = p.qtd - mix.length
    for (const q of med) {
      if (rest <= 0) break
      if (!mix.find((m) => m.id === q.id)) { mix.push(q); rest-- }
    }
    for (const q of shuffled) {
      if (rest <= 0) break
      if (!mix.find((m) => m.id === q.id)) { mix.push(q); rest-- }
    }
    selecionadas.push(...mix.slice(0, p.qtd))
  }
  // Variáveis usadas no retorno (compat com versão anterior)
  void bancaSlug; void orgao; void area; void parentSlug
  const tierStats = { T1: 0, T2: 0, T3: 0, T4: selecionadas.length, T5: 0 }
  const fallbackUsado = materiasComFallback

  if (selecionadas.length < 5) {
    return NextResponse.json({
      message: `Não há questões suficientes cadastradas pra esse curso ainda (achei ${selecionadas.length}). Mínimo: 5. Avise o admin.`,
      code: 'NOT_ENOUGH_QUESTIONS',
      foundCount: selecionadas.length,
    }, { status: 400 })
  }

  // Embaralha pra ordem aleatória (não agrupado por matéria)
  for (let i = selecionadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selecionadas[i], selecionadas[j]] = [selecionadas[j], selecionadas[i]]
  }

  return NextResponse.json({
    course: {
      id: primaryEnrollment.course.id,
      slug: primaryEnrollment.course.slug,
      name: primaryEnrollment.course.name,
    },
    edital: {
      id: edital.id,
      ano: edital.ano,
      titulo: edital.titulo,
      banca: edital.banca ? { slug: edital.banca.slug, name: edital.banca.name } : null,
    },
    materiasPlanejadas: planos.filter((p) => p.qtd > 0).map((p) => ({
      subjectId: p.subjectId,
      name: p.subjectName,
      qtd: p.qtd,
      weight: p.weight,
    })),
    questions: selecionadas.map((q) => ({
      id: q.id,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      subjectId: q.subjectId,
      bancaSlug: q.bancaSlug,
      ano: q.ano,
      // NÃO retorna gabarito (só no submit)
    })),
    totalQuestoes: selecionadas.length,
    // Telemetria de proveniência: o admin saca o "estado" do banco
    // (T1 = idealmente todos T1, fallbacks indicam onde precisa importar mais
    //  questões oficiais ou gerar via IA com estilo da banca)
    sourceStats: {
      T1_bancaEOrgao: tierStats.T1,
      T2_bancaEArea: tierStats.T2,
      T3_bancaQualquer: tierStats.T3,
      T4_aiBanca: tierStats.T4,
      T5_fallback: tierStats.T5,
    },
    materiasComFallback: fallbackUsado,
  })
}
