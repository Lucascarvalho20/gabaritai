/**
 * Provas anteriores do ponto de vista do aluno: listar, ler com gabarito, fazer
 * com cronômetro, entregar e ver o resultado. As rotas em /api/me/provas só
 * repassam para cá — aqui fica a regra, testável contra um banco de verdade.
 *
 * Regras que importam:
 *  - Só quem tem o curso acessa (hasAccessToCourse).
 *  - Durante a prova o gabarito NUNCA vai para o navegador; a correção é no servidor.
 *  - Cada tentativa fica guardada: é o histórico que mostra a evolução.
 *  - As respostas são salvas enquanto o aluno marca; recarregar a página não perde nada.
 *  - O prazo é do servidor. Depois dele há 2 minutos de tolerância (rede lenta);
 *    passou disso, valem as respostas que já estavam salvas.
 */
import { prisma } from '../prisma'
import { hasAccessToCourse } from '../plan-access'
import { corrigir, materiasEmBranco, normalizarResposta, prioridadesDeRevisao, type DesempenhoMateria } from './correcao'
import { cadernoDoItem } from './cadernos'

export const TOLERANCIA_MS = 2 * 60_000

export class ErroProva extends Error {
  status: number
  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.status = status
  }
}

async function provaComAcesso(userId: string, provaId: string) {
  const prova = await prisma.prova.findUnique({
    where: { id: provaId },
    select: {
      id: true, slug: true, titulo: true, ano: true, cargo: true, courseId: true, duracaoMin: true,
      incluiaDiscursiva: true, examFormat: true, wrongAnnulsRight: true, fonte: true, pdfUrl: true,
      banca: { select: { name: true } }, course: { select: { slug: true, name: true } },
    },
  })
  if (!prova) throw new ErroProva('Prova não encontrada.', 404)
  if (!prova.courseId || !(await hasAccessToCourse(userId, prova.courseId))) {
    throw new ErroProva('As provas anteriores fazem parte do curso. Assine para liberar.', 403)
  }
  return prova
}

function cabecalho(p: Awaited<ReturnType<typeof provaComAcesso>>) {
  return {
    id: p.id, titulo: p.titulo, ano: p.ano, cargo: p.cargo, banca: p.banca?.name ?? null, curso: p.course,
    duracaoMin: p.duracaoMin, incluiaDiscursiva: p.incluiaDiscursiva, formato: p.examFormat,
    erradaAnulaCerta: p.wrongAnnulsRight, fonte: p.fonte, caderno: p.pdfUrl,
  }
}

const ITEM_SELECT = {
  id: true, numeroQuestao: true, enunciado: true, comando: true, alternativas: true, temFigura: true, temFormula: true,
  paginaProva: true, anulada: true, provaTextoId: true, subject: { select: { name: true } },
} as const

async function itensETextos(provaId: string, fonte: unknown) {
  const [itens, textos] = await Promise.all([
    prisma.question.findMany({ where: { provaId, active: true }, orderBy: { numeroQuestao: 'asc' }, select: ITEM_SELECT }),
    prisma.provaTexto.findMany({ where: { provaId }, orderBy: { ordem: 'asc' }, select: { id: true, codigo: true, titulo: true, conteudo: true } }),
  ])
  return {
    textos,
    itens: itens.map((q) => ({
      id: q.id, numero: q.numeroQuestao, materia: q.subject?.name ?? null, comando: q.comando, enunciado: q.enunciado,
      alternativas: q.alternativas, textoId: q.provaTextoId, figura: q.temFigura, formula: q.temFormula, pagina: q.paginaProva,
      anulada: q.anulada, caderno: cadernoDoItem(fonte, q.numeroQuestao),
    })),
  }
}

