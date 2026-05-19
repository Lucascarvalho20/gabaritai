import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getWeekStart, getWeeklySimuladosForCourse, isWindowOpen } from '@/lib/mock-exam-scheduler'

// GET /api/simulados/weekly?courseSlug=pmdf-soldado
// Retorna os 3 simulados da semana atual (terça/quinta/domingo) pro curso do aluno
// com status calculado por aluno (não-iniciado / em-andamento / finalizado / expirado).
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug')
  if (!courseSlug) return NextResponse.json({ message: 'courseSlug obrigatório' }, { status: 400 })

  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  const weekStart = getWeekStart()
  const weekly = await getWeeklySimuladosForCourse(course.id, weekStart)

  const mockExamIds = weekly.filter((w) => w.mockExam).map((w) => w.mockExam!.id)
  const results = mockExamIds.length
    ? await prisma.mockExamResult.findMany({
        where: { userId: user.id, mockExamId: { in: mockExamIds } },
      })
    : []

  const data = weekly.map((w) => {
    const result = w.mockExam ? results.find((r) => r.mockExamId === w.mockExam!.id) : null
    let status: 'NOT_GENERATED' | 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED'
    if (!w.mockExam) {
      status = 'NOT_GENERATED'
    } else if (result?.status === 'SUBMITTED' || result?.status === 'EXPIRED') {
      status = 'COMPLETED'
    } else if (result?.status === 'IN_PROGRESS') {
      status = 'IN_PROGRESS'
    } else if (isWindowOpen(w.mockExam)) {
      status = 'AVAILABLE'
    } else if (new Date() < (w.mockExam.availableFrom ?? new Date())) {
      status = 'LOCKED'
    } else {
      status = 'EXPIRED'
    }

    return {
      day: w.day,
      label: w.label,
      scheduledDate: w.scheduledDate,
      windowFrom: w.window.from,
      windowUntil: w.window.until,
      type: w.day === 'SUN' ? 'REAL' : 'MINI',
      mockExam: w.mockExam
        ? {
            id: w.mockExam.id,
            title: w.mockExam.title,
            totalQuestoes: w.mockExam.totalQuestoes,
            durationMin: w.mockExam.durationMin,
            hasRedacao: w.mockExam.hasRedacao,
            examFormat: w.mockExam.examFormat,
            bancaSlug: w.mockExam.bancaSlug,
          }
        : null,
      result: result
        ? {
            id: result.id,
            status: result.status,
            score: result.score,
            acertos: result.acertos,
            erros: result.erros,
            brancos: result.brancos,
            finishedAt: result.finishedAt,
          }
        : null,
      status,
    }
  })

  return NextResponse.json({ weekStart, courseSlug, simulados: data })
}
