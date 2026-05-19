import { callAI, parseAIJson } from './ai-client'
import { prisma } from './prisma'
import { ExamFormat, MockExamType, QuestionSource, Difficulty } from '@prisma/client'

type GeneratedQuestion = {
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }>
  gabarito: string
  explicacao: string
  materia: string
}

type GenerateRealInput = {
  editalId: string
  generatedBy?: string
}

type GenerateMiniInput = {
  courseId: string
  subjectId?: string         // se passado: só essa matéria; senão: mistura
  totalQuestoes?: number     // default 15
  durationMin?: number       // default 25
  bancaSlug?: string
}

function bancaStyleHint(bancaSlug?: string | null, format?: ExamFormat | null): string {
  const banca = (bancaSlug ?? '').toLowerCase()
  if (banca.includes('cebraspe') || format === 'CE') {
    return `BANCA: CEBRASPE — Estilo CERTO/ERRADO. Cada questão é uma afirmação. Resposta = "C" (certo) ou "E" (errado). Use linguagem técnica, frases longas com pegadinhas semânticas.`
  }
  if (banca.includes('fgv')) {
    return `BANCA: FGV — Múltipla escolha A-E. Enunciados longos com texto-base. Alternativas plausíveis, exigem leitura cuidadosa.`
  }
  if (banca.includes('fcc')) {
    return `BANCA: FCC — Múltipla escolha A-E. Direta ao ponto, foca em letra fria da lei.`
  }
  if (banca.includes('vunesp')) {
    return `BANCA: VUNESP — Múltipla escolha A-E. Estilo paulista, frases médias, alternativas distintas.`
  }
  return `Múltipla escolha A-E padrão, estilo concursos públicos brasileiros.`
}

async function generateQuestionsViaAI(args: {
  banca: string | null
  bancaSlug: string | null
  examFormat: ExamFormat | null
  curso: string
  subjects: Array<{ name: string; qtd: number }>
}): Promise<GeneratedQuestion[]> {
  const totalQtd = args.subjects.reduce((acc, s) => acc + s.qtd, 0)
  const styleHint = bancaStyleHint(args.bancaSlug, args.examFormat)
  const isCE = args.examFormat === 'CE' || (args.bancaSlug ?? '').toLowerCase().includes('cebraspe')

  const distribuicao = args.subjects.map((s) => `- ${s.name}: ${s.qtd} questões`).join('\n')

  const prompt = `Você é um banca examinadora especialista em concursos públicos brasileiros.
Gere ${totalQtd} questões INÉDITAS para simulado do concurso ${args.curso}.

${styleHint}

DISTRIBUIÇÃO POR MATÉRIA:
${distribuicao}

REGRAS:
- Cada questão deve ser tecnicamente correta, no estilo da banca informada
- Use legislação atualizada (CF/88, leis vigentes em 2026)
- Gabarito DEVE estar correto e fundamentado
- Explicação curta (2-3 frases) com base legal
${isCE ? '- Gabarito: "C" (certo) ou "E" (errado)\n- alternativas: array vazio [] (não tem letras)' : '- alternativas: 5 opções A, B, C, D, E\n- Gabarito: letra correta (A, B, C, D ou E)'}

FORMATO JSON (retorne APENAS o array, sem texto extra):
[
  {
    "enunciado": "texto da questão",
    "alternativas": ${isCE ? '[]' : '[{"letra":"A","texto":"..."},{"letra":"B","texto":"..."},{"letra":"C","texto":"..."},{"letra":"D","texto":"..."},{"letra":"E","texto":"..."}]'},
    "gabarito": "${isCE ? 'C' : 'A'}",
    "explicacao": "fundamento legal",
    "materia": "nome da matéria"
  }
]
`

  const raw = await callAI(prompt, { maxTokens: Math.min(8000, 200 * totalQtd), temperature: 0.6 })
  return parseAIJson<GeneratedQuestion[]>(raw)
}

/**
 * Gera SIMULADO REAL no formato exato do edital.
 * - Pega totalQuestoes/duracaoMin/examFormat do Edital
 * - Distribui pelo peso das matérias do edital (EditalSubject.expectedQuestions ou weight)
 * - Cria Question[] no banco + MockExam vinculando
 */
