import { prisma } from './prisma'
import type { Edital, Banca, EditalSubject, Subject, ExamFormat } from '@prisma/client'

// Edital ativo é a fonte da verdade pra banca, matérias, peso, tempo de prova, formato.
// Se nenhum edital tá marcado isActive=true, usa o mais recente (último ano).

export type EditalWithRelations = Edital & {
  banca: Banca | null
  subjects: (EditalSubject & { subject: Subject })[]
}

export async function getActiveEditalForCourse(courseId: string): Promise<EditalWithRelations | null> {
  const active = await prisma.edital.findFirst({
    where: { courseId, isActive: true },
    include: { banca: true, subjects: { include: { subject: true }, orderBy: { order: 'asc' } } },
    orderBy: { ano: 'desc' },
  })
  if (active) return active

  return prisma.edital.findFirst({
    where: { courseId },
    include: { banca: true, subjects: { include: { subject: true }, orderBy: { order: 'asc' } } },
    orderBy: [{ ano: 'desc' }, { createdAt: 'desc' }],
  })
}

export type EffectiveExamConfig = {
  bancaSlug: string | null
  bancaName: string | null
  examFormat: ExamFormat | null
  totalQuestoes: number
  duracaoMin: number
  hasRedacao: boolean
  wrongAnnulsRight: boolean
  subjects: Array<{
    subjectId: string
    subjectSlug: string
    subjectName: string
    weight: number
    expectedQuestions: number
    programa: string | null
  }>
  source: 'EDITAL_ATIVO' | 'EDITAL_ULTIMO' | 'COURSE_DEFAULT'
  editalId: string | null
  editalAno: number | null
}

// Resolve toda config de prova pra um curso. Prioridade:
// 1. Edital ativo (isActive=true)
// 2. Edital mais recente (último ano)
// 3. CourseSubject padrão (sem edital)
export async function getEffectiveExamConfig(courseId: string): Promise<EffectiveExamConfig> {
  const edital = await getActiveEditalForCourse(courseId)

  if (edital) {
    return {
      bancaSlug: edital.banca?.slug ?? null,
      bancaName: edital.banca?.name ?? null,
      examFormat: edital.examFormat,
      totalQuestoes: edital.totalQuestoes ?? 120,
      duracaoMin: edital.duracaoMin ?? 240,
      hasRedacao: edital.hasRedacao,
      wrongAnnulsRight: edital.wrongAnnulsRight,
      subjects: edital.subjects.map((es) => ({
        subjectId: es.subjectId,
        subjectSlug: es.subject.slug,
        subjectName: es.subject.name,
        weight: es.weight,
        expectedQuestions: es.expectedQuestions ?? Math.round((edital.totalQuestoes ?? 120) * (es.weight / sumWeights(edital.subjects))),
        programa: es.programa,
      })),
      source: edital.isActive ? 'EDITAL_ATIVO' : 'EDITAL_ULTIMO',
      editalId: edital.id,
      editalAno: edital.ano,
    }
  }

  // Fallback: CourseSubject (sem edital cadastrado)
  const courseSubjects = await prisma.courseSubject.findMany({
    where: { courseId },
    include: { subject: true },
    orderBy: { order: 'asc' },
  })

  const totalWeight = courseSubjects.reduce((s, cs) => s + cs.weight, 0) || 1
  const totalQ = 120
  return {
    bancaSlug: null,
    bancaName: null,
    examFormat: null,
    totalQuestoes: totalQ,
    duracaoMin: 240,
    hasRedacao: false,
    wrongAnnulsRight: false,
    subjects: courseSubjects.map((cs) => ({
      subjectId: cs.subjectId,
      subjectSlug: cs.subject.slug,
      subjectName: cs.subject.name,
      weight: cs.weight,
      expectedQuestions: Math.max(1, Math.round(totalQ * (cs.weight / totalWeight))),
      programa: null,
    })),
    source: 'COURSE_DEFAULT',
    editalId: null,
    editalAno: null,
  }
}

function sumWeights(subs: { weight: number }[]) {
  return subs.reduce((s, x) => s + x.weight, 0) || 1
}

// Marca um edital como ativo (desativa os outros do mesmo curso)
export async function setEditalActive(editalId: string) {
  const edital = await prisma.edital.findUnique({ where: { id: editalId } })
  if (!edital) throw new Error('Edital não encontrado')

  await prisma.$transaction([
    prisma.edital.updateMany({
      where: { courseId: edital.courseId, isActive: true },
      data: { isActive: false },
    }),
    prisma.edital.update({ where: { id: editalId }, data: { isActive: true } }),
  ])
}
