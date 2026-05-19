import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/me/stats
// Retorna stats gamificadas: nível, XP, streak, taxa de acerto, dias estudando, horas totais.
//
// Fórmulas:
//   - XP por hora estudada: 50
//   - XP por questão correta: 5
//   - XP por simulado completo: 100
//   - Nível: floor(sqrt(xp / 50)) + 1  (1 = 50 XP, 2 = 200, 3 = 450...)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } })

  // Questões respondidas (totais)
  const [totalAttempts, correctAttempts] = await Promise.all([
    prisma.questionAttempt.count({ where: { userId: user.id } }),
    prisma.questionAttempt.count({ where: { userId: user.id, correct: true } }),
  ])

  // Simulados completados
  const simuladosFeitos = await prisma.mockExamResult.count({
    where: { userId: user.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
  })

  // Horas totais
  const totalSessions = await prisma.studySession.aggregate({
    where: { userId: user.id },
    _sum: { durationMin: true },
  })
  const totalMin = totalSessions._sum.durationMin ?? 0
  const totalHoras = Math.round(totalMin / 60)

  // Dias estudando (dias distintos com pelo menos 1 sessão)
  const sessionDates = await prisma.studySession.findMany({
    where: { userId: user.id },
    select: { createdAt: true },
  })
  const diasUnicos = new Set(
    sessionDates.map((s) => s.createdAt.toISOString().slice(0, 10)),
  )
  const diasEstudando = diasUnicos.size

  // Streak (consecutivo)
  const streakDays = profile?.streakDays ?? 0

  // Taxa de acerto
  const taxaAcerto = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  // XP
  const xp = totalHoras * 50 + correctAttempts * 5 + simuladosFeitos * 100
  const nivel = Math.floor(Math.sqrt(xp / 50)) + 1
  const xpProxNivel = 50 * Math.pow(nivel, 2)
  const xpNivelAnterior = nivel > 1 ? 50 * Math.pow(nivel - 1, 2) : 0
  const xpNoNivel = xp - xpNivelAnterior
  const xpRequiredNivel = xpProxNivel - xpNivelAnterior
  const pctNivel = xpRequiredNivel > 0 ? Math.min(100, (xpNoNivel / xpRequiredNivel) * 100) : 0

  // Última sequência (últimos 7 dias)
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const studiedDays = last7Days.map((d) => diasUnicos.has(d))

  // Achievements simples
  const achievements: Array<{ id: string; label: string; icon: string; unlocked: boolean }> = [
    { id: 'first-question', label: 'Primeira questão', icon: '🎯', unlocked: totalAttempts >= 1 },
    { id: 'hundred-questions', label: '100 questões respondidas', icon: '💯', unlocked: totalAttempts >= 100 },
    { id: 'thousand-questions', label: '1000 questões', icon: '🏆', unlocked: totalAttempts >= 1000 },
    { id: 'first-simulado', label: 'Primeiro simulado', icon: '📝', unlocked: simuladosFeitos >= 1 },
    { id: 'streak-7', label: 'Sequência de 7 dias', icon: '🔥', unlocked: streakDays >= 7 },
    { id: 'streak-30', label: 'Sequência de 30 dias', icon: '⚡', unlocked: streakDays >= 30 },
    { id: 'high-accuracy', label: '80% de acertos', icon: '🎖️', unlocked: taxaAcerto >= 80 && totalAttempts >= 50 },
    { id: 'study-100h', label: '100 horas estudadas', icon: '⏱️', unlocked: totalHoras >= 100 },
  ]

  return NextResponse.json({
    nivel,
    xp,
    xpNoNivel,
    xpProxNivel: xpRequiredNivel,
    pctNivel: Math.round(pctNivel),
    streakDays,
    studiedDays, // bool[] últimos 7 dias
    diasEstudando,
    totalHoras,
    totalMin,
    totalAttempts,
    correctAttempts,
    taxaAcerto,
    simuladosFeitos,
    achievements,
    unlockedAchievements: achievements.filter((a) => a.unlocked).length,
  })
}