/** Lista as provas do curso, com as tentativas do aluno. Sem acesso, lista com cadeado. */
export async function provasDoCurso(userId: string, courseSlug: string) {
  const curso = await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true, slug: true, name: true } })
  if (!curso) throw new ErroProva('Curso não encontrado.', 404)
  const acesso = await hasAccessToCourse(userId, curso.id)
  const provas = await prisma.prova.findMany({
    where: { courseId: curso.id, questions: { some: { active: true } } },
    orderBy: [{ ano: 'desc' }, { titulo: 'asc' }],
    select: {
      id: true, titulo: true, ano: true, cargo: true, duracaoMin: true, incluiaDiscursiva: true, examFormat: true,
      banca: { select: { name: true } }, _count: { select: { questions: { where: { active: true } } } },
      tentativas: {
        where: { userId },
        orderBy: { iniciadaEm: 'desc' },
        select: { id: true, status: true, pontos: true, pontosMax: true, iniciadaEm: true, entregueEm: true, expiraEm: true },
      },
    },
  })
  return {
    curso, acesso,
    provas: provas.map((p) => {
      const entregues = p.tentativas.filter((t) => t.status !== 'EM_ANDAMENTO')
      const emAndamento = p.tentativas.find((t) => t.status === 'EM_ANDAMENTO' && t.expiraEm.getTime() + TOLERANCIA_MS > Date.now())
      return {
        id: p.id, titulo: p.titulo, ano: p.ano, cargo: p.cargo, banca: p.banca?.name ?? null, itens: p._count.questions,
        duracaoMin: p.duracaoMin, incluiaDiscursiva: p.incluiaDiscursiva, formato: p.examFormat,
        emAndamento: emAndamento?.id ?? null,
        tentativas: entregues.map((t) => ({ id: t.id, pontos: t.pontos, pontosMax: t.pontosMax, entregueEm: t.entregueEm ?? t.expiraEm })),
        melhor: entregues.length ? Math.max(...entregues.map((t) => t.pontos)) : null,
      }
    }),
  }
}

/** Modo leitura: a prova inteira com o gabarito oficial. */
export async function gabaritoDaProva(userId: string, provaId: string) {
  const prova = await provaComAcesso(userId, provaId)
  const { textos, itens } = await itensETextos(provaId, prova.fonte)
  const oficiais = await prisma.question.findMany({
    where: { provaId, active: true }, select: { id: true, gabaritoOficial: true, gabarito: true, explicacao: true },
  })
  const resp = new Map(oficiais.map((q) => [q.id, q]))
  return {
    prova: cabecalho(prova), textos,
    itens: itens.map((i) => ({ ...i, gabarito: i.anulada ? null : (resp.get(i.id)?.gabaritoOficial ?? resp.get(i.id)?.gabarito ?? null), explicacao: resp.get(i.id)?.explicacao || null })),
  }
}

/**
 * Começa (ou retoma) a prova. Uma tentativa em andamento por prova: se ainda
 * está no prazo, volta para ela com as respostas salvas; se o prazo passou,
 * ela é entregue como EXPIRADA e uma nova começa.
 */
