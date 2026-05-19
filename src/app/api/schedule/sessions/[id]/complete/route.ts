import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { StudySessionStatus } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const session = await prisma.studyPlanSession.findUnique({
    where: { id: params.id },
    include: { studyPlan: true },
  })
  if (!session || session.studyPlan.userId !== user.id) {
    return NextResponse.json({ message: 'Sessão não encontrada' }, { status: 404 })
  }

  const updated = await prisma.studyPlanSession.update({
    where: { id: params.id },
    data: { status: StudySessionStatus.CONCLUIDO, completedAt: new Date() },
  })
  return NextResponse.json(updated)
}
