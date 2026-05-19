import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 60

// POST /api/flashcards/from-question
// Body: { questionId, useAI?: boolean }
// Cria flashcard a partir de uma questão. Por padrão usa IA pra reformular como flashcard limpo.
// Se useAI=false, usa enunciado direto como frente e explicação como verso.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { questionId, useAI = true } = await req.json()
  if (!questionId) return NextResponse.json({ message: 'questionId obrigatório' }, { status: 400 })

  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: { subject: { select: { id: true, name: true } } },
  })
  if (!q) return NextResponse.json({ message: 'Questão não encontrada' }, { status: 404 })

  let frente: string
  let verso: string

  if (useAI && q.explicacao) {
    const prompt = `Você é um especialista em criar FLASHCARDS de estudo a partir de questões de concurso.

A partir da questão abaixo, gere UM flashcard objetivo no formato pergunta/resposta.

REGRAS:
- Frente: pergunta direta sobre o conceito principal (máximo 200 caracteres)
- Verso: resposta concisa e tecnicamente correta (máximo 400 caracteres)
- Cite artigo/lei se relevante
- NÃO copie o enunciado da questão — extraia o CONCEITO
- Não inclua alternativas A/B/C/D — vire conhecimento abstrato

QUESTÃO (gabarito: ${q.gabarito}):
"""
${q.enunciado}
"""

EXPLICAÇÃO oficial:
"""
${q.explicacao}
"""

Retorne JSON apenas:
{"frente": "...", "verso": "..."}`

    try {
      const raw = await callAI(prompt, { maxTokens: 600, temperature: 0.3 })
      const parsed = parseAIJson<{ frente: string; verso: string }>(raw)
      frente = parsed.frente
      verso = parsed.verso
    } catch {
      // Fallback se IA falhar
      frente = q.enunciado.slice(0, 200)
      verso = q.explicacao || `Gabarito: ${q.gabarito}`
    }
  } else {
    frente = q.enunciado.slice(0, 200)
    verso = q.explicacao || `Gabarito: ${q.gabarito}`
  }

  // Cria flashcard + review inicial pendente
  const flashcard = await prisma.flashcard.create({
    data: {
      subjectId: q.subjectId,
      userId: user.id,
      frente,
      verso,
      isAI: useAI,
      active: true,
    },
  })

  await prisma.flashcardReview.create({
    data: {
      userId: user.id,
      flashcardId: flashcard.id,
      quality: 0, // ainda não revisou
      interval: 1,
      easeFactor: 2.5,
      nextReview: new Date(),
    },
  })

  return NextResponse.json({ id: flashcard.id, frente, verso })
}
