import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { generateSimuladoReal, generateMiniSimulado } from '@/lib/simulado-generator'

export const maxDuration = 90 // geração IA pode demorar

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()

    if (body.type === 'REAL') {
      if (!body.editalId) return NextResponse.json({ message: 'editalId obrigatório' }, { status: 400 })
      const exam = await generateSimuladoReal({ editalId: body.editalId, generatedBy: `user:${user.id}` })
      return NextResponse.json({ id: exam.id, title: exam.title })
    }

    if (body.type === 'MINI') {
      if (!body.courseId) return NextResponse.json({ message: 'courseId obrigatório' }, { status: 400 })
      const exam = await generateMiniSimulado({
        courseId: body.courseId,
        subjectId: body.subjectId,
        totalQuestoes: body.totalQuestoes,
        durationMin: body.durationMin,
        userId: user.id, // evita repetir questões já respondidas pelo aluno
      })
      return NextResponse.json({ id: exam.id, title: exam.title, source: exam.generatedBy })
    }

    return NextResponse.json({ message: 'type deve ser "REAL" ou "MINI"' }, { status: 400 })
  } catch (err: any) {
    console.error('[simulado.generate]', err)
    return NextResponse.json({ message: err.message ?? 'Erro ao gerar simulado' }, { status: 500 })
  }
}
