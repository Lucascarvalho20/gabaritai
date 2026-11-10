/**
 * Regras do vigia das tarefas agendadas — sem banco e sem rede, para o teste
 * cobrir cada caso. A parte que grava e avisa está em vigia.ts.
 *
 * POR QUE EXISTE. Os crons do projeto ficaram meses sem rodar e ninguém
 * percebeu: a Vercel só envia o segredo nos agendamentos se a variável se
 * chama CRON_SECRET, e o projeto usava outro nome. Não houve erro — houve
 * AUSÊNCIA. Monitorar erro não pega ausência.
 *
 * A defesa é o "dead man's switch" (o pedal do maquinista: o trem para quando
 * ele deixa de apertar, não quando aperta errado). Cada tarefa grava a própria
 * execução; estas regras olham as gravações e dizem quem passou do prazo.
 */

const HORA_MS = 3_600_000

/**
 * Prazo de cada tarefa, em horas: o maior vão entre duas execuções no
 * vercel.json, mais uma folga para atraso da plataforma. Um teste lê o
 * vercel.json e reprova se este mapa e ele discordarem.
 */
export const PRAZO_HORAS: Record<string, number> = {
  'rag-index': 24 + 3,
  'reconciliar-pagamentos': 24 + 3,
  'detect-new-editais': 24 + 3,
  'generate-weekly-mocks': 72 + 6, // seg, qua e sáb: o maior vão é de quarta a sábado
  sync: 168 + 6,
  'weekly-backup': 168 + 6,
  cleanup: 31 * 24 + 12, // mensal: o mês mais longo
}

/** Agendadas no vercel.json mas fora do vigia, com o motivo. */
export const NAO_VIGIADAS: Record<string, string> = {
  'daily-reminders': 'desligado por decisão do produto (10/11/2026)',
}

export type Execucao = { id: string; ok: boolean; status: number | null; detalhe: string | null; criadoEm: Date }

export type EstadoTarefa = 'ok' | 'falhando' | 'atrasada' | 'aguardando'

export type SituacaoTarefa = {
  tarefa: string
  estado: EstadoTarefa
  prazoHoras: number
  ultima: Execucao | null
  ultimaOk: Execucao | null
  /** Sem sucesso dentro do prazo — vale também para quem está falhando. */
  atrasada: boolean
  /** Identifica o sumiço: id da última rodada boa, ou "nunca". Um aviso por chave. */
  chaveAtraso: string | null
}

/**
 * Estado de cada tarefa a partir da última execução e da última boa.
 *
 * `vigiaDesde` é a gravação mais antiga do vigia. Tarefa que nunca rodou só é
 * declarada atrasada depois que o vigia está no ar há mais que o prazo dela:
 * logo depois do deploy, "ainda não rodou" é normal (estado "aguardando").
 */
export function avaliarTarefas(args: {
  ultimas: Map<string, Execucao>
  ultimasOk: Map<string, Execucao>
  vigiaDesde: Date | null
  agora: Date
  prazos?: Record<string, number>
}): SituacaoTarefa[] {
  const prazos = args.prazos ?? PRAZO_HORAS
  return Object.entries(prazos).map(([tarefa, prazoHoras]) => {
    const ultima = args.ultimas.get(tarefa) ?? null
    const ultimaOk = args.ultimasOk.get(tarefa) ?? null
    const desde = ultimaOk?.criadoEm ?? args.vigiaDesde
    const atrasada = desde != null && args.agora.getTime() - desde.getTime() > prazoHoras * HORA_MS
    const estado: EstadoTarefa =
      ultima && !ultima.ok ? 'falhando' : atrasada ? 'atrasada' : !ultimaOk ? 'aguardando' : 'ok'
    return { tarefa, estado, prazoHoras, ultima, ultimaOk, atrasada, chaveAtraso: atrasada ? (ultimaOk?.id ?? 'nunca') : null }
  })
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const quando = (d: Date) =>
  d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export type ResultadoExecucao = { ok: boolean; status: number | null; detalhe: string; duracaoMs: number }

/** Mensagem (HTML do Telegram) de uma execução que falhou. */
export function mensagemFalha(tarefa: string, r: ResultadoExecucao): string {
  return `❌ <b>Tarefa falhou:</b> <code>${escapar(tarefa)}</code>\n${escapar(r.detalhe.slice(0, 300))}`
}

/** Mensagem (HTML do Telegram) de uma tarefa que sumiu. */
export function mensagemAtraso(s: SituacaoTarefa, agora: Date): string {
  const nome = `<code>${escapar(s.tarefa)}</code>`
  const dica = 'Confira a CRON_SECRET e os logs da Vercel (busca: /api/cron).'
  if (!s.ultimaOk) return `⏰ <b>Tarefa nunca rodou com sucesso:</b> ${nome}\n${dica}`
  const horas = Math.floor((agora.getTime() - s.ultimaOk.criadoEm.getTime()) / HORA_MS)
  return `⏰ <b>Tarefa sumiu:</b> ${nome}\nÚltima rodada boa: ${quando(s.ultimaOk.criadoEm)} (há ${horas} h; o prazo é ${s.prazoHoras} h).\n${dica}`
}

/**
 * Embrulha a rota de um cron sem mexer na lógica dela. `vigiar` recebe o
 * resultado; vem por parâmetro para o teste trocar o banco por um registro.
 *
 * Três regras:
 *  - chamada RECUSADA (401/403, alguém sem a senha do cron) não é execução;
 *  - o vigia nunca derruba a tarefa: erro dele vira log, não exceção;
 *  - o vigia não segura a tarefa: passou do prazo, a resposta sai assim mesmo.
 */
export function criarMonitor(vigiar: (tarefa: string, r: ResultadoExecucao) => Promise<unknown>, prazoMs = 8_000) {
  return function monitorarCron<R>(tarefa: string, executar: (req: R) => Promise<Response>) {
    return async (req: R): Promise<Response> => {
      const inicio = Date.now()
      let res: Response | undefined
      let erro: unknown
      try {
        res = await executar(req)
      } catch (e) {
        erro = e
      }
      if (res && (res.status === 401 || res.status === 403)) return res

      const detalhe = res
        ? `HTTP ${res.status} ${await res.clone().text().catch(() => '')}`
        : String((erro as { message?: string })?.message ?? erro)
      const resultado: ResultadoExecucao = {
        ok: Boolean(res?.ok),
        status: res?.status ?? null,
        detalhe: detalhe.slice(0, 500),
        duracaoMs: Date.now() - inicio,
      }

      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        vigiar(tarefa, resultado).catch((e) => console.warn('[vigia] não registrou', { tarefa, erro: String(e) })),
        new Promise((r) => { timer = setTimeout(r, prazoMs) }),
      ])
      clearTimeout(timer)

      if (erro) throw erro
      return res!
    }
  }
}
