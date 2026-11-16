/**
 * Importa uma prova oficial (data/provas/<slug>.json) para o banco.
 *
 * Pode rodar de novo sem duplicar nada: a prova é achada pelo slug e cada item
 * tem id fixo (`<slug>-001`). Reimportar ATUALIZA o texto e o gabarito, mas não
 * apaga o comentário (explicacao) que já tenha sido escrito para o item, nem as
 * tentativas dos alunos. Item que saiu do arquivo é desativado, não apagado:
 * as respostas antigas apontam para ele.
 *
 * As questões entram num INSERT só (ON CONFLICT DO UPDATE): 120 itens em uma
 * ida ao banco, e não 120.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { alternativasDoFormato, problemasDaProva, type ProvaArquivo } from './arquivo'

export type ResumoImportacao = {
  slug: string
  provaId: string
  itens: number
  anulados: number
  textos: number
  materiasCriadas: string[]
}

export const idDoItem = (slug: string, numero: number) => `${slug}-${String(numero).padStart(3, '0')}`

function slugify(nome: string) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function importarProva(arq: ProvaArquivo): Promise<ResumoImportacao> {
  const problemas = problemasDaProva(arq)
  if (problemas.length) throw new Error(`Arquivo ${arq.slug} com problemas: ${problemas.slice(0, 5).join('; ')}`)

  const curso = await prisma.course.findUnique({ where: { slug: arq.curso }, select: { id: true } })
  if (!curso) throw new Error(`O curso ${arq.curso} não existe no banco.`)
  const banca = await prisma.banca.findUnique({ where: { slug: arq.banca }, select: { id: true } })

  // Matérias pelo nome; a que não existir é criada (ex.: Química, na prova de Papiloscopista).
  // O slug indicado no arquivo (materiasSlug) vence: é a matéria do curso.
  const nomes = [...new Set(arq.itens.map((i) => i.materia))]
  const slugDe = (nome: string) => arq.materiasSlug?.[nome] ?? null
  const achadas = await prisma.subject.findMany({
    where: { OR: [{ name: { in: nomes } }, { slug: { in: nomes.map((n) => slugDe(n) ?? slugify(n)) } }] },
    select: { id: true, name: true, slug: true },
  })
  const materiaId = new Map<string, string>()
  for (const nome of nomes) {
    const s = slugDe(nome)
      ? achadas.find((x) => x.slug === slugDe(nome))
      : achadas.find((x) => x.name === nome) ?? achadas.find((x) => x.slug === slugify(nome))
    if (s) materiaId.set(nome, s.id)
  }
  const criadas: string[] = []
  for (const nome of nomes.filter((n) => !materiaId.has(n))) {
    const s = await prisma.subject.create({ data: { name: nome, slug: slugDe(nome) ?? slugify(nome) } })
    materiaId.set(nome, s.id)
    criadas.push(nome)
  }

  const dadosProva = {
    courseId: curso.id,
    bancaId: banca?.id ?? null,
    ano: arq.ano,
    titulo: arq.titulo,
    cargo: arq.cargo,
    pdfUrl: arq.fonte.caderno,
    gabaritoUrl: arq.fonte.gabarito,
    appliedAt: arq.aplicadaEm ? new Date(`${arq.aplicadaEm}T12:00:00Z`) : null,
    duracaoMin: arq.duracaoMin,
    incluiaDiscursiva: arq.incluiaDiscursiva,
    examFormat: arq.formato,
    wrongAnnulsRight: arq.erradaAnulaCerta,
    fonte: arq.fonte as unknown as Prisma.InputJsonValue,
  }
  const prova = await prisma.prova.upsert({
    where: { slug: arq.slug },
    create: { slug: arq.slug, ...dadosProva },
    update: dadosProva,
    select: { id: true },
  })

  const textoId = new Map<string, string>()
  for (const [ordem, t] of arq.textos.entries()) {
    const r = await prisma.provaTexto.upsert({
      where: { provaId_codigo: { provaId: prova.id, codigo: t.codigo } },
      create: { provaId: prova.id, codigo: t.codigo, titulo: t.titulo, conteudo: t.conteudo, ordem },
      update: { titulo: t.titulo, conteudo: t.conteudo, ordem },
      select: { id: true },
    })
    textoId.set(t.codigo, r.id)
  }
  await prisma.provaTexto.deleteMany({ where: { provaId: prova.id, codigo: { notIn: arq.textos.map((t) => t.codigo) } } })

  const padrao = alternativasDoFormato(arq.formato)
  const ids = arq.itens.map((i) => idDoItem(arq.slug, i.numero))
  const linhas = arq.itens.map((i, k) => Prisma.sql`(
    ${ids[k]}, ${prova.id}, ${materiaId.get(i.materia)!}, ${arq.banca}, ${arq.orgao}, ${arq.ano}, ${i.numero},
    'MEDIUM'::"Difficulty", 'OFFICIAL'::"QuestionSource", ${i.enunciado}, ${JSON.stringify(i.alternativas ?? padrao)}::jsonb,
    ${i.gabarito ?? ''}, ${i.gabarito}, ${i.anulada}, '', ${[`prova:${arq.slug}`]}::text[], true,
    ${i.comando}, ${i.texto ? textoId.get(i.texto) ?? null : null}, ${i.figura}, ${i.formula}, ${i.pagina}
  )`)
  await prisma.$executeRaw`
    INSERT INTO questions (id, "provaId", "subjectId", "bancaSlug", orgao, ano, "numeroQuestao",
      difficulty, source, enunciado, alternativas, gabarito, "gabaritoOficial", anulada, explicacao, tags, active,
      comando, "provaTextoId", "temFigura", "temFormula", "paginaProva")
    VALUES ${Prisma.join(linhas)}
    ON CONFLICT (id) DO UPDATE SET
      "provaId" = EXCLUDED."provaId", "subjectId" = EXCLUDED."subjectId", "bancaSlug" = EXCLUDED."bancaSlug",
      orgao = EXCLUDED.orgao, ano = EXCLUDED.ano, "numeroQuestao" = EXCLUDED."numeroQuestao",
      source = EXCLUDED.source, enunciado = EXCLUDED.enunciado, alternativas = EXCLUDED.alternativas,
      gabarito = EXCLUDED.gabarito, "gabaritoOficial" = EXCLUDED."gabaritoOficial", anulada = EXCLUDED.anulada,
      tags = EXCLUDED.tags, active = true, comando = EXCLUDED.comando, "provaTextoId" = EXCLUDED."provaTextoId",
      "temFigura" = EXCLUDED."temFigura", "temFormula" = EXCLUDED."temFormula", "paginaProva" = EXCLUDED."paginaProva"`
  await prisma.question.updateMany({ where: { provaId: prova.id, id: { notIn: ids } }, data: { active: false } })

  return {
    slug: arq.slug,
    provaId: prova.id,
    itens: arq.itens.length,
    anulados: arq.itens.filter((i) => i.anulada).length,
    textos: arq.textos.length,
    materiasCriadas: criadas,
  }
}
