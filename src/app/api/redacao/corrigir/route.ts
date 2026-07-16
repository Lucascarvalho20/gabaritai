import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'
import { isContentLockedForUser } from '@/lib/trial-content'

export const maxDuration = 60

type RedacaoFeedback = {
  scoreGlobal: number
  estrutura: { nota: number; comentario: string }
  coesao: { nota: number; comentario: string }
  gramatica: { nota: number; comentario: string }
  argumentacao: { nota: number; comentario: string }
  pontosFortes: string[]
  pontosMelhorar: string[]
  sugestaoReescrita?: string
}

/**
 * Corrige uma redação via IA seguindo critérios da banca.
 * Salva o resultado no MockExamResult se resultId for passado.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  if (await isContentLockedForUser(user.id)) {
    return NextResponse.json({ message: 'A correção de redação faz parte dos planos pagos.', locked: true }, { status: 403 })
  }

  try {
    const { text, banca, tema, resultId } = await req.json()
    if (!text || String(text).trim().length < 50) {
      return NextResponse.json({ message: 'Redação muito curta (mínimo 50 caracteres)' }, { status: 400 })
    }

    const bancaInfo = (banca ?? '').toLowerCase().includes('cebraspe')
      ? 'CEBRASPE: avalia em 0-10. Critérios: domínio da modalidade escrita (gramática), compreensão do tema, organização e coerência. Pena 0 se fugir do tema.'
      : 'Banca genérica de concurso: critérios estrutura (intro/desenvolvimento/conclusão), coesão, gramática, argumentação.'

    const prompt = `Você é avaliador oficial de redações de concurso público.

${bancaInfo}

${tema ? `TEMA: ${tema}` : 'TEMA: livre (avalie segundo critérios formais).'}

REDAÇÃO DO CANDIDATO:
"""
${String(text).trim()}
"""

Avalie criticamente e retorne JSON estrito no formato (apenas o JSON, nada antes ou depois):
{
  "scoreGlobal": <0-10>,
  "estrutura": { "nota": <0-10>, "comentario": "..." },
  "coesao": { "nota": <0-10>, "comentario": "..." },
  "gramatica": { "nota": <0-10>, "comentario": "..." },
  "argumentacao": { "nota": <0-10>, "comentario": "..." },
  "pontosFortes": ["...", "..."],
  "pontosMelhorar": ["...", "...", "..."],
  "sugestaoReescrita": "1-2 frases iniciais reescritas (opcional, só se a intro for fraca)"
}

Seja rigoroso mas justo. Aponte erros gramaticais específicos. Comentários em PT-BR.`

    const raw = await callAI(prompt, { temperature: 0.4, maxTokens: 2000 })
    const feedback = parseAIJson<RedacaoFeedback>(raw)

    // Persiste no MockExamResult se passado
    if (resultId) {
      await prisma.mockExamResult.updateMany({
        where: { id: resultId, userId: user.id },
        data: { redacaoScore: feedback.scoreGlobal, redacaoFeedback: feedback as any },
      })
    }

    return NextResponse.json({ feedback })
  } catch (err: any) {
    return apiError(err, 'Erro ao corrigir redação', 'redacao-corrigir')
  }
}
