import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { syncConcursosFromApi, PRIORITY_UFS, ALL_UFS } from '@/lib/concursos-api'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const scope: 'priority' | 'all' | 'custom' = body.scope ?? 'priority'
  const customUfs: string[] = Array.isArray(body.ufs) ? body.ufs : []

  const ufs = scope === 'all' ? ALL_UFS : scope === 'custom' ? customUfs : PRIORITY_UFS

  if (ufs.length === 0) {
    return NextResponse.json({ message: 'Nenhuma UF informada' }, { status: 400 })
  }

  const result = await syncConcursosFromApi(ufs)
  return NextResponse.json({ ok: true, ufs, ...result })
}