export async function generateSimuladoReal(input: GenerateRealInput) {
  const edital = await prisma.edital.findUnique({
    where: { id: input.editalId },
    include: {
      course: true,
      banca: true,
      subjects: { include: { subject: true } },
    },
  })
  if (!edital) throw new Error('Edital não encontrado')
  if (edital.subjects.length === 0) throw new Error('Edital sem matérias cadastradas')

  const totalQuestoes = edital.totalQuestoes ?? 80
  const durationMin = edital.duracaoMin ?? 240

  // Distribuição por peso
  const totalWeight = edital.subjects.reduce((acc, s) => acc + (s.expectedQuestions ?? s.weight), 0)
  const subjects = edital.subjects.map((s) => ({
    id: s.subjectId,
    name: s.subject.name,
    qtd: s.expectedQuestions ?? Math.max(1, Math.round((s.weight / totalWeight) * totalQuestoes)),
  }))

  // Ajustar pra bater o total
  const sumQtd = subjects.reduce((a, s) => a + s.qtd, 0)
  if (sumQtd !== totalQuestoes && subjects.length > 0) {
    subjects[0].qtd += totalQuestoes - sumQtd
  }

  const generated = await generateQuestionsViaAI({
    banca: edital.banca?.name ?? null,
    bancaSlug: edital.banca?.slug ?? null,
    examFormat: edital.examFormat,
    curso: edital.course.name,
    subjects,
  })

  // Persiste questões + simulado
  const mockExam = await prisma.$transaction(async (tx) => {
    const subjectByName = new Map(edital.subjects.map((s) => [s.subject.name.toLowerCase(), s.subjectId]))

    const createdQuestions = await Promise.all(
      generated.map((q) =>
        tx.question.create({
          data: {
            subjectId: subjectByName.get(q.materia?.toLowerCase() ?? '') ?? null,
            bancaSlug: edital.banca?.slug ?? null,
            orgao: edital.course.orgao,
            ano: edital.ano,
            difficulty: Difficulty.MEDIUM,
            source: QuestionSource.AI_GENERATED,
            enunciado: q.enunciado,
            alternativas: q.alternativas as any,
            gabarito: q.gabarito,
            explicacao: q.explicacao,
            tags: ['simulado-real', `edital:${edital.id}`],
          },
          select: { id: true },
        }),
      ),
    )

    return tx.mockExam.create({
      data: {
        title: `Simulado Real — ${edital.course.name} ${edital.ano}`,
        type: MockExamType.REAL,
        courseId: edital.courseId,
        editalId: edital.id,
        bancaSlug: edital.banca?.slug ?? null,
        questions: createdQuestions.map((q) => q.id) as any,
        durationMin,
        totalQuestoes,
        hasRedacao: edital.hasRedacao,
        wrongAnnulsRight: edital.wrongAnnulsRight,
        examFormat: edital.examFormat,
        generatedBy: input.generatedBy ?? 'AI:claude-sonnet-4-6',
      },
    })
  })

  return mockExam
}

/**
 * Busca questões existentes no banco que batem com filtros (matéria, banca opcional).
 * Usadas pra evitar gerar IA quando já temos questões boas.
 *
 * Estratégia:
 *  - Filtra por subjectId (obrigatório, vem do CourseSubject)
 *  - Prioriza por banca matching (se passada)
 *  - Sorteia aleatoriamente
 *  - Exclui questões anuladas e inativas
 *  - Não repete questões que o usuário JÁ respondeu (se userId passado)
 */
async function fetchExistingQuestions(args: {
  subjectIds: string[]
  bancaSlug?: string | null
  exclude?: string[]
  limit: number
  userId?: string
}): Promise<Array<{ id: string; subjectId: string | null }>> {
  if (args.subjectIds.length === 0 || args.limit === 0) return []

  // IDs de questões que o user já respondeu (evita repetir)
  let alreadyAttempted: string[] = []
  if (args.userId) {
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId: args.userId },
      select: { questionId: true },
      distinct: ['questionId'],
    })
    alreadyAttempted = attempts.map((a) => a.questionId)
  }

  const excludeAll = [...(args.exclude ?? []), ...alreadyAttempted]

  // Postgres: ORDER BY random() é ok pra volumes pequenos. Pra escalar, usar TABLESAMPLE.
  return prisma.question.findMany({
    where: {
      subjectId: { in: args.subjectIds },
      active: true,
      anulada: false,
      ...(args.bancaSlug && { bancaSlug: args.bancaSlug }),
      ...(excludeAll.length > 0 && { id: { notIn: excludeAll } }),
    },
    select: { id: true, subjectId: true },
    take: args.limit * 3, // pega 3x e sorteia
  }).then((rows) => rows.sort(() => Math.random() - 0.5).slice(0, args.limit))
}

/**
 * Gera MINI-SIMULADO — treino rápido por matéria (ou misto) do curso.
 * Reusa questões existentes do banco quando possível (economia de IA).
 */
