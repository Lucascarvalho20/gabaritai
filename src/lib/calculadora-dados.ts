/**
 * O que a calculadora do aluno carrega do banco (as contas ficam em
 * calculadora.ts e tempo-estudo.ts).
 *
 *  - cursosDoAluno: os cursos que o aluno TEM (a mesma régua de acesso do resto
 *    do site — plano pago, teste de 7 dias, cortesia), cada um com a estimativa
 *    do edital ativo e o aviso de edital mais novo ainda em revisão.
 *  - referenciasDaPlataforma: quanto um tópico de cada matéria leva aqui, para
 *    a suposição do edital em PDF.
 */
import { prisma } from './prisma'
import { getUserPlanLimits, hasAccessToCourse } from './plan-access'
import { getUserContentMode } from './trial-content'
import { estimativasDosConcursos, type ConcursoComEstimativa } from './tempo-estudo-dados'
import { referenciasPorTopico, type ReferenciaMateria } from './calculadora'

export type CursoDaCalculadora = ConcursoComEstimativa & {
  principal: boolean
  /** O robô de editais achou um edital mais novo, que a equipe ainda está revisando. */
  editalNovoEmRevisao: { ano: number; titulo: string } | null
}

/** Plano pago, teste de 7 dias e cortesia usam o conteúdo do curso; o gratuito, só o PDF. */
export async function modoDaCalculadora(userId: string): Promise<'pago' | 'gratuito'> {
  const modo = await getUserContentMode(userId)
  return modo === 'FULL_ACCESS' || modo === 'TRIAL_RESUMOS' ? 'pago' : 'gratuito'
}

export async function cursosDoAluno(userId: string): Promise<CursoDaCalculadora[]> {
  const [limites, matriculas] = await Promise.all([
    getUserPlanLimits(userId),
    prisma.userCourseEnrollment.findMany({ where: { userId, isActive: true }, select: { courseId: true, isPrimary: true } }),
  ])
  const comAcesso = (
    await Promise.all(matriculas.map(async (m) => ((await hasAccessToCourse(userId, m.courseId)) ? m : null)))
  ).filter((m): m is (typeof matriculas)[number] => !!m)
  const principal = new Set(comAcesso.filter((m) => m.isPrimary).map((m) => m.courseId))

  const todos = await estimativasDosConcursos()
  // Admin e cortesia sem matrícula nenhuma: "têm todos os cursos" — é o que dá para testar.
  const meus = comAcesso.length || !limites.isBypassed
    ? todos.filter((c) => comAcesso.some((m) => m.courseId === c.courseId))
    : todos
  if (!meus.length) return []

  const maisNovos = await prisma.edital.findMany({
    where: { courseId: { in: meus.map((c) => c.courseId) }, isActive: false },
    select: { courseId: true, ano: true, titulo: true },
    orderBy: { ano: 'desc' },
  })
  return meus
    .map((c) => {
      const novo = maisNovos.find((e) => e.courseId === c.courseId && e.ano > c.edital.ano)
      return { ...c, principal: principal.has(c.courseId), editalNovoEmRevisao: novo ? { ano: novo.ano, titulo: novo.titulo } : null }
    })
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

const MEMORIA_MS = 10 * 60_000
let memoria: { em: number; refs: { porMateria: ReferenciaMateria[]; geral: number | null } } | null = null

/** Muda devagar (conteúdo novo, tentativas novas): guardada por 10 minutos. */
export async function referenciasDaPlataforma(): Promise<{ porMateria: ReferenciaMateria[]; geral: number | null }> {
  if (!memoria || Date.now() - memoria.em > MEMORIA_MS) {
    const concursos = await estimativasDosConcursos()
    memoria = { em: Date.now(), refs: referenciasPorTopico(concursos.map((c) => c.estimativa)) }
  }
  return memoria.refs
}
