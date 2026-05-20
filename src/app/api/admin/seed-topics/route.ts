import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 300

/**
 * Gera árvore de tópicos (assuntos + subassuntos) pra cada matéria.
 *
 * Uso (idempotente, pode rodar várias vezes):
 *   POST /api/admin/seed-topics?subjectSlug=direito-constitucional
 *   POST /api/admin/seed-topics  (todas as matérias que não têm topics)
 *
 * Usa Groq grátis pra cada matéria (~50 matérias × 1s = 1min total).
 * Salva como Topic.parentId hierárquico.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const subjectSlug = searchParams.get('subjectSlug')
  const force = searchParams.get('force') === 'true'

  const where: any = subjectSlug ? { slug: subjectSlug } : {}
  const subjects = await prisma.subject.findMany({ where, orderBy: { name: 'asc' } })

  if (subjects.length === 0) {
    return NextResponse.json({ message: 'Nenhuma matéria encontrada' }, { status: 404 })
  }

  const results: Array<{ subject: string; topicsCreated: number; skipped?: boolean; error?: string }> = []

  for (const subject of subjects) {
    // Skip se já tem topics (a não ser que force)
    if (!force) {
      const existing = await prisma.topic.count({ where: { subjectId: subject.id } })
      if (existing > 0) {
        results.push({ subject: subject.name, topicsCreated: 0, skipped: true })
        continue
      }
    }

    const prompt = `Você é um especialista em editais de concursos públicos brasileiros (especialmente Cebraspe, FGV, FCC).

Gere a ÁRVORE de tópicos cobrados nos últimos 5 anos para a matéria "${subject.name}".

Estrutura JSON exata:
[
  {
    "name": "Tópico raiz 1 (ex: 'Princípios Fundamentais')",
    "weight": 1.5,
    "subItems": [
      { "name": "Subtópico 1.1 (ex: 'Estado Democrático de Direito')" },
      { "name": "Subtópico 1.2" }
    ]
  },
  {
    "name": "Tópico raiz 2",
    "weight": 1.0,
    "subItems": []
  }
]

REGRAS:
- 5-10 tópicos raiz
- 2-5 subitens por tópico (quando aplicável)
- weight: 0.5 (raro) a 2.0 (muito cobrado)
- Use nomes técnicos corretos (ex: "Art. 5º, LXXVIII", "Habeas Corpus", "Princípio da Insignificância")
- Foque no que é COBRADO em provas
- Apenas o JSON (sem markdown)`

    try {
      const raw = await callAI(prompt, { task: 'extract', maxTokens: 3000, temperature: 0.3 })
      const tree = parseAIJson<Array<{ name: string; weight?: number; subItems?: Array<{ name: string }> }>>(raw)

      let created = 0
      for (let i = 0; i < tree.length; i++) {
        const node = tree[i]
        if (!node.name) continue
        const slug = node.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50)
        const parent = await prisma.topic.create({
          data: {
            subjectId: subject.id,
            name: node.name,
            slug,
            weight: node.weight ?? 1.0,
            order: i,
          },
        })
        created++

        if (Array.isArray(node.subItems)) {
          for (let j = 0; j < node.subItems.length; j++) {
            const sub = node.subItems[j]
            if (!sub.name) continue
            const subSlug = sub.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50)
            await prisma.topic.create({
              data: {
                subjectId: subject.id,
                parentId: parent.id,
                name: sub.name,
                slug: subSlug,
                order: j,
              },
            })
            created++
          }
        }
      }
      results.push({ subject: subject.name, topicsCreated: created })
    } catch (err: any) {
      console.error(`[seed-topics] ${subject.name} failed:`, err.message)
      results.push({ subject: subject.name, topicsCreated: 0, error: err.message })
    }
  }

  const totalCreated = results.reduce((s, r) => s + r.topicsCreated, 0)
  const totalSkipped = results.filter((r) => r.skipped).length
  const totalErrors = results.filter((r) => r.error).length

  return NextResponse.json({
    message: `${totalCreated} tópicos criados em ${subjects.length - totalSkipped} matérias`,
    summary: {
      subjectsProcessed: subjects.length,
      totalTopicsCreated: totalCreated,
      skipped: totalSkipped,
      errors: totalErrors,
    },
    results,
  })
}
