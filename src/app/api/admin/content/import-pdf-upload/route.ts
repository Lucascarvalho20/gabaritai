import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAIVision, parseAIJson } from '@/lib/ai-client'
import { Difficulty, QuestionSource } from '@prisma/client'

export const maxDuration = 600 // 10min — PDFs grandes podem demorar
export const runtime = 'nodejs'

// POST /api/admin/content/import-pdf-upload (multipart/form-data)
// Campos: file (PDF), banca?, ano?, orgao?, dryRun?
//
// Estratégia: envia o PDF inteiro pro Gemini Flash 2.0 (multimodal, lê PDF nativo).
// Funciona pra PDFs com texto extraível E escaneados (OCR built-in).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const banca = (formData.get('banca') as string | null) ?? undefined
  const ano = formData.get('ano') ? parseInt(formData.get('ano') as string, 10) : undefined
  const orgao = (formData.get('orgao') as string | null) ?? undefined
  const dryRun = formData.get('dryRun') === 'true'

  if (!file) return NextResponse.json({ message: 'Arquivo PDF obrigatório' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ message: 'Apenas arquivos PDF' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ message: 'PDF muito grande (máx 20MB)' }, { status: 400 })

  // Converte pra base64
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Lista matérias pra IA mapear
  const allSubjects = await prisma.subject.findMany({ select: { id: true, name: true } })
  const subjectsList = allSubjects.map((s) => s.name).join(', ')
  const subjectByName = new Map(allSubjects.map((s) => [s.name.toLowerCase(), s.id]))

  const prompt = `Você é extrator especializado em provas de concurso brasileiro.

Analise o PDF anexo (prova ${banca ?? '?'} ${ano ?? '?'} ${orgao ? '— ' + orgao : ''}) e extraia TODAS as questões.

Matérias disponíveis (use EXATAMENTE um destes nomes em "materia"):
${subjectsList}

Retorne JSON array (apenas o JSON, sem markdown):
[{
  "numero": 1,
  "enunciado": "texto completo da questão",
  "alternativas": [{"letra":"A","texto":"..."}, ...] OU [] se for CERTO/ERRADO,
  "gabarito": "A" | "B" | ... | "C" (certo) | "E" (errado),
  "materia": "Direito Constitucional"
}]

REGRAS:
- Ignore cabeçalho/rodapé/numeração de página
- Se o gabarito não estiver no PDF, deixe gabarito ""
- Se aparecer texto-base (CG1A1, etc), inclua no enunciado da primeira questão associada
- Detecte o formato: Cebraspe = certo/errado (alternativas vazias). FGV/FCC/VUNESP = A-E.`

  let extracted: Array<{
    numero?: number
    enunciado: string
    alternativas?: Array<{ letra: string; texto: string }>
    gabarito: string
    materia?: string
  }>
  try {
    const raw = await callAIVision({
      prompt,
      imageBase64: base64,
      mimeType: 'application/pdf',
      maxTokens: 20000,
    })
    extracted = parseAIJson(raw)
  } catch (err: any) {
    return NextResponse.json({ message: `Falha na extração: ${err.message}` }, { status: 500 })
  }

  if (!Array.isArray(extracted) || extracted.length === 0) {
    return NextResponse.json({ message: 'IA não conseguiu extrair questões do PDF' }, { status: 422 })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      extractedCount: extracted.length,
      sample: extracted.slice(0, 3),
      questions: extracted,
    })
  }

  const created = await prisma.$transaction(
    extracted.map((q) => {
      const subjId = q.materia ? subjectByName.get(q.materia.toLowerCase()) ?? null : null
      return prisma.question.create({
        data: {
          subjectId: subjId,
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
          tags: [
            'pdf-upload',
            ...(banca ? [`banca:${banca}`] : []),
            ...(ano ? [`ano:${ano}`] : []),
            ...(orgao ? [`orgao:${orgao}`] : []),
          ],
        },
        select: { id: true },
      })
    }),
  )

  return NextResponse.json({
    ok: true,
    count: created.length,
    fileName: file.name,
    fileSizeKb: Math.round(file.size / 1024),
  })
}
