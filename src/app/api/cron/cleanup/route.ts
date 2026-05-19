import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 300

// Cleanup mensal de dados pesados que não precisam mais ficar quentes.
// Roda no dia 1 do mês às 04h UTC (vercel.json).
//
// O que faz:
//  1. MockExamResult.answers (JSON gigante) > 90 dias → vira null
//     (mantém score/acertos/erros/brancos pra histórico do aluno)
//  2. LoginAttempt > 60 dias → deleta (não precisa de auditoria tão antiga)
//  3. AiMessage (conversa com mentor) em conversas inativas > 90 dias → deleta
//  4. AuditLog > 365 dias → deleta (legal: 1 ano basta pra LGPD/civil)
async function handler(req: NextRequest) {
  const token = req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_TOKEN ?? 'gabaritai-dev-cron-token'
  if (token !== expected) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dryRun') === 'true'

  const now = Date.now()
  const d90 = new Date(now - 90 * 24 * 3600 * 1000)
  const d60 = new Date(now - 60 * 24 * 3600 * 1000)
  const d365 = new Date(now - 365 * 24 * 3600 * 1000)

  // 1. Comprimir results antigos
  const oldResults = await prisma.mockExamResult.findMany({
    where: {
      createdAt: { lt: d90 },
      // só comprime os que ainda têm answers populado
      NOT: { answers: { equals: [] as any } },
    },
    select: { id: true },
  })

  let compressed = 0
  if (!dryRun && oldResults.length > 0) {
    const result = await prisma.mockExamResult.updateMany({
      where: { id: { in: oldResults.map((r) => r.id) } },
      data: { answers: [] as any },
    })
    compressed = result.count
  }

  // 2. LoginAttempt antigo
  let loginAttemptsDeleted = 0
  if (!dryRun) {
    const r = await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: d60 } } })
    loginAttemptsDeleted = r.count
  } else {
    loginAttemptsDeleted = await prisma.loginAttempt.count({ where: { createdAt: { lt: d60 } } })
  }

  // 3. AiMessage em conversas antigas
  let aiMessagesDeleted = 0
  const oldConvos = await prisma.aiConversation.findMany({
    where: { updatedAt: { lt: d90 } },
    select: { id: true },
  })
  if (!dryRun && oldConvos.length > 0) {
    const r = await prisma.aiMessage.deleteMany({
      where: { conversationId: { in: oldConvos.map((c) => c.id) } },
    })
    aiMessagesDeleted = r.count
    await prisma.aiConversation.deleteMany({ where: { id: { in: oldConvos.map((c) => c.id) } } })
  }

  // 4. AuditLog antigo
  let auditLogsDeleted = 0
  if (!dryRun) {
    const r = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: d365 } } })
    auditLogsDeleted = r.count
  } else {
    auditLogsDeleted = await prisma.auditLog.count({ where: { createdAt: { lt: d365 } } })
  }

  // 5. Soft-archive: users com último pagamento expirado há >30 dias + sem login há >60d
  const d30 = new Date(now - 30 * 24 * 3600 * 1000)
  const inactiveUsers = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      archivedAt: null,
      hasFullAccess: false,
      OR: [
        { lastLoginAt: { lt: d60 } },
        { lastLoginAt: null, createdAt: { lt: d60 } },
      ],
      payments: {
        none: { status: 'APPROVED', expiresAt: { gt: d30 } },
      },
    },
    select: { id: true },
  })
  let archived = 0
  if (!dryRun && inactiveUsers.length > 0) {
    const r = await prisma.user.updateMany({
      where: { id: { in: inactiveUsers.map((u) => u.id) } },
      data: { archivedAt: new Date(), archivedReason: 'inactive_no_active_subscription_60d' },
    })
    archived = r.count
  }

  return NextResponse.json({
    dryRun,
    compressed_mock_exam_results: dryRun ? oldResults.length : compressed,
    deleted_login_attempts: loginAttemptsDeleted,
    deleted_ai_messages: aiMessagesDeleted,
    deleted_ai_conversations: dryRun ? 0 : oldConvos.length,
    deleted_audit_logs: auditLogsDeleted,
    archived_users: dryRun ? inactiveUsers.length : archived,
    timestamp: new Date().toISOString(),
  })
}

export const GET = handler
export const POST = handler