export async function iniciarTentativa(userId: string, provaId: string) {
  const prova = await provaComAcesso(userId, provaId)
  // A que venceu o prazo é entregue antes (fora da transação abaixo).
  const vencida = await prisma.provaTentativa.findFirst({
    where: { userId, provaId, status: 'EM_ANDAMENTO', expiraEm: { lt: new Date(Date.now() - TOLERANCIA_MS) } },
    select: { id: true },
  })
  if (vencida) await entregarTentativa(userId, vencida.id, {})

  // Abrir a prova duas vezes ao mesmo tempo (duplo clique, duas abas, o React
  // montando a tela duas vezes) criava DUAS tentativas. A trava do Postgres
  // por aluno+prova faz a segunda chamada esperar e achar a que a primeira criou.
  const { tentativa, nova } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`prova:${userId}:${provaId}`}))`
    const aberta = await tx.provaTentativa.findFirst({
      where: { userId, provaId, status: 'EM_ANDAMENTO' }, orderBy: { iniciadaEm: 'desc' },
    })
    if (aberta) return { tentativa: aberta, nova: false }
    const duracaoMin = prova.duracaoMin ?? 240
    const agora = new Date()
    const criada = await tx.provaTentativa.create({
      data: { userId, provaId, duracaoMin, iniciadaEm: agora, expiraEm: new Date(agora.getTime() + duracaoMin * 60_000) },
    })
    return { tentativa: criada, nova: true }
  })
  const { textos, itens } = await itensETextos(provaId, prova.fonte)
  return {
    agora: new Date().toISOString(),
    retomada: !nova,
    tentativa: { id: tentativa.id, iniciadaEm: tentativa.iniciadaEm, expiraEm: tentativa.expiraEm, duracaoMin: tentativa.duracaoMin, respostas: tentativa.respostas },
    prova: cabecalho(prova), textos, itens,
  }
}

async function tentativaDoAluno(userId: string, tentativaId: string) {
  const t = await prisma.provaTentativa.findUnique({ where: { id: tentativaId } })
  if (!t || t.userId !== userId) throw new ErroProva('Tentativa não encontrada.', 404)
  return t
}

/** Só aceita alternativas válidas e de itens desta prova. */
async function limparRespostas(provaId: string, respostas: unknown): Promise<Record<string, string>> {
  if (!respostas || typeof respostas !== 'object') return {}
  const ids = new Set((await prisma.question.findMany({ where: { provaId, active: true }, select: { id: true } })).map((q) => q.id))
  const out: Record<string, string> = {}
  for (const [id, r] of Object.entries(respostas as Record<string, unknown>)) {
    const v = normalizarResposta(r)
    if (ids.has(id) && v) out[id] = v
  }
  return out
}

/** Salva as respostas enquanto o aluno marca. */
export async function salvarRespostas(userId: string, tentativaId: string, respostas: unknown) {
  const t = await tentativaDoAluno(userId, tentativaId)
  if (t.status !== 'EM_ANDAMENTO') throw new ErroProva('Esta tentativa já foi entregue.', 409)
  if (Date.now() > t.expiraEm.getTime() + TOLERANCIA_MS) throw new ErroProva('O tempo da prova acabou.', 409)
  const limpas = await limparRespostas(t.provaId, respostas)
  await prisma.provaTentativa.update({ where: { id: t.id }, data: { respostas: limpas } })
  return { salvas: Object.keys(limpas).length }
}

/**
 * Entrega e corrige. Idempotente: entregar duas vezes devolve o mesmo resultado.
 * Fora do prazo (+ tolerância), as respostas enviadas agora são ignoradas e
 * valem as que já estavam salvas.
 */
export async function entregarTentativa(userId: string, tentativaId: string, corpo: { respostas?: unknown; tempoMs?: number }) {
  const t = await tentativaDoAluno(userId, tentativaId)
  if (t.status !== 'EM_ANDAMENTO') return { id: t.id, jaEntregue: true }

  const agora = new Date()
  const noPrazo = agora.getTime() <= t.expiraEm.getTime() + TOLERANCIA_MS
  const respostas = noPrazo && corpo.respostas !== undefined
    ? await limparRespostas(t.provaId, corpo.respostas)
    : (t.respostas as Record<string, string>)

  const prova = await prisma.prova.findUnique({ where: { id: t.provaId }, select: { wrongAnnulsRight: true, courseId: true } })
  const itens = await prisma.question.findMany({
    where: { provaId: t.provaId, active: true },
    select: { id: true, gabarito: true, gabaritoOficial: true, anulada: true, subjectId: true, subject: { select: { name: true } } },
  })
  const r = corrigir(
    itens.map((q) => ({ id: q.id, gabarito: q.anulada ? null : (q.gabaritoOficial ?? q.gabarito), anulada: q.anulada, materia: q.subject?.name ?? null })),
    respostas,
    Boolean(prova?.wrongAnnulsRight),
  )

  // Fecha a tentativa só se ninguém fechou antes (duas abas entregando juntas).
  const fechou = await prisma.provaTentativa.updateMany({
    where: { id: t.id, status: 'EM_ANDAMENTO' },
    data: {
      status: noPrazo ? 'ENTREGUE' : 'EXPIRADA', entregueEm: agora, respostas,
      acertos: r.acertos, erros: r.erros, brancos: r.brancos, anuladas: r.anuladas,
      pontos: r.pontos, pontosMax: r.pontosMax, porMateria: r.porMateria as object[],
      tempoMs: Math.min(agora.getTime() - t.iniciadaEm.getTime(), t.duracaoMin * 60_000 + TOLERANCIA_MS),
    },
  })
  if (fechou.count === 0) return { id: t.id, jaEntregue: true }

  // O resultado alimenta o resto da plataforma: histórico de questões (agente,
  // "erros recentes") e o domínio por matéria (cronograma adaptativo).
  const respondidas = r.itens.filter((i) => i.situacao === 'certo' || i.situacao === 'errado')
  if (respondidas.length) {
    await prisma.questionAttempt.createMany({
      data: respondidas.map((i) => ({ userId, questionId: i.id, selected: i.resposta!, correct: i.situacao === 'certo' })),
    })
  }
  if (prova?.courseId) {
    const porSubject = new Map<string, { total: number; certos: number }>()
    const subjectDe = new Map(itens.map((q) => [q.id, q.subjectId]))
    for (const i of respondidas) {
      const s = subjectDe.get(i.id)
      if (!s) continue
      const c = porSubject.get(s) ?? { total: 0, certos: 0 }
      c.total++
      if (i.situacao === 'certo') c.certos++
      porSubject.set(s, c)
    }
    for (const [subjectId, c] of porSubject) {
      const chave = { userId_courseId_subjectId: { userId, courseId: prova.courseId, subjectId } }
      const atual = await prisma.userSubjectMastery.findUnique({ where: chave, select: { totalAttempts: true, correctAttempts: true } })
      const total = (atual?.totalAttempts ?? 0) + c.total
      const certos = (atual?.correctAttempts ?? 0) + c.certos
      const masteryScore = +((certos / total) * 100).toFixed(2)
      await prisma.userSubjectMastery.upsert({
        where: chave,
        update: { totalAttempts: total, correctAttempts: certos, masteryScore, lastAttemptAt: agora },
        create: { userId, courseId: prova.courseId, subjectId, totalAttempts: total, correctAttempts: certos, masteryScore, lastAttemptAt: agora },
      })
    }
  }
  return { id: t.id, jaEntregue: false }
}

/** Resultado de uma tentativa entregue, com a revisão item a item. */
export async function resultadoDaTentativa(userId: string, tentativaId: string) {
  const t = await tentativaDoAluno(userId, tentativaId)
  if (t.status === 'EM_ANDAMENTO') throw new ErroProva('Esta tentativa ainda não foi entregue.', 409)
  const gab = await gabaritoDaProva(userId, t.provaId)
  const respostas = t.respostas as Record<string, string>
  const anterior = await prisma.provaTentativa.findFirst({
    where: { userId, provaId: t.provaId, status: { not: 'EM_ANDAMENTO' }, iniciadaEm: { lt: t.iniciadaEm } },
    orderBy: { iniciadaEm: 'desc' }, select: { pontos: true, pontosMax: true, porMateria: true },
  })
  const porMateria = (t.porMateria as DesempenhoMateria[]) ?? []
  return {
    prova: gab.prova, textos: gab.textos,
    tentativa: {
      id: t.id, status: t.status, iniciadaEm: t.iniciadaEm, entregueEm: t.entregueEm, tempoMs: t.tempoMs, duracaoMin: t.duracaoMin,
      acertos: t.acertos, erros: t.erros, brancos: t.brancos, anuladas: t.anuladas, pontos: t.pontos, pontosMax: t.pontosMax,
      porMateria, revisar: prioridadesDeRevisao(porMateria), emBranco: materiasEmBranco(porMateria),
    },
    anterior: anterior ? { pontos: anterior.pontos, pontosMax: anterior.pontosMax } : null,
    itens: gab.itens.map((i) => {
      const resposta = respostas[i.id] ?? null
      const situacao = i.anulada ? 'anulada' : !resposta ? 'branco' : resposta === i.gabarito ? 'certo' : 'errado'
      return { ...i, resposta, situacao }
    }),
  }
}

/**
 * Desempenho do aluno nas provas do curso, somando todas as tentativas
 * entregues: onde ele vai mal de forma consistente, não num dia ruim.
 */
export async function desempenhoEmProvas(userId: string, courseSlug: string) {
  const tentativas = await prisma.provaTentativa.findMany({
    where: { userId, status: { not: 'EM_ANDAMENTO' }, prova: { course: { slug: courseSlug } } },
    orderBy: { iniciadaEm: 'asc' },
    select: { id: true, provaId: true, pontos: true, pontosMax: true, entregueEm: true, porMateria: true, prova: { select: { titulo: true } } },
  })
  const soma = new Map<string, DesempenhoMateria>()
  for (const t of tentativas) {
    for (const m of (t.porMateria as DesempenhoMateria[]) ?? []) {
      const s = soma.get(m.materia) ?? { materia: m.materia, total: 0, acertos: 0, erros: 0, brancos: 0, anuladas: 0, pontos: 0, percentual: 0 }
      s.total += m.total; s.acertos += m.acertos; s.erros += m.erros; s.brancos += m.brancos; s.anuladas += m.anuladas; s.pontos += m.pontos
      soma.set(m.materia, s)
    }
  }
  const materias = [...soma.values()].map((m) => ({ ...m, percentual: m.total ? Math.round((m.pontos / m.total) * 1000) / 1000 : 0 }))
  return {
    tentativas: tentativas.map((t) => ({ id: t.id, prova: t.prova.titulo, pontos: t.pontos, pontosMax: t.pontosMax, entregueEm: t.entregueEm })),
    materias: materias.sort((a, b) => a.percentual - b.percentual),
    revisar: prioridadesDeRevisao(materias),
  }
}
