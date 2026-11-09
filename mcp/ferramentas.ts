import { prisma } from '@/lib/prisma'
import { getActiveEditalForCourse } from '@/lib/edital-resolver'
import type { FerramentaMcp } from './protocolo'

/**
 * Ferramentas do servidor MCP — para o ADMIN analisar o conteúdo do Gabaritai
 * conversando com o Claude.
 *
 * Por que admin e não público: o banco de questões é o produto. Um MCP aberto
 * entregaria de graça o que o site vende. Este roda na máquina de quem tem a
 * DATABASE_URL, por stdio, e nunca deve ser exposto na rede.
 *
 * Todas são SÓ DE LEITURA, e nenhuma devolve dado pessoal. A de desempenho
 * devolve agregados e omite grupos com menos de 3 alunos: a "média" de um
 * aluno só é o dado daquele aluno.
 */

const MIN_ALUNOS_POR_GRUPO = 3
const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const texto = (v: unknown, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function cursoPorSlug(slug: string) {
  const curso = await prisma.course.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } })
  if (!curso) throw new Error(`Concurso "${slug}" não existe. Use listar_concursos para ver os slugs.`)
  return curso
}

export const ferramentasMcp: FerramentaMcp[] = [
  {
    nome: 'listar_concursos',
    descricao: 'Lista os concursos ativos com banca, ano do edital, número de matérias e de questões. Comece por aqui.',
    esquema: { type: 'object', properties: {}, additionalProperties: false },
    executar: async () => {
      const cursos = await prisma.course.findMany({ where: { active: true }, select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } })
      return Promise.all(cursos.map(async (c) => {
        const edital = await getActiveEditalForCourse(c.id)
        const materias = edital?.subjects.map((s) => s.subjectId) ?? []
        const questoes = materias.length ? await prisma.question.count({ where: { subjectId: { in: materias } } }) : 0
        return { slug: c.slug, concurso: c.name, banca: edital?.banca?.name ?? null, ano_edital: edital?.ano ?? null, materias: materias.length, questoes }
      }))
    },
  },
  {
    nome: 'cobertura_do_edital',
    descricao:
      'Para cada matéria do edital de um concurso: peso, quantas questões, materiais e flashcards existem, e quais ' +
      'tópicos não têm nenhuma questão. Serve para achar lacunas de conteúdo.',
    esquema: {
      type: 'object',
      properties: { concurso: { type: 'string', description: 'slug, de listar_concursos' } },
      required: ['concurso'],
      additionalProperties: false,
    },
    executar: async (args) => {
      const curso = await cursoPorSlug(texto(args.concurso))
      const edital = await getActiveEditalForCourse(curso.id)
      if (!edital?.subjects.length) return { concurso: curso.name, aviso: 'Sem edital com matérias cadastradas.' }

      const materias = await Promise.all(edital.subjects.map(async (es) => {
        const [questoes, materiais, flashcards, topicosSemQuestao] = await Promise.all([
          prisma.question.count({ where: { subjectId: es.subjectId } }),
          prisma.material.count({ where: { subjectId: es.subjectId, active: true } }),
          prisma.flashcard.count({ where: { subjectId: es.subjectId, active: true } }),
          prisma.topic.findMany({ where: { subjectId: es.subjectId, questions: { none: {} } }, select: { name: true }, take: 8 }),
        ])
        return { materia: es.subject.name, peso: es.weight, questoes, materiais, flashcards, topicos_sem_questao: topicosSemQuestao.map((t) => t.name) }
      }))

      return {
        concurso: curso.name,
        edital: `${edital.ano}${edital.banca ? ` — ${edital.banca.name}` : ''}`,
        resumo: {
          materias: materias.length,
          sem_questao: materias.filter((m) => m.questoes === 0).map((m) => m.materia),
          sem_material: materias.filter((m) => m.materiais === 0).map((m) => m.materia),
        },
        materias: materias.sort((a, b) => b.peso - a.peso),
      }
    },
  },
  {
    nome: 'buscar_questoes',
    descricao: 'Busca questões por matéria (slug), banca (slug) e/ou trecho do enunciado. Máximo 20.',
    esquema: {
      type: 'object',
      properties: {
        materia: { type: 'string' },
        banca: { type: 'string' },
        texto: { type: 'string', description: 'trecho do enunciado' },
        limite: { type: 'integer', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
    executar: async (args) => {
      const materia = texto(args.materia), banca = texto(args.banca), busca = texto(args.texto, 200)
      if (!materia && !banca && !busca) throw new Error('Informe ao menos materia, banca ou texto.')
      const questoes = await prisma.question.findMany({
        where: {
          ...(materia ? { subject: { slug: materia } } : {}),
          ...(banca ? { bancaSlug: banca } : {}),
          ...(busca ? { enunciado: { contains: busca, mode: 'insensitive' as const } } : {}),
        },
        select: { enunciado: true, gabarito: true, bancaSlug: true, subject: { select: { name: true } }, topic: { select: { name: true } } },
        take: Math.min(Math.max(Number(args.limite) || 10, 1), 20),
      })
      return questoes.map((q) => ({
        materia: q.subject?.name ?? null, topico: q.topic?.name ?? null, banca: q.bancaSlug,
        enunciado: corta(q.enunciado.replace(/\s+/g, ' '), 400), gabarito: q.gabarito,
      }))
    },
  },
  {
    nome: 'desempenho_agregado',
    descricao:
      `Acerto médio dos alunos por matéria num concurso, para ver onde a turma vai pior. Só agregados: matérias com ` +
      `menos de ${MIN_ALUNOS_POR_GRUPO} alunos são omitidas para não expor um aluno individual.`,
    esquema: {
      type: 'object',
      properties: { concurso: { type: 'string' } },
      required: ['concurso'],
      additionalProperties: false,
    },
    executar: async (args) => {
      const curso = await cursoPorSlug(texto(args.concurso))
      const grupos = await prisma.userSubjectMastery.groupBy({
        by: ['subjectId'],
        where: { courseId: curso.id, totalAttempts: { gt: 0 } },
        _count: { userId: true },
        _sum: { totalAttempts: true, correctAttempts: true },
      })
      const nomes = new Map((await prisma.subject.findMany({
        where: { id: { in: grupos.map((g) => g.subjectId) } }, select: { id: true, name: true },
      })).map((s) => [s.id, s.name]))

      const visiveis = grupos.filter((g) => g._count.userId >= MIN_ALUNOS_POR_GRUPO)
      return {
        concurso: curso.name,
        omitidas_por_privacidade: grupos.length - visiveis.length,
        materias: visiveis
          .map((g) => ({
            materia: nomes.get(g.subjectId) ?? g.subjectId,
            alunos: g._count.userId,
            tentativas: g._sum.totalAttempts ?? 0,
            acerto_medio: `${Math.round(((g._sum.correctAttempts ?? 0) / Math.max(1, g._sum.totalAttempts ?? 0)) * 100)}%`,
          }))
          .sort((a, b) => parseInt(a.acerto_medio) - parseInt(b.acerto_medio)),
      }
    },
  },
]
