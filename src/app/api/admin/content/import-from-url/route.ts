import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAIVision, parseAIJson } from '@/lib/ai-client'
import { Difficulty, QuestionSource } from '@prisma/client'

export const maxDuration = 600

/**
 * Importa prova oficial direto de uma URL pública.
 *
 * Body: { pdfUrl: string, banca?: string, ano?: number, orgao?: string, dryRun?: boolean }
 *
 * Fluxo:
 *  1. Valida URL (http/https + .pdf opcional)
 *  2. Faz GET pra baixar o PDF
 *  3. Converte pra base64 e manda pro Gemini Vision
 *  4. IA extrai questões
 *  5. Salva no banco como OFFICIAL
 *
 * Fontes públicas testadas que funcionam:
 *  - Cebraspe: https://www.cebraspe.org.br → busca concurso → "Provas e gabaritos"
 *  - FGV: https://conhecimento.fgv.br/concursos
 *  - FCC: https://www.concursosfcc.com.br
 *  - VUNESP: https://www.vunesp.com.br/concursos-encerrados
 *
 * Limitações:
 *  - Tamanho máx 20MB (limite do Gemini)
 *  - Bancas que bloqueiam bots (raras) podem falhar
 *  - URL precisa ser direta pro PDF (não redirect)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { pdfUrl, banca, ano, orgao, dryRun } = await req.json()

  if (!pdfUrl || typeof pdfUrl !== 'string') {
    return NextResponse.json({ message: 'pdfUrl obrigatório' }, { status: 400 })
  }

  // Valida URL
  let url: URL
  try {
    url = new URL(pdfUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ message: 'URL deve ser http ou https' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ message: 'URL inválida' }, { status: 400 })
  }

  // Baixa o PDF
  let pdfBuffer: ArrayBuffer
  try {
    const res = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,*/*',
      },
    })
    if (!res.ok) {
      return NextResponse.json({ message: `Banca retornou ${res.status} (talvez bloqueou bot ou URL inválida)` }, { status: 502 })
    }
    pdfBuffer = await res.arrayBuffer()
    if (pdfBuffer.byteLength === 0) {
      return NextResponse.json({ message: 'PDF vazio' }, { status: 502 })
    }
    if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ message: 'PDF maior que 20MB — divida em partes' }, { status: 413 })
    }
  } catch (err: any) {
    return NextResponse.json({ message: `Falha ao baixar PDF: ${err.message}` }, { status: 502 })
  }

  const base64 = Buffer.from(pdfBuffer).toString('base64')

  // Lista matérias do banco pra IA mapear corretamente
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
- Se gabarito não estiver no PDF, deixe gabarito ""
- Detecte formato: Cebraspe = certo/errado. FGV/FCC/VUNESP = A-E
- Texto-base (CG1A1, etc) deve ser incluído no enunciado da primeira questão associada`

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
    return NextResponse.json({ message: `Falha na extração IA: ${err.message}` }, { status: 500 })
  }

  if (!Array.isArray(extracted) || extracted.length === 0) {
    return NextResponse.json({ message: 'IA não conseguiu extrair questões do PDF (talvez PDF protegido ou escaneamento ruim)' }, { status: 422 })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      pdfSizeKb: Math.round(pdfBuffer.byteLength / 1024),
      extractedCount: extracted.length,
      sample: extracted.slice(0, 3),
      questions: extracted,
    })
  }

  // Persiste
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
            'url-import',
            ...(banca ? [`banca:${banca}`] : []),
            ...(ano ? [`ano:${ano}`] : []),
            ...(orgao ? [`orgao:${orgao}`] : []),
            `source-url:${url.hostname}`,
          ],
        },
        select: { id: true },
      })
    }),
  )

  return NextResponse.json({
    ok: true,
    count: created.length,
    pdfSizeKb: Math.round(pdfBuffer.byteLength / 1024),
    sourceUrl: pdfUrl,
  })
}
