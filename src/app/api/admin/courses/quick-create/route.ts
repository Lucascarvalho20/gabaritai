import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Cria rapidamente um Course quando o admin está importando um edital multi-cargo
 * e identifica um cargo que ainda não tem curso cadastrado no site.
 *
 * Body: {
 *   name: string,         // ex "PF Agente"
 *   cargo: string,        // ex "Agente de Polícia Federal"
 *   orgao?: string,       // ex "Polícia Federal"
 *   area?: 'POLICIAL' | 'MILITAR' | 'BOMBEIRO' | 'GUARDA_MUNICIPAL' | 'OUTRO',
 *   uf?: string,
 *   parentSlug?: string,  // ex "pf" pra agrupar agente+escrivão+delegado sob o mesmo concurso
 * }
 *
 * Retorna o Course criado. Slug é gerado automaticamente.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { name, cargo, orgao, area, uf, parentSlug, description } = body

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return NextResponse.json({ message: 'Nome do curso obrigatório (mín 3 chars)' }, { status: 400 })
  }

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  let slug = slugify(name)
  // garante unicidade
  let attempt = 0
  while (await prisma.course.findUnique({ where: { slug } })) {
    attempt++
    slug = `${slugify(name)}-${attempt}`
    if (attempt > 20) {
      return NextResponse.json({ message: 'Não consegui gerar slug único' }, { status: 500 })
    }
  }

  const allowedAreas = ['POLICIAL', 'MILITAR', 'BOMBEIRO', 'GUARDA_MUNICIPAL', 'OUTRO']
  const areaSafe = allowedAreas.includes(String(area).toUpperCase())
    ? (String(area).toUpperCase() as any)
    : 'POLICIAL'

  const course = await prisma.course.create({
    data: {
      slug,
      name: name.trim(),
      description: description ?? null,
      cargo: cargo ?? null,
      orgao: orgao ?? null,
      area: areaSafe,
      uf: uf ?? null,
      parentSlug: parentSlug ?? null,
      active: true,
    },
  })

  return NextResponse.json({ ok: true, course })
}
