import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { generateOrFetchCached } from '@/lib/ai-cache'
import { consumeQuota, trackFeatureUsage } from '@/lib/ai-quota'
import { parseAIJson } from '@/lib/ai-client'

export const maxDuration = 60

// GET /api/sessao/[id]
// Retorna a sessão completa do cronograma com:
//  - dados básicos (matéria, tópico, tempo)
//  - resumo (cached — gera se não existe)
//  - questões oficiais filtradas
//  - questões IA reutilizadas (cached pool)
//  - flashcards relacionados
//  - checklist atual
//  - estatísticas pessoais do user no tópico
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const session = await prisma.studyPlanSession.findUnique({
    where: { id: params.id },
    include: {
      studyPlan: { include: { course: true, edital: { include: { banca: true } } } },
      topic: { include: { subject: true, parent: true } },
    },
  })
  if (!session || session.studyPlan.userId !== user.id) {
    return NextResponse.json({ message: 'Sessão não encontrada' }, { status: 404 })
  }

  const subjectId = session.subjectId
  const topicId = session.topicId
  const bancaSlug = session.studyPlan.edital?.banca?.slug ?? null

  // Materia (caso topic não esteja setado)
  let subject = session.topic?.subject ?? null
  if (!subject && subjectId) {
    subject = await prisma.subject.findUnique({ where: { id: subjectId } })
  }

  // Questões OFICIAIS desse subject/topic
  const officialQuestions = await prisma.question.findMany({
    where: {
      active: true,
      anulada: false,
      source: 'OFFICIAL',
      ...(topicId ? { topicId } : { subjectId: subjectId ?? undefined }),
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, enunciado: true, alternativas: true, gabarito: true, explicacao: true,
      bancaSlug: true, ano: true, difficulty: true,
    },
  })

  // Questões IA já geradas pra esse tópico (compartilhadas entre alunos)
  const aiQuestions = await prisma.question.findMany({
    where: {
      active: true,
      anulada: false,
      source: 'AI_GENERATED',
      ...(topicId ? { topicId } : { subjectId: subjectId ?? undefined }),
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, enunciado: true, alternativas: true, gabarito: true, explicacao: true,
      difficulty: true,
    },
  })

  // Flashcards compartilhados desse tópico
  const flashcards = await prisma.flashcard.findMany({
    where: {
      active: true,
      isShared: true,
      ...(topicId ? { topicId } : { subjectId: subjectId ?? undefined }),
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { id: true, frente: true, verso: true },
  })

  // Resumo via cache (gera se não existe)
  let resumo: string | null = null
  let resumoCached = false
  try {
    const topicName = session.topic?.name ?? subject?.name ?? 'Conteúdo geral'
    const subjectName = subject?.name ?? '—'

    const prompt = `Você é um professor preparador de concursos brasileiros.

Faça um RESUMO INTELIGENTE pra estudo sobre:
- Matéria: ${subjectName}
- Tópico: ${topicName}
${bancaSlug ? `- Banca alvo: ${bancaSlug}` : ''}

Estrutura do resumo (markdown):
1. **Introdução** (2-3 linhas — contextualizando)
2. **Pontos-chave** (5-8 bullets com os conceitos mais cobrados em provas)
3. **Base legal/normativa** (artigos, leis quando relevantes)
4. **Pegadinhas comuns** (3-5 armadilhas que bancas usam)
5. **Dica de memorização** (1 mnemônico ou analogia)

Máximo 800 palavras. Use negritos pra termos técnicos.`

    const { content, cached } = await generateOrFetchCached({
      kind: 'resumo',
      subjectId,
      topicId,
      bancaSlug,
      prompt,
      aiTask: 'quality',
      maxTokens: 1500,
      temperature: 0.4,
    })
    resumo = typeof content === 'string' ? content : JSON.stringify(content)
    resumoCached = cached
  } catch (err: any) {
    console.warn('[sessao] resumo gen failed:', err.message)
  }

  // Estatísticas pessoais
  let myTopicStats: any = null
  if (topicId) {
    const t = await prisma.topicAttempt.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
    })
    if (t) myTopicStats = { total: t.totalAttempts, corretos: t.correctAttempts, mastery: t.masteryScore }
  }

  trackFeatureUsage({ userId: user.id, feature: 'sessao' })

  return NextResponse.json({
    session: {
      id: session.id,
      type: session.type,
      status: session.status,
      durationMin: session.durationMin,
      date: session.date,
      checklist: session.checklist ?? { resumoLido: false, questoesFeitas: 0, flashcardsRevisados: 0 },
      notes: session.notes,
    },
    course: {
      slug: session.studyPlan.course.slug,
      name: session.studyPlan.course.name,
      cargo: session.studyPlan.course.cargo,
    },
    subject: subject ? { id: subject.id, name: subject.name, slug: subject.slug } : null,
    topic: session.topic ? {
      id: session.topic.id,
      name: session.topic.name,
      description: session.topic.description,
      parentName: session.topic.parent?.name ?? null,
    } : null,
    bancaSlug,
    resumo,
    resumoCached,
    officialQuestions,
    aiQuestions,
    flashcards,
    myTopicStats,
  })
}

// PATCH /api/sessao/[id]
// Atualiza checklist + notes da sessão
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const session = await prisma.studyPlanSession.findUnique({
    where: { id: params.id },
    include: { studyPlan: true },
  })
  if (!session || session.studyPlan.userId !== user.id) {
    return NextResponse.json({ message: 'Sessão não encontrada' }, { status: 404 })
  }

  const updated = await prisma.studyPlanSession.update({
    where: { id: params.id },
    data: {
      checklist: body.checklist ?? session.checklist ?? undefined,
      notes: body.notes ?? session.notes,
      status: body.status ?? session.status,
      ...(body.status === 'CONCLUIDO' && { completedAt: new Date() }),
    },
  })
  return NextResponse.json({ session: updated })
}
