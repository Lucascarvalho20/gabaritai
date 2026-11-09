/**
 * Model Context Protocol (MCP) — o protocolo, sem SDK.
 *
 * MCP é um padrão aberto para um aplicativo de IA (Claude Desktop, Claude
 * Code, Cursor) usar ferramentas que vivem fora dele. O app é o CLIENTE; este
 * processo é o SERVIDOR. Conversam por JSON-RPC 2.0: no transporte stdio, uma
 * mensagem JSON por linha, o cliente escreve no stdin e lê o stdout.
 *
 * O servidor precisa de quatro métodos:
 *
 *   initialize   aperto de mão: combinam a versão do protocolo e o que cada
 *                lado sabe fazer (aqui, só "tools")
 *   tools/list   quais ferramentas existem, com descrição e JSON Schema
 *   tools/call   executa uma
 *   ping         "ainda está vivo?"
 *
 * Mais a notificação `notifications/initialized`, que não tem resposta.
 *
 * Por que sem o SDK oficial: são esses cinco itens. Escrevê-los à mão deixa
 * visível o que o SDK faria por baixo, sem dependência nova. Recursos,
 * prompts e transporte HTTP são onde o SDK passa a compensar.
 *
 * Duas regras do protocolo que é fácil errar:
 *  - Erro AO EXECUTAR uma ferramenta não é erro de JSON-RPC: volta como
 *    resultado normal com `isError: true`, para o modelo ler e se corrigir.
 *    Erro de JSON-RPC é para mensagem malformada ou método inexistente.
 *  - Notificação (mensagem sem `id`) nunca recebe resposta.
 */

export const VERSOES_SUPORTADAS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const

export type FerramentaMcp = {
  nome: string
  descricao: string
  esquema: Record<string, unknown>
  executar: (args: Record<string, unknown>) => Promise<unknown>
}

type Id = string | number
type Mensagem = { jsonrpc?: unknown; id?: Id; method?: unknown; params?: any }

const ERRO = {
  requisicaoInvalida: -32600,
  metodoNaoEncontrado: -32601,
  parametrosInvalidos: -32602,
} as const

const resposta = (id: Id, result: unknown) => ({ jsonrpc: '2.0' as const, id, result })
const erro = (id: Id | null, code: number, message: string) => ({ jsonrpc: '2.0' as const, id, error: { code, message } })

export function criarServidorMcp(opts: { nome: string; versao: string; ferramentas: FerramentaMcp[] }) {
  const porNome = new Map(opts.ferramentas.map((f) => [f.nome, f]))

  /** Processa UMA mensagem. Devolve a resposta, ou `null` para notificação. */
  return async function responder(entrada: unknown): Promise<object | null> {
    const m = entrada as Mensagem
    if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
      return erro(null, ERRO.requisicaoInvalida, 'Mensagem JSON-RPC 2.0 inválida.')
    }

    const ehNotificacao = m.id === undefined
    if (ehNotificacao) return null // inclui notifications/initialized

    const id = m.id as Id
    switch (m.method) {
      case 'initialize': {
        // Negociação: se o cliente pede uma versão que conhecemos, usamos a
        // dele; senão, oferecemos a mais nova nossa e ele decide se segue.
        const pedida = m.params?.protocolVersion
        const versao = (VERSOES_SUPORTADAS as readonly string[]).includes(pedida) ? pedida : VERSOES_SUPORTADAS[0]
        return resposta(id, {
          protocolVersion: versao,
          capabilities: { tools: {} },
          serverInfo: { name: opts.nome, version: opts.versao },
        })
      }

      case 'ping':
        return resposta(id, {})

      case 'tools/list':
        return resposta(id, {
          tools: opts.ferramentas.map((f) => ({ name: f.nome, description: f.descricao, inputSchema: f.esquema })),
        })

      case 'tools/call': {
        const nome = m.params?.name
        const ferramenta = typeof nome === 'string' ? porNome.get(nome) : undefined
        if (!ferramenta) return erro(id, ERRO.parametrosInvalidos, `Ferramenta desconhecida: ${String(nome)}`)

        const args = m.params?.arguments
        try {
          const resultado = await ferramenta.executar(args && typeof args === 'object' ? args : {})
          return resposta(id, { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }], isError: false })
        } catch (e: any) {
          return resposta(id, { content: [{ type: 'text', text: String(e?.message ?? e) }], isError: true })
        }
      }

      default:
        return erro(id, ERRO.metodoNaoEncontrado, `Método não suportado: ${m.method}`)
    }
  }
}
