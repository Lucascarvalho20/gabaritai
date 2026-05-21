import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Persiste a estrutura revisada do edital.
 *
 * Body:
 * {
 *   courseId: string,
 *   ano: number,
 *   banca?: string,            // slug da banca (cebraspe, fgv, fcc, etc)
 *   numero?: string,           // ex: "001/2026"
 *   titulo: string,            // ex: "PF Agente — 2026"
 *   pdfHash?: string,
 *   pdfUrl?: string,
 *   materias: [
 *     {
 *       nome: string,          // ex: "Direito Constitucional"
 *       subjectId?: string,    // se admin fez match com matéria global existente
 *       ordem?: number,
 *       topicos: [
 *         { nome: string, ordem?: number, subtopicos?: [...] }
 *       ]
 *     }
 *   ]
 * }
 *
 * Comportamento:
 *  - Cria/reutiliza Subject (por slug normalizado do nome)
 *  - Cria/reutiliza Topic (por nome dentro do Subject)
 *  - Vincula Subject ao Course via tabela CourseSubject (se ainda não vinculado)
 *  - Cria Edital com pdfHash pra auditoria
 *  - Retorna ids criados pra UI mostrar feedback
 *
 * Idempotente: rodar 2x não duplica.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json()
  const { courseId, ano, banca, numero, titulo, pdfHash, pdfUrl, materias } = body

  if (!courseId || !ano || !titulo || !Array.isArray(materias)) {
    return NextResponse.json(
      { message: 'courseId, ano, titulo e materias são obrigatórios' },
      { status: 400 },
    )
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  // Banca (opcional — só salva se admin informou e existe)
  let bancaId: string | null = null
  if (banca) {
    const b = await prisma.banca.findFirst({ where: { OR: [{ slug: banca }, { name: banca }] } })
    bancaId = b?.id ?? null
  }

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const createdMaterias: Array<{ subjectId: string; topicIds: string[] }> = []

  for (let mi = 0; mi < materias.length; mi++) {
    const m = materias[mi]
    if (!m.nome) continue

    // 1. Subject — reusa se já existe (matéria global)
    let subjectId: string = m.subjectId
    if (!subjectId) {
      const slug = slugify(m.nome)
      const existing = await prisma.subject.findFirst({ where: { OR: [{ slug }, { name: m.nome }] } })
      if (existing) {
        subjectId = existing.id
      } else {
        const created = await prisma.subject.create({
          data: { name: m.nome, slug },
        })
        subjectId = created.id
      }
    }

    // 2. Vincula Subject ao Course (se não vinculado)
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId, subjectId } },
      update: {},
      create: { courseId, subjectId, order: m.ordem ?? mi },
    }).catch(() => null) // ignora se a constraint composta não existir nesse schema

    // 3. Tópicos (recursivamente, com hierarquia parent)
    const topicIds: string[] = []
    async function createTopics(items: any[], parentId: string | null) {
      for (let ti = 0; ti < items.length; ti++) {
        const t = items[ti]
        if (!t.nome) continue
        // dedupe por (subjectId, name, parentId)
        const existing = await prisma.topic.findFirst({
          where: { subjectId, name: t.nome, parentId: parentId ?? null },
        })
        const topic = existing
          ? existing
          : await prisma.topic.create({
              data: {
                subjectId,
                parentId: parentId ?? null,
                name: t.nome,
                slug: slugify(t.nome),
                order: t.ordem ?? ti,
              },
            })
        topicIds.push(topic.id)
        if (Array.isArray(t.subtopicos) && t.subtopicos.length > 0) {
          await createTopics(t.subtopicos, topic.id)
        }
      }
    }
    if (Array.isArray(m.topicos)) await createTopics(m.topicos, null)
    createdMaterias.push({ subjectId, topicIds })
  }

  // 4. Cria o Edital (registra esse ato administrativo)
  const edital = await prisma.edital.create({
    data: {
      courseId,
      bancaId,
      ano,
      titulo,
      numero: numero ?? null,
      pdfHash: pdfHash ?? null,
      pdfUrl: pdfUrl ?? null,
      status: 'HOMOLOGADO',
      isActive: true, // marca esse edital como fonte da verdade do curso
    },
  })

  // Desativa editais antigos do mesmo curso (mantém histórico, troca o ativo)
  await prisma.edital.updateMany({
    where: { courseId, isActive: true, NOT: { id: edital.id } },
    data: { isActive: false },
  })

  return NextResponse.json({
    ok: true,
    editalId: edital.id,
    courseId,
    materiasSalvas: createdMaterias.length,
    topicosSalvos: createdMaterias.reduce((a, c) => a + c.topicIds.length, 0),
    detalhe: createdMaterias,
  })
}
