import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      courseSubjects: {
        include: { subject: { select: { id: true, slug: true, name: true, area: true } } },
        orderBy: { order: 'asc' },
      },
      editais: {
        where: { status: { in: ['ABERTO', 'INSCRICOES_ENCERRADAS', 'AGUARDANDO_PROVA'] } },
        orderBy: { dataProva: 'asc' },
      },
    },
  })

  if (!course) return NextResponse.json({ message: 'Curso não encontrado' }, { status: 404 })

  return NextResponse.json({
    id: course.id,
    slug: course.slug,
    name: course.name,
    description: course.description,
    area: course.area,
    uf: course.uf,
    orgao: course.orgao,
    subjects: course.courseSubjects.map((cs) => ({
      id: cs.subject.id,
      slug: cs.subject.slug,
      name: cs.subject.name,
      area: cs.subject.area,
      weight: cs.weight,
      order: cs.order,
    })),
    activeEditais: course.editais,
  })
}
