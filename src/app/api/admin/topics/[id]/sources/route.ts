import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Fontes oficiais anexadas a um tópico.
 * São o que a IA vai usar como base pra gerar resumos (RAG).
 *
 * GET → lista fontes do tópico
 * POST → anexa nova fonte (multipart com PDF, ou JSON com texto + URL)
 *
 * Fonte = Material com type=PDF|TEXTO + origin='source' + topicId.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sources = await prisma.material.findMany({
    where: { topicId: params.id, origin: 'source' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, type: true, content: true, pdfUrl: true,
      source: true, authorName: true, createdAt: true,
    },
  })
  return NextResponse.json({ sources })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    select: { id: true, subjectId: true, name: true },
  })
  if (!topic) return NextResponse.json({ message: 'Tópico não encontrado' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''
  let title: string | null = null
  let textContent: string | null = null
  let pdfText: string | null = null
  let sourceRef: string | null = null   // ex: "CF/88 art. 5º" ou URL

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      title = (form.get('title') as string) || null
      sourceRef = (form.get('source') as string) || null
      const file = form.get('pdf') as File | null
      const rawText = (form.get('text') as string) || null

      if (file) {
        // Pra MVP, persiste só o texto extraído via IA (vision) — não armazena binário.
        // PDF inteiro vai como base pra IA. Tamanho razoável.
        if (file.size > 20 * 1024 * 1024) {
          return NextResponse.json({ message: 'PDF maior que 20MB — divida em partes' }, { status: 413 })
        }
        const buf = Buffer.from(await file.arrayBuffer())
        const b64 = buf.toString('base64')
        const { callAIVision } = await import('@/lib/ai-client')
        pdfText = await callAIVision({
          prompt: `Extraia TODO o texto deste PDF de forma íntegra, sem comentário. Mantenha estrutura de seções e numeração de artigos. Tópico associado: "${topic.name}".`,
          imageBase64: b64,
          mimeType: 'application/pdf',
          maxTokens: 18000,
        })
        title = title ?? file.name.replace(/\.pdf$/i, '')
      } else if (rawText) {
        textContent = rawText
      } else {
        return NextResponse.json({ message: 'Envie um PDF ou texto' }, { status: 400 })
      }
    } else {
      const body = await req.json()
      title = body.title ?? null
      textContent = body.text ?? null
      sourceRef = body.source ?? null
      if (!textContent) return NextResponse.json({ message: 'text obrigatório no body' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ message: `Falha ao processar fonte: ${err.message}` }, { status: 500 })
  }

  const finalContent = pdfText ?? textContent
  if (!finalContent || finalContent.trim().length < 30) {
    return NextResponse.json({ message: 'Conteúdo extraído muito curto — verifique a fonte' }, { status: 422 })
  }

  const material = await prisma.material.create({
    data: {
      title: title ?? `Fonte — ${topic.name}`,
      subjectId: topic.subjectId,
      topicId: topic.id,
      type: 'TEXTO',
      content: finalContent.slice(0, 60000), // limita pra cache/index
      source: sourceRef,
      origin: 'source',
      status: 'PUBLISHED', // fontes oficiais já entram como publicadas (não precisam revisão)
      authorName: auth.user.email,
      reviewedAt: new Date(),
      reviewedBy: auth.user.id,
    },
    select: { id: true, title: true, createdAt: true },
  })

  return NextResponse.json({ ok: true, source: material })
}
