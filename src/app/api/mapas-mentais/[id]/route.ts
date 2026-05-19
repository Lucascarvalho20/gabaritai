import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const mat = await prisma.material.findUnique({
    where: { id: params.id },
    include: { subject: { select: { name: true, slug: true } } },
  })
  if (!mat || mat.type !== 'MAPA_MENTAL') {
    return NextResponse.json({ message: 'Mapa mental não encontrado' }, { status: 404 })
  }

  let mapa: any = {}
  try {
    mapa = mat.content ? JSON.parse(mat.content) : {}
  } catch {}

  return NextResponse.json({
    id: mat.id,
    title: mat.title,
    createdAt: mat.createdAt,
    subject: mat.subject,
    mapa,
  })
}
