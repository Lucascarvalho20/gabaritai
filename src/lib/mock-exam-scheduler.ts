import { prisma } from './prisma'
import { MockExamType } from '@prisma/client'
import { getActiveEditalForCourse } from './edital-resolver'
import { generateSimuladoReal, generateMiniSimulado } from './simulado-generator'

// Janela de cada simulado (horário São Paulo):
// - MINI terça:    Ter 00:00 → Ter 23:59
// - MINI quinta:   Qui 00:00 → Qui 23:59
// - REAL domingo:  Dom 00:00 → Dom 23:59
//
// Estratégia de cache: 1 simulado por curso por janela.
// Todo aluno do curso X faz O MESMO simulado — economia brutal de IA.

export type ScheduledDay = 'TUE' | 'THU' | 'SUN'

const DAY_INDEX: Record<ScheduledDay, number> = { SUN: 0, TUE: 2, THU: 4 }

// Retorna a segunda-feira 00:00 BRT da semana ISO da data
export function getWeekStart(d: Date = new Date()): Date {
  const date = new Date(d)
  // Converte pra horário SP
  const sp = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const day = sp.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // segunda da semana atual (ISO)
  sp.setDate(sp.getDate() + diff)
  sp.setHours(0, 0, 0, 0)
  return sp
}

// Data específica da janela (TUE/THU/SUN dessa semana)
export function getScheduledDate(weekStart: Date, day: ScheduledDay): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + DAY_INDEX[day])
  d.setHours(0, 0, 0, 0)
  return d
}

export function getDayWindow(scheduledDate: Date): { from: Date; until: Date } {
  const from = new Date(scheduledDate)
  from.setHours(0, 0, 0, 0)
  const until = new Date(scheduledDate)
  until.setHours(23, 59, 59, 999)
  return { from, until }
}

// Pega ou gera o simulado da janela. Idempotente: se já tem, retorna o existente.
export async function getOrCreateWeeklyMockExam(args: {
  courseId: string
  day: ScheduledDay
  weekStart?: Date
}) {
  const weekStart = args.weekStart ?? getWeekStart()
  const scheduledDate = getScheduledDate(weekStart, args.day)
  const { from, until } = getDayWindow(scheduledDate)

  const existing = await prisma.mockExam.findFirst({
    where: {
      courseId: args.courseId,
      weekStart,
      scheduledDay: args.day,
      active: true,
    },
  })
  if (existing) return existing

  const isReal = args.day === 'SUN'

  if (isReal) {
    const edital = await getActiveEditalForCourse(args.courseId)
    if (!edital) {
      throw new Error('Nenhum edital cadastrado pro curso — admin precisa cadastrar antes de gerar simulado real')
    }
    const generated = await generateSimuladoReal({ editalId: edital.id })
    return prisma.mockExam.update({
      where: { id: generated.id },
      data: {
        weekStart,
        scheduledDay: args.day,
        availableFrom: from,
        availableUntil: until,
        title: `Simulado Real — ${formatWeek(weekStart)} (domingo)`,
      },
    })
  }

  // Mini terça/quinta — sem userId pra ficar compartilhável (questões NÃO filtram por "já respondi")
  const generated = await generateMiniSimulado({
    courseId: args.courseId,
    totalQuestoes: 20,
    durationMin: 30,
  })
  return prisma.mockExam.update({
    where: { id: generated.id },
    data: {
      type: MockExamType.MINI,
      weekStart,
      scheduledDay: args.day,
      availableFrom: from,
      availableUntil: until,
      title: `Mini-Simulado — ${formatWeek(weekStart)} (${args.day === 'TUE' ? 'terça' : 'quinta'})`,
    },
  })
}

function formatWeek(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `Semana ${fmt(weekStart)}–${fmt(end)}`
}

// Lista os 3 simulados da semana pro curso (gera se não existir)
export async function getWeeklySimuladosForCourse(courseId: string, weekStart?: Date) {
  const ws = weekStart ?? getWeekStart()
  const days: ScheduledDay[] = ['TUE', 'THU', 'SUN']
  const results: Array<{
    day: ScheduledDay
    label: string
    mockExam: Awaited<ReturnType<typeof prisma.mockExam.findFirst>>
    scheduledDate: Date
    window: { from: Date; until: Date }
  }> = []
  for (const day of days) {
    const scheduledDate = getScheduledDate(ws, day)
    const window = getDayWindow(scheduledDate)
    const mockExam = await prisma.mockExam.findFirst({
      where: { courseId, weekStart: ws, scheduledDay: day, active: true },
    })
    results.push({
      day,
      label: day === 'TUE' ? 'terça' : day === 'THU' ? 'quinta' : 'domingo',
      mockExam,
      scheduledDate,
      window,
    })
  }
  return results
}

// Helper: simulado "tá disponível pra começar agora"?
export function isWindowOpen(mockExam: { availableFrom: Date | null; availableUntil: Date | null }): boolean {
  if (!mockExam.availableFrom || !mockExam.availableUntil) return false
  const now = new Date()
  return now >= mockExam.availableFrom && now <= mockExam.availableUntil
}
