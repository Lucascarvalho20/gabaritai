import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAIVision, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Extrai a ESTRUTURA do edital (matérias + tópicos), não as questões.
 *
 * Diferente de /api/admin/content/import-from-url que pega questões,
 * esse aqui lê o "anexo de conteúdo programático" do edital e devolve
 * a árvore Matéria → Tópico literal, para o admin revisar.
 *
 * IA é forçada a NÃO inventar — só extrair o que estiver no PDF.
 *
 * Body multipart: { pdf: File, courseId?: string, ano?: number, banca?: string }
 * OU JSON: { pdfBase64, courseId, ano, banca, dryRun }
 *
 * Retorna:
 *   {
 *     extracted: [{ materia, topicos: [{ nome, ordem }] }, ...],
 *     pdfHash: string,
 *     pdfSizeKb: number,
 *   }
 *
 * Não persiste nada — apenas extrai. A persistência fica no endpoint /save.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const contentType = req.headers.get('content-type') ?? ''
  let pdfBuffer: ArrayBuffer
  let courseId: string | undefined
  let ano: number | undefined
  let banca: string | undefined

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('pdf') as File | null
      if (!file) return NextResponse.json({ message: 'Anexe o PDF do edital' }, { status: 400 })
      pdfBuffer = await file.arrayBuffer()
      courseId = (form.get('courseId') as string) || undefined
      ano = form.get('ano') ? Number(form.get('ano')) : undefined
      banca = (form.get('banca') as string) || undefined
    } else {
      const body = await req.json()
      if (!body.pdfBase64) return NextResponse.json({ message: 'pdfBase64 obrigatório' }, { status: 400 })
      pdfBuffer = Buffer.from(body.pdfBase64, 'base64').buffer as ArrayBuffer
      courseId = body.courseId
      ano = body.ano
      banca = body.banca
    }
  } catch (err: any) {
    return NextResponse.json({ message: `PDF inválido: ${err.message}` }, { status: 400 })
  }

  if (pdfBuffer.byteLength === 0) {
    return NextResponse.json({ message: 'PDF vazio' }, { status: 400 })
  }
  if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ message: 'PDF maior que 20MB — divida em partes' }, { status: 413 })
  }

  const base64 = Buffer.from(pdfBuffer).toString('base64')

  const prompt = `Você é um extrator estruturado de editais de concurso brasileiro.

Analise o PDF anexo (edital ${banca ?? ''} ${ano ?? ''}) e extraia EXATAMENTE a estrutura do conteúdo programático.

REGRAS RÍGIDAS:
1. NÃO invente matérias ou tópicos. Se algo não estiver no PDF, deixe de fora.
2. Use os nomes EXATOS como aparecem no edital (preserve maiúsculas, acentos, numeração).
3. Procure a seção "ANEXO" / "CONTEÚDO PROGRAMÁTICO" / "PROGRAMA" — é onde estão as matérias.
4. Ignore tabelas de cargos, vagas, salários — só queremos o conteúdo a estudar.
5. Se houver subitens hierárquicos (ex: 1. Direito Constitucional / 1.1 Princípios / 1.2 Direitos), preserve a hierarquia em "subtopicos".
6. Se houver múltiplos cargos com programas diferentes, retorne todos juntos (vamos filtrar depois).

Retorne APENAS JSON, sem markdown, neste formato:
{
  "materias": [
    {
      "nome": "Direito Constitucional",
      "ordem": 1,
      "topicos": [
        {
          "nome": "Princípios Fundamentais",
          "ordem": 1,
          "subtopicos": [
            { "nome": "Soberania, cidadania, dignidade", "ordem": 1 }
          ]
        }
      ]
    }
  ]
}

Se o PDF não for um edital ou não tiver conteúdo programático, retorne { "materias": [], "erro": "explicação" }.`

  let extracted: { materias: Array<any>; erro?: string }

  try {
    const raw = await callAIVision({
      prompt,
      imageBase64: base64,
      mimeType: 'application/pdf',
      maxTokens: 16000,
    })
    extracted = parseAIJson(raw)
  } catch (err: any) {
    return NextResponse.json(
      { message: `Falha na extração IA: ${err.message}` },
      { status: 500 },
    )
  }

  if (!extracted.materias || !Array.isArray(extracted.materias)) {
    return NextResponse.json(
      { message: 'IA não conseguiu extrair estrutura. ' + (extracted.erro ?? '') },
      { status: 422 },
    )
  }

  // Hash do PDF pra auditoria + detectar duplicatas
  const crypto = await import('crypto')
  const pdfHash = crypto.createHash('sha256').update(Buffer.from(pdfBuffer)).digest('hex')

  // Carrega matérias globais existentes pra ajudar o admin a fazer match
  const knownSubjects = await prisma.subject.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  // Conta tópicos pra estatística
  let totalTopicos = 0
  for (const m of extracted.materias) {
    if (m.topicos) totalTopicos += m.topicos.length
  }

  return NextResponse.json({
    ok: true,
    courseId: courseId ?? null,
    ano: ano ?? null,
    banca: banca ?? null,
    pdfHash,
    pdfSizeKb: Math.round(pdfBuffer.byteLength / 1024),
    extracted: extracted.materias,
    stats: {
      materias: extracted.materias.length,
      topicos: totalTopicos,
    },
    knownSubjects, // pra UI sugerir match
  })
}
