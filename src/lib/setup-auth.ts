import { createHash, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

/**
 * Autenticação dos endpoints de /api/setup/*.
 *
 * Esses endpoints são destrutivos — o ensure-admin cria ou REDEFINE a conta de
 * administrador. Então a regra aqui é falhar fechado.
 *
 * Duas coisas que a versão anterior fazia e foram removidas de propósito:
 *
 * 1. Valor padrão em código (`process.env.ADMIN_PASSWORD ?? '<senha literal no código>'`).
 *    Com o repositório público, esse literal é a senha. Se a env var não
 *    estivesse configurada no ambiente, qualquer pessoa que lesse o código
 *    conseguiria redefinir o admin. Agora, sem SETUP_SECRET, o endpoint
 *    simplesmente não funciona.
 *
 * 2. Aceitar a ADMIN_PASSWORD como token (`bearer === adminPassword`).
 *    Isso fazia a senha de login do admin virar também chave de API: um
 *    vazamento da senha deixava de ser "entraram na conta" e passava a ser
 *    "podem redefinir a conta". São credenciais com finalidades diferentes e
 *    agora estão separadas.
 *
 * A comparação usa timingSafeEqual sobre o SHA-256 dos dois valores. O hash
 * serve para igualar o tamanho dos buffers (timingSafeEqual exige isso) sem
 * vazar o comprimento do segredo; o timingSafeEqual evita que o atacante
 * descubra o token caractere a caractere medindo o tempo de resposta.
 */

const MIN_SECRET_LENGTH = 24

export type SetupAuthResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function checkSetupAuth(req: NextRequest): SetupAuthResult {
  const secret = process.env.SETUP_SECRET

  if (!secret) {
    return {
      ok: false,
      status: 503,
      message: 'SETUP_SECRET não configurado. Endpoints de setup estão desativados.',
    }
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    return {
      ok: false,
      status: 503,
      message: `SETUP_SECRET curto demais (mínimo ${MIN_SECRET_LENGTH} caracteres).`,
    }
  }

  const header = req.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!bearer || !constantTimeEquals(bearer, secret)) {
    return { ok: false, status: 401, message: 'Não autorizado.' }
  }

  return { ok: true }
}
