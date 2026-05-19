import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const edital = await prisma.edital.findUnique({
    where: { id: params.id },
    include: {
      banca: true,
      course: true,
      subjects: { include: { subject: true }, orderBy: { order: 'asc' } },
    },
  })
  if (!edital) return NextResponse.json({ message: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(edital)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  const allowed = ['numero', 'ano', 'titulo', 'vagas', 'salario', 'escolaridade', 'dataAbertura', 'dataInscricaoFim', 'dataProva', 'totalQuestoes', 'duracaoMin', 'hasRedacao', 'wrongAnnulsRight', 'examFormat', 'status', 'pdfUrl', 'sourceUrl']
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
  const updated = await prisma.edital.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  await prisma.edital.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
