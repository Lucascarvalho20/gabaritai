import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { runSchedule, persistSchedule, summarize, ScheduleDto } from '@/lib/schedule-helpers'

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  try {
    const dto = (await req.json()) as ScheduleDto
    if (!dto.courseId || !dto.startDate || !dto.endDate || !dto.hoursPerDay || !dto.daysPerWeek) {
      return NextResponse.json({ message: 'Faltam campos obrigatórios' }, { status: 400 })
    }
    const result = await runSchedule(dto)
    const plan = await persistSchedule(user.id, dto, result)
    return NextResponse.json({ planId: plan.id, ...summarize(result) })
  } catch (e: any) {
    return NextResponse.json({ message: e.message ?? 'Erro' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: user.id, active: true },
    include: {
      course: { select: { id: true, slug: true, name: true, area: true } },
      edital: { select: { id: true, titulo: true, dataProva: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ plan })
}
