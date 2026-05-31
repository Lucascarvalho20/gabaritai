import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { computeObjetivasDuration } from '@/lib/exam-duration'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/me/provas/[provaId]/start
 *
 * Cria (ou reusa) um MockExam tipo PERSONALIZADO derivado da Prova oficial
 * pra o aluno fazer cronometrado. Retorna o mockExamId pra frontend
 * redirecionar pra `/dashboard/simulados/[mockExamId]`.
 *
 * Aluno pode fazer/refazer ilimitado: cada start cria uma nova MockExamResult,
 * mas o MockExam (template) é único por prova.
 *
 * Duração: 4 minutos por questão (regra geral pra CESPE/Cebraspe). Pode ser
 * customizado depois com base na duração oficial do edital.
 */
export async function POST(req: NextRequest, { params }: { params: { provaId: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const prova = await prisma.prova.findUnique({
    where: { id: params.provaId },
    include: {
      banca: { select: { slug: true } },
      edital: { select: { duracaoMin: true, wrongAnnulsRight: true, examFormat: true, hasRedacao: true, rawData: true } },
      questions: { where: { active: true }, select: { id: true }, orderBy: { numeroQuestao: 'asc' } },
    },
  })

  if (!prova) return NextResponse.json({ message: 'Prova não encontrada' }, { status: 404 })
  if (prova.questions.length === 0) {
    return NextResponse.json({ message: 'Essa prova ainda não tem questões cadastradas' }, { status: 400 })
  }

  const totalQuestoes = prova.questions.length
  // Duração: usa edital + subtrai proporcional da redação se mock não tem redação
  const duration = computeObjetivasDuration(prova.edital, totalQuestoes, { mockHasRedacao: false })
  const durationMin = duration.durationMin

  // Reusa ou cria MockExam template (1 por prova)
  const title = `Prova ${prova.titulo}`
  let mockExam = await prisma.mockExam.findFirst({
    where: { type: 'PERSONALIZADO', title, courseId: prova.courseId ?? undefined },
  })

  if (!mockExam) {
    mockExam = await prisma.mockExam.create({
      data: {
        title,
        type: 'PERSONALIZADO',
        courseId: prova.courseId,
        editalId: prova.editalId,
        bancaSlug: prova.banca?.slug ?? null,
        questions: prova.questions.map((q) => q.id),
        durationMin,
        totalQuestoes,
        hasRedacao: prova.edital?.hasRedacao ?? false,
        wrongAnnulsRight: prova.edital?.wrongAnnulsRight ?? false,
        examFormat: prova.edital?.examFormat ?? null,
        generatedBy: 'OFFICIAL',
        active: true,
      },
    })
  }

  // Se aluno tem result IN_PROGRESS pra esse mock, devolve ele (idempotente)
  const existing = await prisma.mockExamResult.findUnique({
    where: { userId_mockExamId: { userId: user.id, mockExamId: mockExam.id } },
  })
  if (existing && existing.status === 'IN_PROGRESS') {
    return NextResponse.json({
      mockExamId: mockExam.id,
      resultId: existing.id,
      resumed: true,
      durationNote: duration.note ?? null,
    })
  }

  // Se tem result SUBMITTED, reseta pra permitir refazer (regra "ilimitado")
  if (existing) {
    await prisma.mockExamResult.delete({ where: { id: existing.id } })
  }

  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + durationMin * 60_000)
  const result = await prisma.mockExamResult.create({
    data: {
      userId: user.id,
      mockExamId: mockExam.id,
      status: 'IN_PROGRESS',
      startedAt,
      expiresAt,
    },
  })

  return NextResponse.json({
    mockExamId: mockExam.id,
    resultId: result.id,
    resumed: false,
    durationNote: duration.note ?? null,
  })
}
