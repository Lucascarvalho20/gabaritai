import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { isContentLockedForUser } from '@/lib/trial-content'
import { rateLimit } from '@/lib/rate-limit'
import { rodarAgente } from '@/lib/agente/loop'
import { criarLLM } from '@/lib/agente/llm'
import { carregarContextoAluno, ferramentasDiagnostico, SISTEMA_DIAGNOSTICO } from '@/lib/agente/ferramentas-diagnostico'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/agente/diagnostico
 *
 * Roda o agente de diagnóstico para o aluno logado e devolve um plano de
 * ataque, com o rastro do que o agente consultou.
 *
 * Limite de 5 por hora por aluno: cada diagnóstico faz várias chamadas de IA
 * (uma por passo), e é a mesma cota gratuita que atende o mentor. O limite é
 * em memória — por instância, não global (ver rate-limit.ts) —, suficiente
 * contra clique repetido, não contra abuso distribuído.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  if (await isContentLockedForUser(user.id)) {
    return NextResponse.json({ message: 'O diagnóstico com IA faz parte dos planos pagos.', locked: true }, { status: 403 })
  }

  const rl = rateLimit({ key: `agente-diagnostico:${user.id}`, windowMs: 60 * 60_000, max: 5 })
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Você já pediu 5 diagnósticos nesta hora. Tente de novo mais tarde.' }, { status: 429 })
  }

  const ctx = await carregarContextoAluno(user.id)
  if (!ctx) {
    return NextResponse.json({ message: 'Matricule-se em um curso para receber o diagnóstico.' }, { status: 400 })
  }

  const { llm, provedorUsado } = criarLLM()
  const inicio = Date.now()

  try {
    const r = await rodarAgente({
      sistema: SISTEMA_DIAGNOSTICO,
      pedido: `Aluno do curso "${ctx.curso}". Faça o diagnóstico e entregue o plano.`,
      ferramentas: ferramentasDiagnostico(user.id, ctx),
      ferramentaFinal: 'entregar_plano',
      llm,
      maxPassos: 8,
    })

    // O rastro vai para a tela sem os argumentos: o aluno vê O QUE o agente
    // consultou, sem expor detalhe interno.
    const passos = r.passos.map((p) => ({ ferramenta: p.ferramenta, ok: p.ok }))

    if (!r.ok) {
      console.error('[agente-diagnostico] não concluiu', { userId: user.id, erro: r.erro, passos: r.passos })
      return NextResponse.json({ message: 'O diagnóstico não concluiu. Tente de novo.', passos }, { status: 502 })
    }
    return NextResponse.json({ plano: r.resultado, passos, provedor: provedorUsado(), duracaoMs: Date.now() - inicio })
  } catch (err: any) {
    console.error('[agente-diagnostico] falhou', err)
    return NextResponse.json({ message: 'A IA está indisponível agora. Tente em alguns minutos.' }, { status: 503 })
  }
}
