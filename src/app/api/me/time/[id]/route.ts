import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-errors'
import { StudyTimeType } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_TYPES = new Set<string>(Object.values(StudyTimeType))
const MAX_DURATION_SEC = 24 * 60 * 60

async function ownEntry(req: NextRequest, id: string) {
  const user = await getUserFromRequest(req)
  if (!user) return { error: NextResponse.json({ message: 'Não autenticado' }, { status: 401 }) }
  const entry = await prisma.studyTimeEntry.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!entry) return { error: NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 }) }
  if (entry.userId !== user.id && user.role !== 'ADMIN') {
    return { error: NextResponse.json({ message: 'Acesso negado' }, { status: 403 }) }
  }
  return { user, entry }
}

/** PATCH — edita tipo/label/nota/duração do próprio registro */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await ownEntry(req, params.id)
  if ('error' in r) return r.error
  try {
    const body = await req.json()
    const data: Record<string, any> = {}

    if (typeof body.type === 'string' && VALID_TYPES.has(body.type)) data.type = body.type
    if ('label' in body) data.label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) || null : null
    if ('note' in body) data.note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) || null : null
    if ('durationSec' in body) {
      const d = Math.round(Number(body.durationSec))
      if (!Number.isFinite(d) || d <= 0 || d > MAX_DURATION_SEC) {
        return NextResponse.json({ message: 'Duração inválida (1s a 24h).' }, { status: 400 })
      }
      data.durationSec = d
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'Nada pra atualizar' }, { status: 400 })
    }

    const entry = await prisma.studyTimeEntry.update({ where: { id: params.id }, data })
    return NextResponse.json({ ok: true, entry })
  } catch (err: any) {
    return apiError(err, 'Erro ao editar registro', 'time-patch')
  }
}

/** DELETE — apaga o próprio registro */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await ownEntry(req, params.id)
  if ('error' in r) return r.error
  try {
    await prisma.studyTimeEntry.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return apiError(err, 'Erro ao excluir registro', 'time-delete')
  }
}
