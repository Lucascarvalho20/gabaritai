import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { lerArquivoDeProva, listarArquivosDeProva } from '@/lib/provas/arquivo'
import { importarProva } from '@/lib/provas/importar'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET  /api/admin/provas/importar — as provas oficiais prontas no repositório
 *      (data/provas/) e se cada uma já está no banco.
 * POST /api/admin/provas/importar { slug } — importa (ou reimporta) uma prova.
 *      Uma por chamada: a tela chama em sequência, e nenhuma passa do tempo limite.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const slugs = listarArquivosDeProva()
  const noBanco = await prisma.prova.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, _count: { select: { questions: { where: { active: true } } } } },
  })
  const itensNoBanco = new Map(noBanco.map((p) => [p.slug, p._count.questions]))
  const provas = slugs.map((slug) => {
    const a = lerArquivoDeProva(slug)
    return {
      slug, titulo: a.titulo, curso: a.curso, ano: a.ano, itens: a.itens.length,
      importada: itensNoBanco.has(slug), itensNoBanco: itensNoBanco.get(slug) ?? 0,
    }
  })
  return NextResponse.json({ provas })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const { slug } = await req.json().catch(() => ({}))
  if (typeof slug !== 'string' || !listarArquivosDeProva().includes(slug)) {
    return NextResponse.json({ message: 'Prova não encontrada entre as prontas.' }, { status: 404 })
  }
  try {
    return NextResponse.json(await importarProva(lerArquivoDeProva(slug)))
  } catch (err) {
    console.error('[provas-importar]', slug, err)
    const tabelaFaltando = /prova_textos|prova_tentativas|column .* does not exist/i.test(String((err as Error)?.message))
    return NextResponse.json({
      message: tabelaFaltando
        ? 'O banco ainda não tem as tabelas das provas: rode prisma/sql/2026-11-14-provas-anteriores.sql no Supabase.'
        : String((err as Error)?.message ?? 'Erro ao importar'),
    }, { status: 400 })
  }
}
