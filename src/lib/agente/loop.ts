/**
 * Loop de agente com ferramentas, independente de provedor.
 *
 * "Agente" aqui tem um sentido preciso: o modelo DECIDE quais ferramentas
 * chamar e em que ordem, olhando o resultado de cada uma antes da próxima.
 * Não é um pipeline fixo com um LLM no fim. A conta (quem perde mais pontos)
 * fica nas ferramentas, que são funções testadas; o modelo orquestra e explica.
 *
 * O modelo de linguagem entra INJETADO (`llm`). Em produção é uma chamada
 * HTTP; nos testes é um roteiro. É isso que permite testar o loop inteiro —
 * teto de passos, erro de ferramenta, argumento inválido — sem rede e sem
 * custo, e com resultado reprodutível.
 *
 * O formato das mensagens é o do tool calling da OpenAI, que Groq e Gemini
 * (pelo endpoint compatível) também aceitam: um loop, três provedores.
 */

export type MensagemAgente =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ChamadaFerramenta[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ChamadaFerramenta = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type Ferramenta = {
  nome: string
  descricao: string
  /** JSON Schema dos argumentos. */
  parametros: Record<string, unknown>
  executar: (args: Record<string, unknown>) => Promise<unknown>
}

export type RespostaLLM = { conteudo: string | null; chamadas: ChamadaFerramenta[] }

export type ChamadaLLM = (
  mensagens: MensagemAgente[],
  ferramentas: Ferramenta[],
) => Promise<RespostaLLM>

export type Passo = { ferramenta: string; argumentos: unknown; ok: boolean; erro?: string }

export type ResultadoAgente =
  | { ok: true; resultado: unknown; passos: Passo[] }
  | { ok: false; erro: string; passos: Passo[] }

/** Resultado de ferramenta grande demais incha o contexto e encarece cada passo. */
const MAX_CHARS_RESULTADO = 6_000

function serializar(valor: unknown): string {
  const s = JSON.stringify(valor ?? null)
  return s.length > MAX_CHARS_RESULTADO ? s.slice(0, MAX_CHARS_RESULTADO) + '…[truncado]' : s
}

export async function rodarAgente(opts: {
  sistema: string
  pedido: string
  ferramentas: Ferramenta[]
  /** Nome da ferramenta que encerra o loop; os argumentos dela são o resultado. */
  ferramentaFinal: string
  llm: ChamadaLLM
  maxPassos?: number
}): Promise<ResultadoAgente> {
  const maxPassos = opts.maxPassos ?? 8
  const porNome = new Map(opts.ferramentas.map((f) => [f.nome, f]))
  const passos: Passo[] = []
  const mensagens: MensagemAgente[] = [
    { role: 'system', content: opts.sistema },
    { role: 'user', content: opts.pedido },
  ]

  for (let rodada = 0; rodada < maxPassos; rodada++) {
    const resposta = await opts.llm(mensagens, opts.ferramentas)

    if (!resposta.chamadas.length) {
      // O modelo respondeu em texto em vez de entregar pela ferramenta final.
      // Em vez de aceitar texto livre (sem estrutura, a tela não sabe exibir),
      // devolve a instrução — uma vez por rodada, dentro do mesmo teto.
      mensagens.push({ role: 'assistant', content: resposta.conteudo ?? '' })
      mensagens.push({
        role: 'user',
        content: `Entregue o resultado chamando a ferramenta "${opts.ferramentaFinal}".`,
      })
      continue
    }

    mensagens.push({ role: 'assistant', content: resposta.conteudo, tool_calls: resposta.chamadas })

    for (const chamada of resposta.chamadas) {
      const nome = chamada.function.name
      let args: Record<string, unknown>
      try {
        const bruto = JSON.parse(chamada.function.arguments || '{}')
        args = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {}
      } catch {
        // Argumento malformado volta para o modelo como erro, não derruba o pedido:
        // na rodada seguinte ele costuma corrigir.
        passos.push({ ferramenta: nome, argumentos: chamada.function.arguments, ok: false, erro: 'json_invalido' })
        mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: serializar({ erro: 'Argumentos não são JSON válido.' }) })
        continue
      }

      if (nome === opts.ferramentaFinal) {
        const final = porNome.get(nome)
        try {
          // A ferramenta final também executa: é nela que se VALIDA o que o
          // modelo entregou. Se reclamar, o erro volta e ele tenta de novo.
          const resultado = final ? await final.executar(args) : args
          passos.push({ ferramenta: nome, argumentos: args, ok: true })
          return { ok: true, resultado, passos }
        } catch (err: any) {
          passos.push({ ferramenta: nome, argumentos: args, ok: false, erro: String(err?.message ?? err) })
          mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: serializar({ erro: String(err?.message ?? err) }) })
          continue
        }
      }

      const ferramenta = porNome.get(nome)
      if (!ferramenta) {
        passos.push({ ferramenta: nome, argumentos: args, ok: false, erro: 'ferramenta_inexistente' })
        mensagens.push({
          role: 'tool',
          tool_call_id: chamada.id,
          content: serializar({ erro: `Ferramenta "${nome}" não existe. Disponíveis: ${[...porNome.keys()].join(', ')}` }),
        })
        continue
      }

      try {
        const resultado = await ferramenta.executar(args)
        passos.push({ ferramenta: nome, argumentos: args, ok: true })
        mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: serializar(resultado) })
      } catch (err: any) {
        // Falha de ferramenta é informação para o modelo, não exceção para o usuário.
        passos.push({ ferramenta: nome, argumentos: args, ok: false, erro: String(err?.message ?? err) })
        mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: serializar({ erro: String(err?.message ?? err) }) })
      }
    }
  }

  return { ok: false, erro: `O agente não concluiu em ${maxPassos} passos.`, passos }
}
