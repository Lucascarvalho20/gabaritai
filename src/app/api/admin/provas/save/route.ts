import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Persiste uma Prova oficial extraída do PDF + suas Questions associadas.
 * Body:
 *  {
 *    courseId: string,
 *    editalId?: string,
 *    bancaSlug?: string,
 *    ano: number,
 *    titulo: string,
 *    etapa?: string,
 *    cargo?: string,
 *    pdfUrl?: string,
 *    gabaritoUrl?: string,
 *    questoes: [{
 *      numero, enunciado, alternativas, gabarito?, anulada?, subjectId?, difficulty?
 *    }]
 *  }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const {
    courseId, editalId, bancaSlug, ano, titulo, etapa, cargo, pdfUrl, gabaritoUrl, questoes,
  } = body

  if (!ano || !titulo || !Array.isArray(questoes) || questoes.length === 0) {
    return NextResponse.json(
      { message: 'ano, titulo e questoes são obrigatórios' },
      { status: 400 },
    )
  }

  // Resolve bancaId a partir do slug se houver
  let bancaId: string | null = null
  if (bancaSlug) {
    const b = await prisma.banca.findFirst({ where: { OR: [{ slug: bancaSlug }, { name: bancaSlug }] } })
    bancaId = b?.id ?? null
  }

  const orgaoEdital = editalId
    ? await prisma.edital.findUnique({ where: { id: editalId }, select: { course: { select: { orgao: true } } } })
    : null

  // 1. Cria a Prova
  const prova = await prisma.prova.create({
    data: {
      editalId: editalId ?? null,
      bancaId,
      courseId: courseId ?? null,
      ano,
      titulo,
      etapa: etapa ?? null,
      cargo: cargo ?? null,
      pdfUrl: pdfUrl ?? null,
      gabaritoUrl: gabaritoUrl ?? null,
    },
  })

  // 2. Cria as Questions em batch
  const orgao = orgaoEdital?.course?.orgao ?? null
  const questionData = questoes
    .filter((q: any) => q.enunciado && Array.isArray(q.alternativas))
    .map((q: any) => ({
      provaId: prova.id,
      subjectId: q.subjectId ?? null,
      bancaSlug: bancaSlug ?? null,
      orgao,
      ano,
      numeroQuestao: typeof q.numero === 'number' ? q.numero : null,
      difficulty: (q.difficulty ?? 'MEDIUM') as any,
      source: 'OFFICIAL' as any,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      gabarito: q.gabarito ?? '',
      gabaritoOficial: q.gabarito ?? null,
      anulada: Boolean(q.anulada),
      explicacao: q.explicacao ?? '',
      tags: [],
      active: !q.anulada,
    }))

  if (questionData.length === 0) {
    return NextResponse.json({ message: 'Nenhuma questão válida pra salvar' }, { status: 400 })
  }

  await prisma.question.createMany({ data: questionData })

  return NextResponse.json({
    ok: true,
    provaId: prova.id,
    questoesSalvas: questionData.length,
    comGabarito: questionData.filter((q) => q.gabarito).length,
    anuladas: questionData.filter((q) => q.anulada).length,
  })
}
