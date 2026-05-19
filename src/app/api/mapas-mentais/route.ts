import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 90

// GET /api/mapas-mentais?subjectSlug=&courseSlug=
// Lista mapas mentais disponíveis (filtra por matéria opcionalmente)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subjectSlug = searchParams.get('subjectSlug') ?? undefined

  const where: any = { type: 'MAPA_MENTAL', active: true }
  if (subjectSlug) where.subject = { slug: subjectSlug }

  const mapas = await prisma.material.findMany({
    where,
    select: {
      id: true,
      title: true,
      createdAt: true,
      subject: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ mapas })
}

// POST /api/mapas-mentais
// Body: { subjectId, topic? } — gera mapa mental via IA + salva como Material
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { subjectId, topic } = body
  if (!subjectId) return NextResponse.json({ message: 'subjectId obrigatório' }, { status: 400 })

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!subject) return NextResponse.json({ message: 'Matéria não encontrada' }, { status: 404 })

  const focusPart = topic ? `Foco no tema específico: "${topic}". ` : ''

  const prompt = `Você é um especialista em criar MAPAS MENTAIS visuais pra concursos públicos.

Crie um mapa mental sobre: ${subject.name}.
${focusPart}

Retorne JSON com estrutura HIERÁRQUICA:
- nó central (a matéria/tema)
- 4-7 ramos principais (categorias grandes)
- cada ramo com 3-8 sub-itens (conceitos, princípios, artigos, etc)
- alguns sub-itens podem ter sub-sub-itens (até 1 nível extra)

REGRAS:
- Conteúdo TÉCNICO CORRETO (baseado em legislação atualizada, doutrina majoritária)
- Tópicos CURTOS (máximo 8 palavras por nó)
- Cite artigos de lei quando relevante (ex: "Art. 5º, LXXVIII")
- Use ícones-emoji nos ramos principais pra organização visual
- Distribua cores entre os ramos (azul, amarelo, verde, vermelho, roxo)

FORMATO JSON exato (retorne APENAS o JSON, sem markdown):
{
  "title": "Mapa Mental: {tema}",
  "central": {
    "label": "Texto central",
    "icon": "📚"
  },
  "branches": [
    {
      "label": "Ramo 1",
      "icon": "⚖️",
      "color": "blue",
      "items": [
        { "label": "Item 1", "subItems": ["Sub 1", "Sub 2"] },
        { "label": "Item 2" }
      ]
    }
  ]
}`

  let parsed: any
  try {
    const raw = await callAI(prompt, { maxTokens: 4000, temperature: 0.5 })
    parsed = parseAIJson<any>(raw)
  } catch (e: any) {
    return NextResponse.json({ message: `Erro IA: ${e.message}` }, { status: 500 })
  }

  if (!parsed?.central || !Array.isArray(parsed?.branches)) {
    return NextResponse.json({ message: 'IA retornou estrutura inválida' }, { status: 500 })
  }

  const material = await prisma.material.create({
    data: {
      subjectId: subject.id,
      title: parsed.title ?? `Mapa Mental: ${subject.name}`,
      type: 'MAPA_MENTAL',
      content: JSON.stringify(parsed),
      source: 'AI:claude-sonnet-4-6',
      authorName: 'Mentor IA',
      active: true,
    },
  })

  return NextResponse.json({ id: material.id, mapa: parsed })
}
