import { NextRequest, NextResponse } from 'next/server'
import { runSchedule, summarize, ScheduleDto } from '@/lib/schedule-helpers'

export async function POST(req: NextRequest) {
  try {
    const dto = (await req.json()) as ScheduleDto
    if (!dto.courseId || !dto.startDate || !dto.endDate || !dto.hoursPerDay || !dto.daysPerWeek) {
      return NextResponse.json({ message: 'Faltam campos obrigatórios' }, { status: 400 })
    }
    const result = await runSchedule(dto)
    return NextResponse.json(summarize(result))
  } catch (e: any) {
    return NextResponse.json({ message: e.message ?? 'Erro' }, { status: 400 })
  }
}
