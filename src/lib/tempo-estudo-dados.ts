/**
 * Carrega do banco o que a estimativa de tempo precisa (tempo-estudo.ts):
 * os tópicos de cada matéria, o tamanho do material de cada tópico, quantas
 * questões ativas existem e quanto tempo os alunos levam de verdade por questão.
 *
 * Tudo em 4 consultas agregadas, para QUALQUER número de editais — a lista
 * pública da home calcula todos os concursos de uma vez, sem uma consulta por
 * edital (o problema N+1).
 */
import { prisma } from './prisma'
import {
  estimarEdital,
  type EstimativaEdital, type MateriaConteudo, type TempoQuestao, type TopicoConteudo,
} from './tempo-estudo'

/** Tentativas fora desta faixa não entram na mediana: abaixo é chute; acima, questão esquecida aberta. */
export const TEMPO_QUESTAO_MIN_MS = 5_000
export const TEMPO_QUESTAO_MAX_MS = 15 * 60_000

type MateriaDoEdital = { id: string; nome: string; peso: number }

export async function carregarConteudo(materiasPorEdital: Map<string, MateriaDoEdital[]>): Promise<{
  porEdital: Map<string, MateriaConteudo[]>
  tempoQuestaoGeral: TempoQuestao | null
}> {
  const subjectIds = [...new Set([...materiasPorEdital.values()].flat().map((m) => m.id))]
  if (!subjectIds.length) return { porEdital: new Map(), tempoQuestaoGeral: null }

  const [topicos, materiais, questoes, tempos, [geral]] = await Promise.all([
    // Os mesmos tópicos que o aluno vê na página do curso.
    prisma.topic.findMany({
      where: { subjectId: { in: subjectIds }, archivedAt: null },
      select: { id: true, subjectId: true },
    }),
    // Um material por tópico: o texto completo (TEXTO) antes do resumo, o
    // publicado antes do rascunho, o mais novo antes do antigo. Rascunho mede
    // o TAMANHO do conteúdo; o publicado conta à parte, na cobertura.
    // Palavras = sequências sem espaço que não são só marcação (#, *, |, -).
    prisma.$queryRaw<Array<{ topicId: string; palavras: number; publicado: boolean }>>`
      SELECT DISTINCT ON (m."topicId")
        m."topicId" AS "topicId",
        (m.status = 'PUBLISHED') AS publicado,
        (SELECT count(*) FROM regexp_matches(m.content, '[^[:space:]#*|>_~=+—–-]+', 'g'))::int AS palavras
      FROM materials m
      JOIN topics t ON t.id = m."topicId"
      WHERE t."subjectId" = ANY(${subjectIds}::text[])
        AND t."archivedAt" IS NULL
        AND m.active = true
        AND m.status IN ('PUBLISHED', 'REVIEWED', 'DRAFT')
        AND m.content IS NOT NULL
      ORDER BY m."topicId",
        (m.type = 'TEXTO') DESC,
        CASE m.status WHEN 'PUBLISHED' THEN 0 WHEN 'REVIEWED' THEN 1 ELSE 2 END,
        m."updatedAt" DESC`,
    prisma.question.groupBy({
      by: ['subjectId'],
      where: { subjectId: { in: subjectIds }, active: true, anulada: false },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ subjectId: string; medianaMs: number; amostras: number }>>`
      SELECT q."subjectId" AS "subjectId",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY qa."timeMs") AS "medianaMs",
        count(*)::int AS amostras
      FROM question_attempts qa
      JOIN questions q ON q.id = qa."questionId"
      WHERE q."subjectId" = ANY(${subjectIds}::text[])
        AND qa."timeMs" BETWEEN ${TEMPO_QUESTAO_MIN_MS} AND ${TEMPO_QUESTAO_MAX_MS}
      GROUP BY q."subjectId"`,
    // Reserva para matéria com poucas tentativas: o tempo por questão na plataforma toda.
    prisma.$queryRaw<Array<{ medianaMs: number | null; amostras: number }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "timeMs") AS "medianaMs", count(*)::int AS amostras
      FROM question_attempts
      WHERE "timeMs" BETWEEN ${TEMPO_QUESTAO_MIN_MS} AND ${TEMPO_QUESTAO_MAX_MS}`,
  ])

  const materialDoTopico = new Map(materiais.map((m) => [m.topicId, m]))
  const topicosDaMateria = new Map<string, TopicoConteudo[]>()
  for (const t of topicos) {
    const m = materialDoTopico.get(t.id)
    const lista = topicosDaMateria.get(t.subjectId) ?? []
    // Material publicado sem nenhuma palavra (só marcação) não é conteúdo: nem mede, nem conta como publicado.
    const temTexto = m != null && m.palavras > 0
    lista.push({ id: t.id, palavras: temTexto ? m.palavras : null, publicado: temTexto && m.publicado })
    topicosDaMateria.set(t.subjectId, lista)
  }
  const questoesDaMateria = new Map(questoes.map((q) => [q.subjectId, q._count._all]))
  const tempoDaMateria = new Map(tempos.map((t) => [t.subjectId, { medianaMs: Number(t.medianaMs), amostras: t.amostras }]))

  const porEdital = new Map<string, MateriaConteudo[]>()
  for (const [editalId, materias] of materiasPorEdital) {
    porEdital.set(editalId, materias.map((m) => ({
      ...m,
      topicos: topicosDaMateria.get(m.id) ?? [],
      questoes: questoesDaMateria.get(m.id) ?? 0,
      tempoQuestao: tempoDaMateria.get(m.id) ?? null,
    })))
  }
  return {
    porEdital,
    tempoQuestaoGeral: geral?.medianaMs != null ? { medianaMs: Number(geral.medianaMs), amostras: geral.amostras } : null,
  }
}

/** Estimativa de um edital — usada pelo cronograma do aluno. */
export async function estimativaDoEdital(editalId: string): Promise<EstimativaEdital | null> {
  const subjects = await prisma.editalSubject.findMany({
    where: { editalId },
    select: { subjectId: true, weight: true, subject: { select: { name: true } } },
  })
  if (!subjects.length) return null
  const { porEdital, tempoQuestaoGeral } = await carregarConteudo(
    new Map([[editalId, subjects.map((s) => ({ id: s.subjectId, nome: s.subject.name, peso: s.weight }))]]),
  )
  return estimarEdital(porEdital.get(editalId)!, tempoQuestaoGeral)
}

export type ConcursoComEstimativa = {
  slug: string
  nome: string
  edital: { titulo: string; ano: number; banca: string | null; dataProva: string | null }
  estimativa: EstimativaEdital
}

/** Todos os concursos com edital ativo, cada um com a estimativa do seu conteúdo. */
export async function estimativasDosConcursos(): Promise<ConcursoComEstimativa[]> {
  const editais = await prisma.edital.findMany({
    where: { isActive: true, course: { active: true } },
    orderBy: [{ ano: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true, titulo: true, ano: true, dataProva: true,
      banca: { select: { name: true } },
      course: { select: { id: true, slug: true, name: true } },
      subjects: { orderBy: { order: 'asc' }, select: { subjectId: true, weight: true, subject: { select: { name: true } } } },
    },
  })
  // Um edital por curso — o mais recente, a mesma regra de getActiveEditalForCourse.
  const vistos = new Set<string>()
  const unicos = editais.filter((e) => e.subjects.length > 0 && !vistos.has(e.course.id) && vistos.add(e.course.id))

  const { porEdital, tempoQuestaoGeral } = await carregarConteudo(new Map(unicos.map((e) => [
    e.id, e.subjects.map((s) => ({ id: s.subjectId, nome: s.subject.name, peso: s.weight })),
  ])))

  return unicos
    .map((e) => ({
      slug: e.course.slug,
      nome: e.course.name,
      edital: { titulo: e.titulo, ano: e.ano, banca: e.banca?.name ?? null, dataProva: e.dataProva?.toISOString() ?? null },
      estimativa: estimarEdital(porEdital.get(e.id)!, tempoQuestaoGeral),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
