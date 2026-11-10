import type { NextRequest } from 'next/server'
import { estimativasDosConcursos } from '@/lib/tempo-estudo-dados'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tempo/concursos — público, sem login.
 *
 * Cada concurso com edital cadastrado e quanto tempo leva para percorrer o
 * conteúdo dele (tempo-estudo.ts). A pergunta "cabe até a prova?" é respondida
 * no navegador, com as horas do aluno: o servidor não precisa saber delas.
 *
 * O resultado muda devagar (conteúdo novo, tentativas novas), então a CDN
 * guarda por 1 hora: o banco faz as consultas no máximo uma vez por hora por
 * região, não uma vez por visitante da home. A janela de "servir vencido
 * enquanto atualiza" é curta (5 min) porque o NAVEGADOR também a respeita:
 * com 1 dia, um visitante podia ver por 24 h uma lista sem o concurso novo.
 *
 * A CDN usa a URL inteira como chave: `?x=qualquer-coisa` pula o cache dela.
 * Por isso a função também guarda o resultado por 10 min — quem tenta furar o
 * cache recebe a mesma resposta, sem o banco calcular de novo.
 */
const MEMORIA_MS = 10 * 60_000
let memoria: { em: number; dados: Awaited<ReturnType<typeof estimativasDosConcursos>> } | null = null

export async function GET(req: NextRequest) {
  const rl = rateLimit({ key: `tempo:${getClientIp(req)}`, windowMs: 60_000, max: 30 })
  if (!rl.allowed) return Response.json({ message: 'Muitas consultas — tente de novo em um minuto.' }, { status: 429 })

  try {
    if (!memoria || Date.now() - memoria.em > MEMORIA_MS) memoria = { em: Date.now(), dados: await estimativasDosConcursos() }
    return Response.json(
      { concursos: memoria.dados, geradoEm: new Date(memoria.em).toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } },
    )
  } catch (err) {
    console.error('[tempo-concursos]', err)
    return Response.json({ message: 'Não foi possível calcular agora.' }, { status: 500 })
  }
}
