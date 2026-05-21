import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/progresso?courseSlug= (opcional pra filtrar por curso)
// Retorna dados consolidados de progresso real do aluno.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug') ?? undefined

  let courseId: string | undefined
  if (courseSlug) {
    const c = await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } })
    courseId = c?.id
  }

  // Questões
  const allAttempts = await prisma.questionAttempt.findMany({
    where: { userId: user.id },
    select: { correct: true, createdAt: true, question: { select: { subjectId: true, source: true, bancaSlug: true } } },
  })
  const totalAttempts = allAttempts.length
  const correctAttempts = allAttempts.filter((a) => a.correct).length
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  // Por origem
  const byOrigin = allAttempts.reduce(
    (acc, a) => {
      const src = a.question?.source ?? 'AI_GENERATED'
      if (!acc[src]) acc[src] = { total: 0, correct: 0 }
      acc[src].total++
      if (a.correct) acc[src].correct++
      return acc
    },
    {} as Record<string, { total: number; correct: number }>,
  )

  // Últimos 14 dias — série temporal (questões respondidas por dia)
  const today = new Date()
  const series14d = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const ymd = d.toISOString().slice(0, 10)
    const dayAttempts = allAttempts.filter((a) => a.createdAt.toISOString().slice(0, 10) === ymd)
    return {
      day: ymd,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      total: dayAttempts.length,
      correct: dayAttempts.filter((a) => a.correct).length,
    }
  })

  // Mastery por matéria (do curso ou todos)
  const masteries = await prisma.userSubjectMastery.findMany({
    where: { userId: user.id, ...(courseId && { courseId }) },
    include: { subject: { select: { id: true, slug: true, name: true } }, course: { select: { slug: true, name: true } } },
    orderBy: { masteryScore: 'desc' },
  })

  // Simulados feitos
  const exams = await prisma.mockExamResult.findMany({
    where: { userId: user.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
    select: {
      id: true, score: true, scoreRaw: true, acertos: true, erros: true, brancos: true, status: true, finishedAt: true,
      mockExam: { select: { id: true, title: true, type: true, totalQuestoes: true, courseId: true, bancaSlug: true } },
    },
    orderBy: { finishedAt: 'desc' },
    take: 20,
  })

  // Flashcards
  const fcReviews = await prisma.flashcardReview.findMany({
    where: { userId: user.id },
    select: { quality: true, nextReview: true, interval: true },
  })
  const totalFlashcards = fcReviews.length
  // SM-2: quality 0-2 = "difícil/erro", 3 = "ok", 4-5 = "fácil"
  const fcCounts = fcReviews.reduce(
    (acc, r) => {
      if (r.quality >= 4) acc.faceis++
      else if (r.quality === 3) acc.ok++
      else acc.dificeis++
      return acc
    },
    { faceis: 0, ok: 0, dificeis: 0 },
  )
  const fcAReviewHoje = fcReviews.filter((r) => r.nextReview <= today).length

  // Horas estudadas total + por matéria
  const sessions = await prisma.studySession.findMany({
    where: { userId: user.id },
    select: { durationMin: true, subjectId: true, createdAt: true },
  })
  const totalMin = sessions.reduce((s, x) => s + x.durationMin, 0)
  const horasPorSubject = new Map<string, number>()
  for (const s of sessions) {
    if (!s.subjectId) continue
    horasPorSubject.set(s.subjectId, (horasPorSubject.get(s.subjectId) ?? 0) + s.durationMin)
  }

  // Cursos do aluno
  const enrollments = await prisma.userCourseEnrollment.findMany({
    where: { userId: user.id, isActive: true },
    include: { course: { select: { id: true, slug: true, name: true, cargo: true } } },
  })

  // ─── Aliases pro dashboard novo ─────────────────────────────────────────
  // byMateria: lista por matéria com base nas masteries (só matérias com atividade)
  const byMateria = masteries
    .filter((m) => m.totalAttempts > 0)
    .map((m) => ({
      subjectId: m.subjectId,
      name: m.subject.name,
      total: m.totalAttempts,
      correct: m.correctAttempts,
      pct: m.totalAttempts > 0 ? Math.round((m.correctAttempts / m.totalAttempts) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // weekly: últimos 7 dias do series14d, em formato compacto
  const weekly = series14d.slice(-7).map((d) => ({
    dia: d.label.split(',')[0]?.slice(0, 3) ?? d.label,
    total: d.total,
    acertos: d.total > 0 ? Math.round(((d as any).correct ?? 0) / d.total * 100) : 0,
  }))

  return NextResponse.json({
    overview: {
      totalAttempts,
      correctAttempts,
      accuracy,
      totalFlashcards,
      flashcardsAReviewHoje: fcAReviewHoje,
      totalHoras: Math.round(totalMin / 60),
      totalSimulados: exams.length,
      mediaNotaSimulados: exams.length ? +(exams.reduce((s, e) => s + e.score, 0) / exams.length).toFixed(2) : 0,
    },
    byOrigin: {
      OFFICIAL: { total: byOrigin.OFFICIAL?.total ?? 0, correct: byOrigin.OFFICIAL?.correct ?? 0 },
      AI_GENERATED: { total: byOrigin.AI_GENERATED?.total ?? 0, correct: byOrigin.AI_GENERATED?.correct ?? 0 },
      ADAPTED: { total: byOrigin.ADAPTED?.total ?? 0, correct: byOrigin.ADAPTED?.correct ?? 0 },
    },
    series14d,
    masteries: masteries.map((m) => ({
      subjectId: m.subjectId,
      subjectName: m.subject.name,
      courseName: m.course.name,
      courseSlug: m.course.slug,
      masteryScore: m.masteryScore,
      totalAttempts: m.totalAttempts,
      correctAttempts: m.correctAttempts,
      horasEstudadas: Math.round((horasPorSubject.get(m.subjectId) ?? 0) / 60 * 10) / 10,
    })),
    exams: exams.map((e) => ({
      id: e.id,
      title: e.mockExam.title,
      type: e.mockExam.type,
      score: e.score,
      acertos: e.acertos,
      erros: e.erros,
      brancos: e.brancos,
      total: e.mockExam.totalQuestoes,
      finishedAt: e.finishedAt,
      bancaSlug: e.mockExam.bancaSlug,
    })),
    flashcardStats: { total: totalFlashcards, ...fcCounts, aReviewHoje: fcAReviewHoje },
    cursos: enrollments.map((e) => e.course),
    // Aliases pro dashboard novo (consumo simplificado)
    byMateria,
    weekly,
  })
}
