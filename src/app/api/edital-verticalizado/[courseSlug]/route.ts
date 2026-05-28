import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getActiveEditalForCourse } from '@/lib/edital-resolver'
import { getVerticalizadoCacheKey } from '@/lib/verticalizado'

// GET /api/edital-verticalizado/[courseSlug]
// Retorna o edital verticalizado: matérias com peso + assuntos top cobrados +
// estatísticas (quantas questões já fez de cada matéria/assunto + acerto%).
export async function GET(req: NextRequest, { params }: { params: { courseSlug: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const course = await prisma.course.findUnique({ where: { slug: params.courseSlug } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const edital = await getActiveEditalForCourse(course.id)
  if (!edital) {
    return NextResponse.json({
      course: { slug: course.slug, name: course.name, cargo: course.cargo },
      edital: null,
      materias: [],
      message: 'Esse curso ainda não tem edital cadastrado. Admin precisa importar um.',
    })
  }

  // Pra cada matéria do edital, busca attempts do user e questões disponíveis
  const subjectIds = edital.subjects.map((s) => s.subjectId)
  const myAttempts = await prisma.questionAttempt.findMany({
    where: { userId: user.id, question: { subjectId: { in: subjectIds } } },
    select: { correct: true, question: { select: { subjectId: true, ano: true, source: true } } },
  })
  const totalQuestions = await prisma.question.groupBy({
    by: ['subjectId', 'source'],
    where: { active: true, anulada: false, subjectId: { in: subjectIds } },
    _count: { _all: true },
  })

  const materias = edital.subjects.map((es) => {
    const subjAttempts = myAttempts.filter((a) => a.question?.subjectId === es.subjectId)
    const totalSubj = subjAttempts.length
    const corrSubj = subjAttempts.filter((a) => a.correct).length

    const questDisponiveis = totalQuestions.filter((q) => q.subjectId === es.subjectId)
    const totalOfic = questDisponiveis.find((q) => q.source === 'OFFICIAL')?._count._all ?? 0
    const totalIA = questDisponiveis.find((q) => q.source === 'AI_GENERATED')?._count._all ?? 0

    // Programa = string com tópicos. Vou parsing pra gerar lista
    const programa = (es.programa ?? '').split(/[;\n]/).map((s) => s.trim()).filter((s) => s.length > 0)

    return {
      subjectId: es.subjectId,
      subjectSlug: es.subject.slug,
      subjectName: es.subject.name,
      weight: es.weight,
      expectedQuestions: es.expectedQuestions,
      programaTopicos: programa,
      stats: {
        meusAcertos: corrSubj,
        meusErros: totalSubj - corrSubj,
        meuTotal: totalSubj,
        meuAcerto: totalSubj > 0 ? Math.round((corrSubj / totalSubj) * 100) : null,
        questoesDisponiveis: totalOfic + totalIA,
        oficiais: totalOfic,
        ia: totalIA,
      },
    }
  })

  // Ordena por peso decrescente (mais cobradas primeiro)
  materias.sort((a, b) => b.weight - a.weight)

  // Análise estratégica IA: busca do AIGenerationCache (admin pode editar)
  let analiseEstrategica: string | null = null
  try {
    const key = getVerticalizadoCacheKey({
      orgao: course.orgao ?? course.name,
      cargo: course.cargo ?? course.name,
      banca: edital.banca?.name,
    })
    const cached = await prisma.aIGenerationCache.findUnique({ where: { cacheKey: key } })
    if (cached?.content && typeof cached.content === 'string') {
      analiseEstrategica = cached.content as string
      // Incrementa hit count, atualiza lastUsedAt
      prisma.aIGenerationCache.update({
        where: { cacheKey: key },
        data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[edital-verticalizado] cache lookup failed:', err)
  }

  return NextResponse.json({
    course: { slug: course.slug, name: course.name, cargo: course.cargo, orgao: course.orgao },
    edital: {
      id: edital.id,
      ano: edital.ano,
      titulo: edital.titulo,
      banca: edital.banca?.name ?? null,
      bancaSlug: edital.banca?.slug ?? null,
      dataProva: edital.dataProva,
      totalQuestoes: edital.totalQuestoes,
      duracaoMin: edital.duracaoMin,
      vagas: edital.vagas,
      examFormat: edital.examFormat,
      hasRedacao: edital.hasRedacao,
      isActive: edital.isActive,
    },
    materias,
    analiseEstrategica,
  })
}
