import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAI, parseAIJson } from '@/lib/ai-client'
import { Difficulty, QuestionSource } from '@prisma/client'

export const maxDuration = 600 // até 10 min — bulk pode ser pesado

/**
 * Importa MÚLTIPLAS provas oficiais de uma vez.
 *
 * Body: { provas: Array<{ text: string, banca?: string, ano?: number, orgao?: string }>, dryRun?: boolean }
 *
 * Pra cada prova: extrai questões via IA → resolve matéria automaticamente pelo nome →
 * salva como OFFICIAL. Continua mesmo se uma falhar.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { provas, dryRun } = await req.json()
  if (!Array.isArray(provas) || provas.length === 0) {
    return NextResponse.json({ message: 'provas[] obrigatório (mín 1)' }, { status: 400 })
  }
  if (provas.length > 20) {
    return NextResponse.json({ message: 'Máximo 20 provas por lote' }, { status: 400 })
  }

  // Lista matérias pra IA resolver por nome
  const allSubjects = await prisma.subject.findMany({ select: { id: true, name: true, slug: true } })
  const subjectByName = new Map(allSubjects.map((s) => [s.name.toLowerCase(), s.id]))

  const results: Array<{
    index: number
    banca?: string
    ano?: number
    orgao?: string
    extracted?: number
    saved?: number
    error?: string
  }> = []

  for (let i = 0; i < provas.length; i++) {
    const p = provas[i]
    if (!p.text || p.text.length < 200) {
      results.push({ index: i, banca: p.banca, ano: p.ano, orgao: p.orgao, error: 'Texto muito curto' })
      continue
    }

    try {
      const truncated = String(p.text).slice(0, 30000)
      const subjectsList = allSubjects.map((s) => s.name).join(', ')

      const prompt = `Extrator de questões de prova de concurso público.
Banca: ${p.banca ?? '?'}, Ano: ${p.ano ?? '?'}, Órgão: ${p.orgao ?? '?'}

Matérias disponíveis (use EXATAMENTE um destes nomes em "materia"):
${subjectsList}

Extraia TODAS as questões. Retorne JSON array:
[{
  "numero": 1,
  "enunciado": "...",
  "alternativas": [{"letra":"A","texto":"..."}, ...] OU [] se CE,
  "gabarito": "A" | "C" (certo) | "E" (errado),
  "materia": "Direito Constitucional" (use EXATAMENTE da lista acima)
}]

TEXTO:
"""${truncated}"""

Apenas JSON, sem markdown.`

      const raw = await callAI(prompt, { temperature: 0.2, maxTokens: 12000 })
      const extracted = parseAIJson<Array<{
        numero?: number
        enunciado: string
        alternativas?: Array<{ letra: string; texto: string }>
        gabarito: string
        materia?: string
      }>>(raw)

      if (dryRun) {
        results.push({ index: i, banca: p.banca, ano: p.ano, orgao: p.orgao, extracted: extracted.length })
        continue
      }

      // Persiste em batch
      const created = await prisma.$transaction(
        extracted.map((q) => {
          const subjId = q.materia ? subjectByName.get(q.materia.toLowerCase()) ?? null : null
          return prisma.question.create({
            data: {
              subjectId: subjId,
              bancaSlug: p.banca ?? null,
              orgao: p.orgao ?? null,
              ano: p.ano ?? null,
              numeroQuestao: q.numero ?? null,
              source: QuestionSource.OFFICIAL,
              difficulty: Difficulty.MEDIUM,
              enunciado: q.enunciado,
              alternativas: (q.alternativas ?? []) as any,
              gabarito: q.gabarito,
              explicacao: '',
              tags: [
                'bulk-import',
                ...(p.banca ? [`banca:${p.banca}`] : []),
                ...(p.ano ? [`ano:${p.ano}`] : []),
                ...(p.orgao ? [`orgao:${p.orgao}`] : []),
              ],
            },
            select: { id: true },
          })
        }),
      )

      results.push({
        index: i,
        banca: p.banca,
        ano: p.ano,
        orgao: p.orgao,
        extracted: extracted.length,
        saved: created.length,
      })
    } catch (err: any) {
      console.error(`[bulk] prova ${i} falhou:`, err.message)
      results.push({ index: i, banca: p.banca, ano: p.ano, orgao: p.orgao, error: err.message })
    }
  }

  const totalExtracted = results.reduce((s, r) => s + (r.extracted ?? 0), 0)
  const totalSaved = results.reduce((s, r) => s + (r.saved ?? 0), 0)
  const erros = results.filter((r) => r.error).length

  return NextResponse.json({
    dryRun: !!dryRun,
    totalProvas: provas.length,
    totalExtracted,
    totalSaved,
    erros,
    results,
  })
}
