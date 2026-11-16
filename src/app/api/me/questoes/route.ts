import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { lerCursor, montarCursor, type Situacao } from '@/lib/questoes-lista'
import { cadernoDoItem } from '@/lib/provas/cadernos'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/questoes
 *
 * Filtros: courseSlug, subjectId|subjectSlug, topicId, provaId, bancaSlug, ano,
 * source, difficulty, q (busca no enunciado) e `situacao`:
 *  - `nao-feitas`: só as que o aluno nunca respondeu (a aba Questões usa esta);
 *  - `erradas`: errou e ainda não acertou;
 *  - `todas` (padrão).
 *
 * Paginação por cursor de chave (createdAt, id), não por "pula N": com
 * `nao-feitas` o conjunto encolhe a cada resposta, e um cursor de posição
 * pularia questão ainda não vista. Sem curso nem matéria escolhidos, fica nas
 * matérias dos cursos em que o aluno está matriculado — era o que a opção
 * "Todos meus cursos" prometia e a rota ignorava.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const texto = (k: string) => sp.get(k)?.trim() || undefined
  const subjectSlug = texto('subjectSlug')
  const courseSlug = texto('courseSlug')
  const topicId = texto('topicId')
  const provaId = texto('provaId')
  const bancaSlug = texto('bancaSlug')
  const q = texto('q')
  const ano = Number.parseInt(sp.get('ano') ?? '', 10) || undefined
  const source = ['OFFICIAL', 'AI_GENERATED', 'ADAPTED'].includes(sp.get('source') ?? '') ? (sp.get('source') as 'OFFICIAL' | 'AI_GENERATED' | 'ADAPTED') : undefined
  const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(sp.get('difficulty') ?? '') ? (sp.get('difficulty') as 'EASY' | 'MEDIUM' | 'HARD') : undefined
  // Os nomes antigos (onlyUnanswered/onlyWrong) continuam valendo.
  const situacao: Situacao =
    sp.get('situacao') === 'nao-feitas' || sp.get('onlyUnanswered') === 'true' ? 'nao-feitas'
      : sp.get('situacao') === 'erradas' || sp.get('onlyWrong') === 'true' ? 'erradas'
        : 'todas'
  const limit = Math.min(Math.max(Number.parseInt(sp.get('limit') ?? '30', 10) || 30, 1), 100)
  const cursor = lerCursor(sp.get('cursor'))

  // Escopo de matérias: a escolhida, ou as do curso, ou as dos cursos do aluno.
  let subjectId = texto('subjectId')
  if (!subjectId && subjectSlug) {
    subjectId = (await prisma.subject.findUnique({ where: { slug: subjectSlug }, select: { id: true } }))?.id ?? '__nenhuma__'
  }
  let materiasDoEscopo: string[] | undefined
  if (!subjectId && !provaId) {
    const vinculos = await prisma.courseSubject.findMany({
      where: courseSlug
        ? { course: { slug: courseSlug } }
        : { course: { enrollments: { some: { userId: user.id, isActive: true } } } },
      select: { subjectId: true },
      distinct: ['subjectId'],
    })
    // Aluno sem matrícula vê o banco todo; curso pedido sem matéria não vê nada.
    if (vinculos.length > 0 || courseSlug) materiasDoEscopo = vinculos.map((v) => v.subjectId)
  }

  const filtro: any = {
    active: true,
    anulada: false,
    ...(subjectId ? { subjectId } : materiasDoEscopo ? { subjectId: { in: materiasDoEscopo } } : {}),
    ...(topicId && { topicId }),
    ...(provaId && { provaId }),
    ...(bancaSlug && { bancaSlug }),
    ...(ano && { ano }),
    ...(source && { source }),
    ...(difficulty && { difficulty }),
  }
  // Condições compostas vão num AND: o cursor da página usa o OR de cima.
  const e: any[] = []
  if (q) e.push({ OR: [{ enunciado: { contains: q, mode: 'insensitive' } }, { tags: { has: q.toLowerCase() } }] })
  // Viram NOT EXISTS / EXISTS no SQL: nada de carregar o histórico inteiro do
  // aluno para montar um `id NOT IN (...)` com milhares de ids.
  if (situacao === 'nao-feitas') e.push({ attempts: { none: { userId: user.id } } })
  if (situacao === 'erradas') {
    e.push({ attempts: { some: { userId: user.id, correct: false } } }, { attempts: { none: { userId: user.id, correct: true } } })
  }
  if (e.length > 0) filtro.AND = e

  const pagina = cursor
    ? { ...filtro, OR: [{ createdAt: { lt: cursor.em } }, { createdAt: cursor.em, id: { gt: cursor.id } }] }
    : filtro

  // Lista e total não dependem um do outro.
  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: pagina,
      select: {
        // Gabarito e explicação NÃO vão na lista: chegam só depois de responder
        // (rota /attempt). Antes iam aqui e ficavam visíveis na aba de rede.
        id: true,
        enunciado: true,
        alternativas: true,
        bancaSlug: true,
        ano: true,
        orgao: true,
        difficulty: true,
        source: true,
        createdAt: true,
        subject: { select: { id: true, slug: true, name: true } },
        topic: { select: { id: true, name: true } },
        prova: { select: { id: true, titulo: true, pdfUrl: true, fonte: true } },
        numeroQuestao: true,
        // Item de prova oficial: sem o comando e o texto-base ele não se responde.
        comando: true,
        temFigura: true,
        temFormula: true,
        paginaProva: true,
        provaTexto: { select: { titulo: true, conteudo: true } },
      },
      // createdAt empata em lote importado; o id desempata e mantém os itens
      // de uma mesma prova na ordem da prova.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    }),
    prisma.question.count({ where: filtro }),
  ])

  const temMais = questions.length > limit
  const dados = temMais ? questions.slice(0, limit) : questions
  const ultima = dados[dados.length - 1]

  return NextResponse.json({
    // A fonte inteira não viaja com cada questão: só o caderno do item.
    questions: dados.map(({ createdAt, numeroQuestao, prova, ...resto }) => ({
      ...resto,
      prova: prova ? { id: prova.id, titulo: prova.titulo, pdfUrl: cadernoDoItem(prova.fonte, numeroQuestao) ?? prova.pdfUrl } : null,
    })),
    nextCursor: temMais && ultima ? montarCursor(ultima.createdAt, ultima.id) : null,
    total,
    situacao,
  })
}
