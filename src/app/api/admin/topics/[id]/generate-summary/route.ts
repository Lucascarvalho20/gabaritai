import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * RAG: gera resumo de estudo do tópico usando as FONTES ANEXADAS como base.
 *
 * - Se tem fontes (Materials com origin='source') → IA é instruída a citar literalmente.
 * - Se NÃO tem fontes → IA gera "best effort" com aviso DRAFT obrigatório.
 *
 * Body: { force?: boolean }
 *   force=true → regera mesmo se já tem resumo (sobrescreve em DRAFT)
 *
 * Retorna: { material, sourcesUsed, status: 'DRAFT' }
 *
 * O resumo gerado fica como Material(type=RESUMO, status=DRAFT) — só vira
 * PUBLISHED depois do admin aprovar manualmente.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const force = !!body.force

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, subjectId: true,
      subject: { select: { id: true, name: true } },
      parent: { select: { name: true } },
    },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  // Já existe resumo? Se sim e não é force → bloqueia (admin escolhe regerar conscientemente)
  const existingResumo = await prisma.material.findFirst({
    where: { topicId: topic.id, type: 'RESUMO', origin: { in: ['ai', 'admin'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })
  if (existingResumo && !force) {
    return NextResponse.json({
      message: `Já existe resumo (status=${existingResumo.status}). Use force=true pra regerar.`,
      existingId: existingResumo.id,
    }, { status: 409 })
  }

  // Carrega fontes anexadas
  const sources = await prisma.material.findMany({
    where: { topicId: topic.id, origin: 'source' },
    select: { id: true, title: true, content: true, source: true },
    orderBy: { createdAt: 'asc' },
  })

  // Monta prompt — duas variantes (com ou sem fontes)
  const subjectName = topic.subject.name
  const topicLabel = topic.parent ? `${topic.parent.name} → ${topic.name}` : topic.name
  let prompt: string
  let sourcesUsed: { id: string; title: string }[] = []

  if (sources.length > 0) {
    // RAG: força a IA a se basear nas fontes anexadas
    const fontesTexto = sources.map((s, i) =>
      `[FONTE ${i + 1}: ${s.title}${s.source ? ` (${s.source})` : ''}]\n${(s.content ?? '').slice(0, 8000)}`
    ).join('\n\n')

    prompt = `Você é um professor de cursos preparatórios de concurso. Gere um resumo de estudo do tópico abaixo.

MATÉRIA: ${subjectName}
TÓPICO: ${topicLabel}

FONTES OFICIAIS ANEXADAS (use APENAS o que está abaixo — não invente):
${fontesTexto}

REGRAS:
1. Estruture em markdown com headings (##), listas e exemplos
2. CITE as fontes ao longo do texto: "[FONTE 1]" quando usar trecho da primeira fonte, etc.
3. Inclua: definição clara, conceitos-chave, fórmulas/artigos relevantes, 2-3 exemplos práticos, dicas de prova
4. Se a fonte cita um artigo de lei, transcreva o artigo entre aspas
5. Se algo do tópico NÃO está nas fontes, diga "Não abordado nas fontes anexadas" — não invente
6. Final: lista de "Pontos pra cair em prova" (5-8 itens)
7. Português brasileiro, tom didático, ~800-1500 palavras

Retorne APENAS o markdown do resumo (sem JSON, sem cercas \`\`\`).`
    sourcesUsed = sources.map((s) => ({ id: s.id, title: s.title }))
  } else {
    // Sem fontes — best effort
    prompt = `Você é um professor de cursos preparatórios de concurso brasileiro.

Gere um resumo de estudo SOBRE:
MATÉRIA: ${subjectName}
TÓPICO: ${topicLabel}

⚠️ NÃO tenho fontes anexadas pra esse tópico. Você está gerando best-effort.

REGRAS:
1. Markdown com headings (##), listas, exemplos
2. Inclua: definição, conceitos-chave, fórmulas/artigos relevantes, 2-3 exemplos, dicas de prova
3. Se citar lei/artigo, MARQUE como "(verificar fonte oficial)" porque você não tem a lei em mãos
4. NUNCA invente número de artigo, súmula, ou jurisprudência — se não tiver certeza, escreva "[citação a verificar]"
5. Final: lista de "Pontos pra cair em prova" (5-8 itens)
6. ~800-1500 palavras
7. No início, deixe um aviso: "> ⚠️ Resumo gerado sem fontes anexadas — admin deve revisar e validar todas as citações antes de publicar"

Retorne APENAS o markdown.`
  }

  let resumoText: string
  try {
    resumoText = await callAI(prompt, { task: 'generate', maxTokens: 4000 })
  } catch (err: any) {
    return apiError(err, 'Falha na geração via IA — tenta de novo', 'topic-generate-summary')
  }
  if (!resumoText || resumoText.length < 200) {
    return NextResponse.json({ message: 'Resumo gerado muito curto — tente novamente' }, { status: 502 })
  }

  // Salva como Material RESUMO em DRAFT
  let material
  if (existingResumo && force) {
    material = await prisma.material.update({
      where: { id: existingResumo.id },
      data: {
        content: resumoText,
        status: 'DRAFT',
        origin: sources.length > 0 ? 'ai-rag' : 'ai-bestfffort',
        sourcesUsed: sourcesUsed as any,
        reviewedAt: null,
        reviewedBy: null,
      },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    })
  } else {
    material = await prisma.material.create({
      data: {
        title: `Resumo: ${topic.name}`,
        subjectId: topic.subjectId,
        topicId: topic.id,
        type: 'RESUMO',
        content: resumoText,
        status: 'DRAFT',
        origin: sources.length > 0 ? 'ai-rag' : 'ai-bestfffort',
        sourcesUsed: sourcesUsed as any,
        authorName: 'IA (revisão pendente)',
      },
      select: { id: true, status: true, createdAt: true },
    })
  }

  return NextResponse.json({
    ok: true,
    material,
    sourcesUsed,
    rag: sources.length > 0,
    wordCount: resumoText.split(/\s+/).length,
  })
}
