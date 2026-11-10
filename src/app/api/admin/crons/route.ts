import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { situacaoDasTarefas, vigiaNaoInstalado } from '@/lib/vigia'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/crons — estado de cada tarefa agendada, calculado na hora a
 * partir do histórico do vigia (src/lib/vigia.ts). É o painel que mostra o
 * sumiço mesmo no único caso em que nenhum aviso chega: todos os crons parados.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  try {
    return NextResponse.json({ instalado: true, tarefas: await situacaoDasTarefas() })
  } catch (err) {
    if (vigiaNaoInstalado(err)) return NextResponse.json({ instalado: false, tarefas: [] })
    console.error('[admin-crons]', err)
    return NextResponse.json({ message: 'Não foi possível ler o vigia.' }, { status: 500 })
  }
}
