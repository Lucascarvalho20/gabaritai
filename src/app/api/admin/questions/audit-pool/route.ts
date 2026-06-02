import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/questions/audit-pool?courseSlug=pmdf-soldado
 *
 * Audita o pool de diagnóstico de um curso (ou todos se omitir courseSlug).
 * Detecta questões "órfãs":
 *  1) BANCA TROCADA: questão tem bancaSlug != banca do edital ativo do curso
 *  2) MATÉRIA REMOVIDA: questão é de subjectId que NÃO está mais no edital ativo
 *
 * Útil quando admin atualiza edital — mostra quais questões precisam ser
 * regeneradas pra manter o diagnóstico coerente com a banca/matérias atuais.
 *
 * Resposta:
 *   {
 *     totalAuditado: N,
 *     porCurso: [{
 *       courseSlug, bancaAtual, totalQuestoesPool,
 *       orfasBanca: N (banca trocada),
 *       orfasMateria: N (matéria fora do edital),
 *       saudaveis: N,
 *       recomendacao: "regenerar via POST /api/setup/generate-questions-bulk com onlySlugs=[...]"
 *     }]
 *   }
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const courseSlug = searchParams.get('courseSlug')

  const cursos = await prisma.course.findMany({
    where: {
      active: true,
      ...(courseSlug ? { slug: courseSlug } : {}),
      editais: { some: { isActive: true } },
    },
    select: {
      id: true, slug: true, name: true,
      editais: {
        where: { isActive: true },
        select: {
          id: true,
          banca: { select: { slug: true, name: true } },
          subjects: { select: { subjectId: true } },
        },
        take: 1,
      },
    },
  })

  const porCurso: any[] = []
  let totalAuditado = 0

  for (const c of cursos) {
    const edital = c.editais[0]
    if (!edital) continue

    const bancaAtual = edital.banca?.slug ?? null
    const materiasAtuais = new Set(edital.subjects.map((s) => s.subjectId))
    const POOL_TAG = `diagnostico-pool:${c.slug}`

    const questoes = await prisma.question.findMany({
      where: { tags: { has: POOL_TAG }, active: true, anulada: false },
      select: { id: true, subjectId: true, bancaSlug: true },
    })
    totalAuditado += questoes.length

    const orfasBanca = questoes.filter((q) => bancaAtual && q.bancaSlug && q.bancaSlug !== bancaAtual)
    const orfasMateria = questoes.filter((q) => q.subjectId && !materiasAtuais.has(q.subjectId))
    const orfasIds = new Set([...orfasBanca, ...orfasMateria].map((q) => q.id))
    const saudaveis = questoes.length - orfasIds.size

    porCurso.push({
      courseSlug: c.slug,
      courseName: c.name,
      bancaAtual: edital.banca?.name ?? null,
      bancaSlugAtual: bancaAtual,
      totalQuestoesPool: questoes.length,
      orfasBanca: orfasBanca.length,
      orfasMateria: orfasMateria.length,
      saudaveis,
      needsRegeneration: orfasIds.size > 0,
      recomendacao: orfasIds.size > 0
        ? `Regenerar via POST /api/setup/generate-questions-bulk com body {"onlySlugs":["${c.slug}"],"regenerate":true}`
        : 'Pool saudável — questões coerentes com edital ativo.',
    })
  }

  const cursosComProblema = porCurso.filter((c) => c.needsRegeneration)

  return NextResponse.json({
    totalAuditado,
    totalCursos: porCurso.length,
    cursosComProblema: cursosComProblema.length,
    porCurso,
    resumo: cursosComProblema.length === 0
      ? '✅ Todos os pools estão coerentes com seus editais ativos.'
      : `⚠️ ${cursosComProblema.length} curso(s) com questões órfãs: ${cursosComProblema.map((c) => c.courseSlug).join(', ')}.`,
  })
}
