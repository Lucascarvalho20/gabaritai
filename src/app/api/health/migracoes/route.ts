import { NextResponse } from 'next/server'
import { migracoesAplicadas } from '@/lib/migracoes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/migracoes — público, como o /api/health.
 *
 * Diz quais migrações de banco a produção já recebeu; é o que o pipeline
 * consulta antes de promover uma versão que depende de coluna nova. Os nomes
 * não são segredo (os arquivos estão no repositório público). Guardado por
 * 60 s para nenhuma insistência virar carga no banco.
 */
const VALIDADE_MS = 60_000
let memoria: { em: number; dados: Awaited<ReturnType<typeof migracoesAplicadas>> } | null = null

export async function GET() {
  try {
    if (!memoria || Date.now() - memoria.em > VALIDADE_MS) {
      memoria = { em: Date.now(), dados: await migracoesAplicadas() }
    }
    return NextResponse.json({ ...memoria.dados, consultadoEm: new Date(memoria.em).toISOString() })
  } catch (err) {
    console.error('[health/migracoes]', err)
    return NextResponse.json({ message: 'Não foi possível consultar o banco.' }, { status: 503 })
  }
}
