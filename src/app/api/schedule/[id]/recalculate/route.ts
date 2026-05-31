import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { runSchedule, persistSchedule, summarize } from '@/lib/schedule-helpers'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const turbo = Boolean(body?.turbo)
  const turboTopN = typeof body?.turboTopN === 'number' ? body.turboTopN : undefined

  const plan = await prisma.studyPlan.findFirst({
    where: { id: params.id, userId: user.id, active: true },
  })
  if (!plan) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

  try {
    const dto = {
      courseId: plan.courseId,
      editalId: plan.editalId ?? undefined,
      hoursPerDay: plan.hoursPerDay,
      daysPerWeek: plan.daysPerWeek as number[],
      startDate: new Date().toISOString(),
      endDate: plan.endDate.toISOString(),
      turbo,
      turboTopN,
    }
    const result = await runSchedule(dto)
    const newPlan = await persistSchedule(user.id, dto, result)
    return NextResponse.json({ planId: newPlan.id, turbo, ...summarize(result) })
  } catch (e: any) {
    return NextResponse.json({ message: e.message ?? 'Erro' }, { status: 400 })
  }
}