export async function generateMiniSimulado(input: GenerateMiniInput & { userId?: string }) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    include: { courseSubjects: { include: { subject: true } } },
  })
  if (!course) throw new Error('Curso não encontrado')

  const totalQuestoes = input.totalQuestoes ?? 15
  const durationMin = input.durationMin ?? 25

  // Decide a distribuição: só uma matéria OU misto
  let subjects: Array<{ id: string; name: string; qtd: number }>
  if (input.subjectId) {
    const cs = course.courseSubjects.find((c) => c.subjectId === input.subjectId)
    if (!cs) throw new Error('Matéria não pertence ao curso')
    subjects = [{ id: cs.subjectId, name: cs.subject.name, qtd: totalQuestoes }]
  } else {
    // Misto: top 5 matérias por peso, distribui
    const top = [...course.courseSubjects].sort((a, b) => b.weight - a.weight).slice(0, 5)
    const totalW = top.reduce((a, c) => a + c.weight, 0)
    subjects = top.map((cs) => ({
      id: cs.subjectId,
      name: cs.subject.name,
      qtd: Math.max(1, Math.round((cs.weight / totalW) * totalQuestoes)),
    }))
    const sum = subjects.reduce((a, s) => a + s.qtd, 0)
    if (sum !== totalQuestoes && subjects.length > 0) subjects[0].qtd += totalQuestoes - sum
  }

  // Banca: usa a informada ou inferir do último edital do curso
  let bancaSlug = input.bancaSlug ?? null
  let examFormat: ExamFormat | null = null
  if (!bancaSlug) {
    const ultimoEdital = await prisma.edital.findFirst({
      where: { courseId: course.id },
      include: { banca: true },
      orderBy: { ano: 'desc' },
    })
    bancaSlug = ultimoEdital?.banca?.slug ?? null
    examFormat = ultimoEdital?.examFormat ?? null
  }

  // ECONOMIA DE IA: tenta primeiro reusar questões existentes
  const subjectIds = subjects.map((s) => s.id)
  const existing = await fetchExistingQuestions({
    subjectIds,
    bancaSlug,
    limit: totalQuestoes,
    userId: input.userId,
  })

  let questionIds = existing.map((q) => q.id)
  const missing = totalQuestoes - existing.length

  // Se faltam, gera via IA SÓ as que faltam (e distribui pelo subjects)
  if (missing > 0) {
    // Recalcula distribuição apenas pelos que faltam
    const existingBySubject = new Map<string, number>()
    for (const q of existing) {
      if (q.subjectId) existingBySubject.set(q.subjectId, (existingBySubject.get(q.subjectId) ?? 0) + 1)
    }
    const subjectsToGenerate = subjects.map((s) => ({
      ...s,
      qtd: Math.max(0, s.qtd - (existingBySubject.get(s.id) ?? 0)),
    })).filter((s) => s.qtd > 0)

    if (subjectsToGenerate.length > 0) {
      const generated = await generateQuestionsViaAI({
        banca: bancaSlug,
        bancaSlug,
        examFormat,
        curso: course.name,
        subjects: subjectsToGenerate,
      })

      const subjectByName = new Map(course.courseSubjects.map((c) => [c.subject.name.toLowerCase(), c.subjectId]))
      const created = await prisma.$transaction(
        generated.map((q) =>
          prisma.question.create({
            data: {
              subjectId: subjectByName.get(q.materia?.toLowerCase() ?? '') ?? input.subjectId ?? null,
              bancaSlug,
              orgao: course.orgao,
              difficulty: Difficulty.MEDIUM,
              source: QuestionSource.AI_GENERATED,
              enunciado: q.enunciado,
              alternativas: q.alternativas as any,
              gabarito: q.gabarito,
              explicacao: q.explicacao,
              tags: ['mini-simulado', `curso:${course.slug}`],
            },
            select: { id: true },
          }),
        ),
      )
      questionIds = [...questionIds, ...created.map((q) => q.id)]
    }
  }

  // Ainda assim limita ao total exato (caso IA tenha gerado mais do que pediu)
  questionIds = questionIds.slice(0, totalQuestoes)

  const recycledCount = existing.length
  const generatedCount = questionIds.length - recycledCount

  const mockExam = await prisma.mockExam.create({
    data: {
      title: `Mini-Simulado — ${course.name}${input.subjectId ? ` (${subjects[0].name})` : ''}`,
      type: MockExamType.MINI,
      courseId: course.id,
      bancaSlug,
      subjectId: input.subjectId ?? null,
      questions: questionIds as any,
      durationMin,
      totalQuestoes,
      examFormat,
      generatedBy: recycledCount > 0
        ? `MIX:${recycledCount}-reused+${generatedCount}-ai`
        : 'AI:claude-sonnet-4-6',
    },
  })

  return mockExam
}

/**
 * Calcula pontuação respeitando regra da banca.
 * Cebraspe (wrongAnnulsRight): cada erro anula 1 acerto. Score em base 10.
 */
export function calculateScore(opts: {
  totalQuestoes: number
  acertos: number
  erros: number
  brancos: number
  wrongAnnulsRight: boolean
}): { score: number; scoreRaw: number } {
  const { totalQuestoes, acertos, erros, wrongAnnulsRight } = opts
  const liquido = wrongAnnulsRight ? Math.max(0, acertos - erros) : acertos
  return {
    score: +((liquido / totalQuestoes) * 10).toFixed(2),
    scoreRaw: +((acertos / totalQuestoes) * 10).toFixed(2),
  }
}
