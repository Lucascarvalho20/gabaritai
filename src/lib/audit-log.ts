import { prisma } from './prisma'
import { AuditAction, Prisma } from '@prisma/client'

export type AuditInput = {
  actorId?: string | null
  targetId?: string | null
  action: AuditAction
  metadata?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}

/**
 * Registra um evento crítico no audit log.
 * Falhas silenciosas (apenas console.error) pra não derrubar o fluxo principal.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        targetId: input.targetId ?? null,
        action: input.action,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  } catch (err) {
    console.error('[audit] falha ao gravar:', err)
  }
}

/**
 * Grava tentativa de login (sucesso ou falha).
 */
export async function recordLoginAttempt(input: {
  userId?: string | null
  identifier: string
  ip: string
  userAgent?: string | null
  success: boolean
  reason?: string
}) {
  try {
    await prisma.loginAttempt.create({
      data: {
        userId: input.userId ?? null,
        identifier: input.identifier,
        ip: input.ip,
        userAgent: input.userAgent ?? null,
        success: input.success,
        reason: input.reason ?? null,
      },
    })
  } catch (err) {
    console.error('[loginAttempt] falha ao gravar:', err)
  }
}
