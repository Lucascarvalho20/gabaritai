/**
 * Vigia das tarefas agendadas — a parte que grava e avisa. As regras (prazo,
 * quem sumiu, mensagens) ficam em vigia-regras.ts.
 *
 * Feito em casa, sem serviço externo: cada cron grava a própria execução na
 * tabela cron_execucoes, e
 *  - FALHA avisa na hora;
 *  - SUMIÇO é conferido ao fim de cada execução: o cron que roda olha se
 *    algum OUTRO passou do prazo. Um cron parado é denunciado pelos que
 *    continuam rodando;
 *  - o painel do admin e o /api/health?detalhe=1 calculam o estado na hora.
 *
 * O aviso vai pelo Telegram do admin; sem Telegram configurado, por e-mail
 * (ADMIN_EMAIL). Os dois canais já existiam no projeto.
 *
 * LIMITE HONESTO: se TODOS os crons pararem juntos, ninguém sobra para
 * conferir — aí o sumiço aparece no painel, mas não chega aviso. Pegar esse
 * caso exige um relógio fora da Vercel (era o papel do Healthchecks.io).
 */
import { prisma } from './prisma'
import { notifyAdmin } from './telegram'
import { sendEmail } from './email'
import {
  avaliarTarefas, criarMonitor, mensagemAtraso, mensagemFalha,
  type Execucao, type ResultadoExecucao, type SituacaoTarefa,
} from './vigia-regras'

type Linha = Execucao & { tarefa: string }

export async function situacaoDasTarefas(agora = new Date()): Promise<SituacaoTarefa[]> {
  // DISTINCT ON: a linha mais recente de cada tarefa numa consulta só,
  // usando o índice (tarefa, criadoEm).
  const [ultimas, ultimasOk, [inicio]] = await Promise.all([
    prisma.$queryRaw<Linha[]>`
      SELECT DISTINCT ON (tarefa) tarefa, id, ok, status, detalhe, "criadoEm"
      FROM cron_execucoes ORDER BY tarefa, "criadoEm" DESC`,
    prisma.$queryRaw<Linha[]>`
      SELECT DISTINCT ON (tarefa) tarefa, id, ok, status, detalhe, "criadoEm"
      FROM cron_execucoes WHERE ok ORDER BY tarefa, "criadoEm" DESC`,
    prisma.$queryRaw<Array<{ desde: Date | null }>>`SELECT min("criadoEm") AS desde FROM cron_execucoes`,
  ])
  return avaliarTarefas({
    ultimas: new Map(ultimas.map((l) => [l.tarefa, l])),
    ultimasOk: new Map(ultimasOk.map((l) => [l.tarefa, l])),
    vigiaDesde: inicio?.desde ?? null,
    agora,
  })
}

/** Telegram do admin; sem ele, e-mail. true = alguém recebeu. */
async function avisar(html: string, assunto: string): Promise<boolean> {
  if (await notifyAdmin(html, { parseMode: 'HTML' })) return true
  const para = process.env.ADMIN_EMAIL
  if (!para || !process.env.RESEND_API_KEY) return false
  const texto = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const r = await sendEmail({ to: para, subject: assunto, html: html.replace(/\n/g, '<br>'), text: texto })
  return Boolean(r.ok)
}

/**
 * Avisa cada sumiço UMA vez. A trava é a chave única (tarefa, referencia) de
 * cron_alertas: quem consegue inserir avisa; quem bate na chave sabe que o
 * aviso já saiu — mesmo com dois crons terminando no mesmo instante. Se
 * nenhum canal entregar, a trava é solta para a próxima conferência tentar.
 */
export async function avisarAtrasos(agora = new Date()): Promise<string[]> {
  const avisadas: string[] = []
  for (const s of await situacaoDasTarefas(agora)) {
    if (!s.chaveAtraso) continue
    try {
      await prisma.cronAlerta.create({ data: { tarefa: s.tarefa, referencia: s.chaveAtraso } })
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') continue
      throw e
    }
    if (await avisar(mensagemAtraso(s, agora), `Gabaritai: a tarefa ${s.tarefa} parou de rodar`)) avisadas.push(s.tarefa)
    else await prisma.cronAlerta.deleteMany({ where: { tarefa: s.tarefa, referencia: s.chaveAtraso } })
  }
  return avisadas
}

export async function vigiar(tarefa: string, r: ResultadoExecucao): Promise<void> {
  // O aviso de falha não depende do banco: sai antes de gravar, para chegar
  // mesmo se a gravação falhar (ou se a tabela ainda não existir).
  if (!r.ok) await avisar(mensagemFalha(tarefa, r), `Gabaritai: a tarefa ${tarefa} falhou`)
  await prisma.cronExecucao.create({
    data: { tarefa, ok: r.ok, status: r.status, detalhe: r.detalhe, duracaoMs: r.duracaoMs },
  })
  await avisarAtrasos()
}

/** A tabela ainda não foi criada (o SQL do vigia não rodou no banco). */
export function vigiaNaoInstalado(e: unknown): boolean {
  const err = e as { code?: string; meta?: { code?: string }; message?: string }
  return err?.code === 'P2021' || err?.meta?.code === '42P01' || /cron_(execucoes|alertas)" does not exist/.test(String(err?.message))
}

export const monitorarCron = criarMonitor(vigiar)
