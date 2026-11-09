import { prisma } from '@/lib/prisma'
import { getActiveEditalForCourse } from '@/lib/edital-resolver'

/**
 * As matérias em que a busca do mentor deve procurar, para este aluno.
 *
 * Os materiais são compartilhados entre cursos de propósito (o material de
 * Constitucional serve PF e PCDF), e ficam ligados à MATÉRIA, não ao curso.
 * Então "buscar no edital do aluno" significa: buscar só nas matérias que o
 * edital dele cobra. Sem esse filtro, um aluno de PM perguntando sobre
 * "princípios" podia receber trecho de Contabilidade Pública — matéria que a
 * prova dele não tem.
 *
 * Fonte: o edital ativo do curso principal (a mesma fonte da verdade que o
 * resto do sistema usa para banca e pesos); sem edital, as matérias do curso.
 * Sem curso, `null` — busca sem filtro, melhor que não buscar.
 */
export async function materiasDoAluno(userId: string): Promise<string[] | null> {
  const matricula = await prisma.userCourseEnrollment.findFirst({
    where: { userId, isPrimary: true, isActive: true },
    select: { courseId: true },
  })
  if (!matricula) return null

  const edital = await getActiveEditalForCourse(matricula.courseId)
  const doEdital = edital?.subjects.map((s) => s.subjectId) ?? []
  if (doEdital.length) return doEdital

  const doCurso = await prisma.courseSubject.findMany({
    where: { courseId: matricula.courseId },
    select: { subjectId: true },
  })
  return doCurso.length ? doCurso.map((c) => c.subjectId) : null
}
