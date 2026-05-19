import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { detectAndPersistChanges } from '@/lib/edital-diff'

/**
 * Roda diff do edital contra o anterior do mesmo curso e persiste mudanças no EditalChangeLog.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  try {
    const result = await detectAndPersistChanges(params.id)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ message: e.message ?? 'Erro' }, { status: 400 })
  }
}
