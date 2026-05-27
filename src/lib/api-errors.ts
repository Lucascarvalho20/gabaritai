/**
 * Tratamento padronizado de erros em endpoints da API.
 *
 * Por que existe: vários endpoints retornavam `err.message` cru pro cliente,
 * o que pode vazar nome de tabela, query SQL ou caminho interno (ex: erros
 * do Prisma do tipo "Foreign key constraint failed on `user.id`").
 *
 * USO:
 *   try { ... }
 *   catch (err) {
 *     return apiError(err, 'Falha ao salvar cupom', 'admin-coupons')
 *   }
 *
 * - Loga o erro COMPLETO no servidor (com tag pra grep nos logs do Vercel)
 * - Devolve apenas a mensagem genérica que VOCÊ controla pro cliente
 */

import { NextResponse } from 'next/server'

export function apiError(
  err: unknown,
  clientMessage: string,
  tag: string,
  status: number = 500,
): NextResponse {
  // Loga completo no servidor (admin vê em Vercel Logs)
  console.error(`[${tag}]`, err)

  // Em desenvolvimento, retorna o erro pra facilitar debug.
  // Em produção, só a mensagem genérica.
  if (process.env.NODE_ENV === 'development') {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ message: clientMessage, detail }, { status })
  }

  return NextResponse.json({ message: clientMessage }, { status })
}
