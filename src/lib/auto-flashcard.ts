import { prisma } from './prisma'
import { callAI, parseAIJson } from './ai-client'
import crypto from 'crypto'

/**
 * Auto-criação de flashcard quando aluno erra uma questão.
 *
 * Regra (decisão 2026-05-30 do João): erro = flashcard automático, sem
 * perguntar nada ao aluno. IA pega a questão + explicação e gera 1 par
 * pergunta/resposta focado no conceito-chave. Entra na fila SM-2.
 *
 * Otimizações:
 *  - Dedupe via cacheKey: hash(questionId) — se já existe flashcard pra
 *    essa questão (qualquer aluno errou antes), reusa. Aluno só vê uma vez.
 *  - Fail-safe: se IA falha, NÃO bloqueia o fluxo do aluno — só loga.
 *  - Caso óbvio (Certo/Errado curto), gera flashcard simples sem IA.
 */

export type AutoFlashcardResult =
  | { ok: true; flashcardId: string; created: boolean; reused: boolean }
  | { ok: false; reason: string }

export async function autoCreateFlashcardFromWrongAnswer(opts: {
  userId: string
  questionId: string
}): Promise<AutoFlashcardResult> {
  const question = await prisma.question.findUnique({
    where: { id: opts.questionId },
    select: {
      id: true,
      enunciado: true,
      alternativas: true,
      gabarito: true,
      explicacao: true,
      subjectId: true,
      topicId: true,
      bancaSlug: true,
    },
  })
  if (!question) return { ok: false, reason: 'questão não encontrada' }
  if (!question.subjectId) return { ok: false, reason: 'questão sem matéria' }

  // CacheKey: dedupe por questão
  const cacheKey = `auto-fc:${question.id}`

  // Verifica se já existe flashcard compartilhado pra essa questão
  const existing = await prisma.flashcard.findUnique({ where: { cacheKey } })
  if (existing) {
    // Vincula o usuário (cria FlashcardReview com nextReview=hoje)
    const review = await ensureUserReview(opts.userId, existing.id)
    return { ok: true, flashcardId: existing.id, created: false, reused: true }
  }

  // Gera flashcard via IA
  let frente: string
  let verso: string
  try {
    const generated = await generateCardFromQuestion({
      enunciado: question.enunciado,
      alternativas: question.alternativas as any,
      gabarito: question.gabarito,
      explicacao: question.explicacao ?? '',
    })
    frente = generated.frente
    verso = generated.verso
  } catch (err) {
    // Fallback simples: usa gabarito + explicação direto
    console.warn('[auto-flashcard] IA falhou, usando fallback:', err)
    frente = `Qual a resposta correta?\n\n${question.enunciado.slice(0, 400)}`
    verso = `Gabarito: ${question.gabarito}\n\n${question.explicacao ?? ''}`.slice(0, 1500)
  }

  if (frente.length < 10 || verso.length < 10) {
    return { ok: false, reason: 'conteúdo insuficiente pra criar card' }
  }

  const card = await prisma.flashcard.create({
    data: {
      subjectId: question.subjectId,
      topicId: question.topicId,
      cacheKey,
      frente,
      verso,
      isAI: true,
      isShared: true,
      active: true,
    },
    select: { id: true },
  })

  await ensureUserReview(opts.userId, card.id)

  return { ok: true, flashcardId: card.id, created: true, reused: false }
}

async function ensureUserReview(userId: string, flashcardId: string) {
  // Hoje = primeira revisão. SM-2 vai recalcular intervals quando aluno responder.
  const today = new Date()
  return prisma.flashcardReview.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    create: {
      userId,
      flashcardId,
      quality: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReview: today,
    },
    update: {}, // se já existe, mantém o intervalo
  })
}

/**
 * IA pega questão + gabarito + explicação e devolve um par pergunta/resposta
 * focado no conceito-chave (não na questão literal).
 */
async function generateCardFromQuestion(input: {
  enunciado: string
  alternativas: any
  gabarito: string
  explicacao: string
}): Promise<{ frente: string; verso: string }> {
  const altText = Array.isArray(input.alternativas)
    ? input.alternativas.map((a: any) => `${a.letra}) ${a.texto}`).join('\n')
    : ''

  const prompt = `Você é um professor preparador de concursos. Recebe uma questão que o aluno errou e cria UM flashcard focado no CONCEITO-CHAVE (não na questão literal).

Questão:
${input.enunciado}

${altText}

Gabarito correto: ${input.gabarito}
Explicação: ${input.explicacao || '(sem explicação)'}

Crie um flashcard que ajude o aluno a FIXAR o conceito que ele errou. NÃO copie a questão. Foque no princípio, lei, definição ou regra que faltou no aluno.

FORMATO — JSON puro (sem markdown):

{
  "frente": "Pergunta curta e direta sobre o conceito-chave (máx 200 chars)",
  "verso": "Resposta clara com fundamento legal/doutrinário (máx 600 chars)"
}`

  const raw = await callAI(prompt, { maxTokens: 800, temperature: 0.3 })
  const parsed = parseAIJson<{ frente: string; verso: string }>(raw)
  if (!parsed?.frente || !parsed?.verso) throw new Error('IA não retornou frente/verso')
  return {
    frente: String(parsed.frente).trim().slice(0, 200),
    verso: String(parsed.verso).trim().slice(0, 600),
  }
}
