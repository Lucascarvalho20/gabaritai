import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Autenticação dos endpoints de /api/cron/*.
 *
 * Mesmo defeito que o ensure-admin tinha: quatro rotas faziam
 *
 *     const expected = process.env.CRON_TOKEN ?? 'gabaritai-dev-cron-token'
 *
 * Com o repositório público, esse literal É o token. Se a variável não
 * estivesse configurada na Vercel, qualquer pessoa que lesse o código
 * conseguia disparar geração de simulados com IA (gastando a cota que os
 * alunos usam), notificações no Telegram do admin e sincronizações de até
 * 5 minutos. Agora, sem token configurado, cron não roda — falha fechada.
 *
 * Aceita os dois nomes: CRON_TOKEN (o histórico do projeto) e CRON_SECRET (o
 * que a Vercel usa: quando CRON_SECRET existe, ela envia automaticamente
 * `Authorization: Bearer <CRON_SECRET>` em cada execução agendada). E aceita o
 * token nos dois lugares, porque as rotas antigas divergiam — uma lia só
 * `x-cron-token` e por isso nunca recebia o header que a própria Vercel manda.
 *
 * Devolve `null` quando autorizado, ou a resposta de erro pronta.
 */
export function exigirTokenCron(req: NextRequest): NextResponse | null {
  const esperado = process.env.CRON_TOKEN || process.env.CRON_SECRET
  if (!esperado) {
    return NextResponse.json(
      { message: 'Cron desativado: configure CRON_SECRET na Vercel.' },
      { status: 503 },
    )
  }

  const recebido =
    req.headers.get('x-cron-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''

  // SHA-256 iguala o tamanho dos buffers (exigência do timingSafeEqual) sem
  // vazar o comprimento do segredo; a comparação em tempo constante impede
  // descobrir o token medindo o tempo de resposta.
  const a = createHash('sha256').update(recebido).digest()
  const b = createHash('sha256').update(esperado).digest()
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }
  return null
}
