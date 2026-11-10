/**
 * Vigia das tarefas agendadas — o "dead man's switch".
 *
 * POR QUE EXISTE. Os 10 crons do projeto ficaram meses sem rodar e ninguém
 * percebeu: a Vercel só envia o segredo nos agendamentos se a variável se
 * chama CRON_SECRET, e o projeto usava outro nome. Não houve erro — houve
 * AUSÊNCIA. Monitorar erro não pega ausência.
 *
 * A defesa inverte a lógica: cada tarefa avisa quando TERMINA, e um vigia
 * externo (Healthchecks.io) dispara e-mail quando o aviso NÃO chega no prazo.
 * O nome vem do pedal do maquinista de trem: o trem para quando ele deixa de
 * apertar, não quando aperta errado.
 *
 * Três regras:
 *  - O vigia nunca derruba a tarefa: aviso que falha vira log, não exceção.
 *  - Chamada RECUSADA (401/403, alguém sem senha) não é execução — não avisa.
 *  - Sem HEALTHCHECKS_PING_KEY, não faz nada: integração opcional.
 *
 * Com `?create=1`, o primeiro aviso cria o monitor sozinho no Healthchecks.
 * O prazo de cada um se ajusta lá, copiando a expressão do vercel.json.
 */

const BASE = 'https://hc-ping.com'
const TIMEOUT_MS = 5_000
/** O Healthchecks só aceita estes caracteres em nome de monitor. */
const NOME_VALIDO = /^[a-z0-9_-]+$/

export async function avisarVigia(tarefa: string, sinal: 'ok' | 'falha', detalhe = ''): Promise<void> {
  const chave = process.env.HEALTHCHECKS_PING_KEY
  if (!chave || !NOME_VALIDO.test(tarefa)) return

  const url = `${BASE}/${encodeURIComponent(chave)}/${tarefa}${sinal === 'falha' ? '/fail' : ''}?create=1`
  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS)
  try {
    // O corpo aparece no histórico do Healthchecks: o resumo da execução.
    await fetch(url, { method: 'POST', body: detalhe.slice(0, 2_000), signal: controle.signal })
  } catch (err) {
    console.warn('[vigia] aviso não enviado', { tarefa, sinal, err: String(err) })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Embrulha a rota de um cron: avisa sucesso ou falha conforme a resposta,
 * sem mexer na lógica da tarefa.
 */
export function monitorarCron<R>(tarefa: string, executar: (req: R) => Promise<Response>) {
  return async (req: R): Promise<Response> => {
    let res: Response
    try {
      res = await executar(req)
    } catch (err) {
      await avisarVigia(tarefa, 'falha', String((err as any)?.message ?? err))
      throw err
    }
    if (res.status === 401 || res.status === 403) return res
    const resumo = await res.clone().text().catch(() => '')
    await avisarVigia(tarefa, res.ok ? 'ok' : 'falha', `HTTP ${res.status} ${resumo}`)
    return res
  }
}
