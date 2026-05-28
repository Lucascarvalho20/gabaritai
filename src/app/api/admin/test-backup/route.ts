import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { runBackupAndEmail } from '@/lib/backup-export'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/test-backup
 *
 * Dispara o backup imediato pra validar que o pipeline funciona.
 * Envia pro ADMIN_EMAIL (mesmo destino do cron semanal).
 *
 * Protegido por requireAdmin — só admins podem disparar pra evitar
 * abuso do envio de email/uso de banda.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({
      message: 'ADMIN_EMAIL não configurado no Vercel. Configura e tenta de novo.',
    }, { status: 500 })
  }

  try {
    const result = await runBackupAndEmail({ to: adminEmail, trigger: 'manual' })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[admin-test-backup]', err)
    // Admin-only: pode expor o erro real pra debug
    return NextResponse.json({
      message: 'Backup falhou.',
      detail: String(err?.message ?? err),
      stack: err?.stack?.split('\n').slice(0, 6).join('\n') ?? null,
    }, { status: 500 })
  }
}
