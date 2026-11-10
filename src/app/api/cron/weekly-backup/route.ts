import { NextRequest, NextResponse } from 'next/server'
import { runBackupAndEmail } from '@/lib/backup-export'
import { exigirTokenCron } from '@/lib/cron-auth'
import { monitorarCron } from '@/lib/vigia'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Backup automático — dispara o gerador de backup e envia pro ADMIN_EMAIL.
 *
 * Proteção: header `x-cron-token` deve bater com CRON_TOKEN.
 * No plano Hobby do Vercel, cron roda 1x/dia automático.
 */
async function executar(req: NextRequest) {
  const negado = exigirTokenCron(req)
  if (negado) return negado

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ message: 'ADMIN_EMAIL não configurado' }, { status: 500 })
  }

  try {
    const result = await runBackupAndEmail({ to: adminEmail, trigger: 'cron' })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron-backup]', err)
    return NextResponse.json({ message: 'Backup falhou — confira logs' }, { status: 500 })
  }
}

export const GET = monitorarCron('weekly-backup', executar)
