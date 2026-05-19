import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { isWindowOpen } from '@/lib/mock-exam-scheduler'

// POST /api/simulados/[id]/start
// Cria MockExamResult em status IN_PROGRESS com expiresAt = startedAt + durationMin.
// Valida janela (terça/quinta/domingo) — se fora, 403.
// Idempotente: se aluno já tem um result IN_PROGRESS, retorna o mesmo.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({ where: { id: params.id } })
  if (!exam) return NextResponse.json({ message: 'Simulado não encontrado' }, { status: 404 })

  // Valida janela — exceção: admins podem iniciar fora de janela (pra testar)
  const isShared = exam.weekStart && exam.scheduledDay
  if (isShared && user.role !== 'ADMIN') {
    if (!isWindowOpen(exam)) {
      const now = new Date()
      if (exam.availableFrom && now < exam.availableFrom) {
        return NextResponse.json({
          message: `Simulado abre em ${exam.availableFrom.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          code: 'WINDOW_NOT_OPEN',
          opensAt: exam.availableFrom,
        }, { status: 403 })
      }
      return NextResponse.json({
        message: 'Janela do simulado expirada — aguarde o próximo',
        code: 'WINDOW_EXPIRED',
      }, { status: 403 })
    }
  }

  // Busca result existente
  const existing = await prisma.mockExamResult.findUnique({
    where: { userId_mockExamId: { userId: user.id, mockExamId: exam.id } },
  })
  if (existing) {
    if (existing.status === 'SUBMITTED' || existing.status === 'EXPIRED') {
      return NextResponse.json({ message: 'Você já fez esse simulado', code: 'ALREADY_DONE' }, { status: 403 })
    }
    return NextResponse.json({
      resultId: existing.id,
      startedAt: existing.startedAt,
      expiresAt: existing.expiresAt,
      resumed: true,
    })
  }

  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + exam.durationMin * 60_000)

  const result = await prisma.mockExamResult.create({
    data: {
      userId: user.id,
      mockExamId: exam.id,
      status: 'IN_PROGRESS',
      startedAt,
      expiresAt,
    },
  })

  return NextResponse.json({
    resultId: result.id,
    startedAt: result.startedAt,
    expiresAt: result.expiresAt,
    resumed: false,
  })
}
