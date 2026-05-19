import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import { Difficulty, QuestionSource } from '@prisma/client'

export const maxDuration = 300 // extração de PDF pode demorar

/**
 * Importa questões a partir de TEXTO COLADO de uma prova oficial.
 * (PDF parsing requer pdfjs-dist no servidor — pra MVP, admin cola o texto manualmente
 *  ou usa OCR externo + cola aqui.)
 *
 * Body: { text: string, banca?: string, ano?: number, orgao?: string, subjectId?: string, dryRun?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  try {
    const { text, banca, ano, orgao, subjectId, dryRun } = await req.json()
    if (!text || String(text).length < 200) {
      return NextResponse.json({ message: 'Cole o texto completo da prova (mínimo 200 caracteres)' }, { status: 400 })
    }

    const truncated = String(text).slice(0, 30000) // limite de tokens
    const bancaInfo = banca ?? 'banca desconhecida'

    const prompt = `Você é um extrator de questões de provas de concurso público.
A seguir, o texto bruto de uma prova ${bancaInfo}${ano ? ` de ${ano}` : ''}${orgao ? ` (${orgao})` : ''}.

Extraia TODAS as questões e o gabarito (se presente). Retorne JSON array no formato:
[
  {
    "numero": 1,
    "enunciado": "texto completo da questão",
    "alternativas": [{"letra":"A","texto":"..."}, ...] OU [] se for CERTO/ERRADO (Cebraspe),
    "gabarito": "A" | "B" | "C" | "D" | "E" | "C" (certo) | "E" (errado)",
    "materia": "nome inferido da matéria (ex: Direito Constitucional)"
  }
]

Se o gabarito não estiver no texto, deixe gabarito vazio "" pra revisão manual depois.
Ignore textos auxiliares (cabeçalho, instruções, propaganda).

TEXTO DA PROVA:
"""
${truncated}
"""

Retorne APENAS o JSON, sem markdown.`

    const raw = await callAI(prompt, { temperature: 0.2, maxTokens: 8000 })
    const extracted = parseAIJson<Array<{
      numero?: number
      enunciado: string
      alternativas?: Array<{ letra: string; texto: string }>
      gabarito: string
      materia?: string
    }>>(raw)

    if (dryRun) {
      // Não salva, só retorna pra preview
      return NextResponse.json({ extractedCount: extracted.length, sample: extracted.slice(0, 3), questions: extracted })
    }

    // Persiste
    const created = await prisma.$transaction(
      extracted.map((q) =>
        prisma.question.create({
          data: {
            subjectId: subjectId ?? null,
            bancaSlug: banca ?? null,
            orgao: orgao ?? null,
            ano: ano ?? null,
            numeroQuestao: q.numero ?? null,
            source: QuestionSource.OFFICIAL,
            difficulty: Difficulty.MEDIUM,
            enunciado: q.enunciado,
            alternativas: (q.alternativas ?? []) as any,
            gabarito: q.gabarito,
            explicacao: '',
            tags: ['import-pdf', ...(banca ? [`banca:${banca}`] : []), ...(ano ? [`ano:${ano}`] : [])],
          },
        }),
      ),
    )

    return NextResponse.json({ ok: true, count: created.length })
  } catch (err: any) {
    console.error('[import-pdf] error', err)
    return NextResponse.json({ message: err.message ?? 'Erro' }, { status: 500 })
  }
}
