import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { rodarAgente, type ChamadaLLM, type Ferramenta, type MensagemAgente, type RespostaLLM } from '../agente/loop.ts'

/**
 * Modelo falso: devolve respostas roteirizadas, em ordem. Cada passo do
 * roteiro pode inspecionar as mensagens recebidas — é assim que se prova que
 * o resultado da ferramenta realmente volta para o modelo.
 */
function modeloRoteirizado(roteiro: Array<RespostaLLM | ((m: MensagemAgente[]) => RespostaLLM)>) {
  const recebidas: MensagemAgente[][] = []
  const llm: ChamadaLLM = async (mensagens) => {
    recebidas.push(structuredClone(mensagens))
    const passo = roteiro[recebidas.length - 1]
    if (!passo) throw new Error('roteiro acabou')
    return typeof passo === 'function' ? passo(mensagens) : passo
  }
  return { llm, recebidas }
}

let seq = 0
const chamar = (nome: string, args: unknown = {}): RespostaLLM => ({
  conteudo: null,
  chamadas: [{ id: `c${++seq}`, type: 'function', function: { name: nome, arguments: typeof args === 'string' ? args : JSON.stringify(args) } }],
})

const desempenho: Ferramenta = {
  nome: 'consultar_desempenho', descricao: '', parametros: {},
  executar: async () => ({ pior: 'Penal', acerto: 0.42 }),
}
const quebrada: Ferramenta = {
  nome: 'ferramenta_quebrada', descricao: '', parametros: {},
  executar: async () => { throw new Error('banco fora do ar') },
}
const entregar: Ferramenta = {
  nome: 'entregar_plano', descricao: '', parametros: {},
  executar: async (args) => {
    if (!Array.isArray(args.prioridades) || !args.prioridades.length) throw new Error('prioridades vazias')
    return { plano: args.prioridades }
  },
}
const base = { sistema: 's', pedido: 'p', ferramentas: [desempenho, quebrada, entregar], ferramentaFinal: 'entregar_plano' }

describe('rodarAgente', () => {
  test('consulta, recebe o resultado e entrega', async () => {
    const { llm, recebidas } = modeloRoteirizado([
      chamar('consultar_desempenho'),
      (msgs) => {
        // o resultado da ferramenta tem que ter chegado ao modelo
        const tool = msgs.find((m) => m.role === 'tool')
        assert.ok(tool && 'content' in tool && tool.content.includes('Penal'))
        return chamar('entregar_plano', { prioridades: ['Penal'] })
      },
    ])
    const r = await rodarAgente({ ...base, llm })
    assert.equal(r.ok, true)
    assert.deepEqual(r.ok && r.resultado, { plano: ['Penal'] })
    assert.deepEqual(r.passos.map((p) => p.ferramenta), ['consultar_desempenho', 'entregar_plano'])
    assert.equal(recebidas.length, 2)
  })

  test('ferramenta que lança erro não derruba: o erro volta para o modelo', async () => {
    const { llm } = modeloRoteirizado([
      chamar('ferramenta_quebrada'),
      (msgs) => {
        const tool = msgs.at(-1)
        assert.ok(tool?.role === 'tool' && tool.content.includes('banco fora do ar'))
        return chamar('entregar_plano', { prioridades: ['x'] })
      },
    ])
    const r = await rodarAgente({ ...base, llm })
    assert.equal(r.ok, true)
    assert.equal(r.passos[0].ok, false)
    assert.equal(r.passos[0].erro, 'banco fora do ar')
  })

  test('ferramenta inventada pelo modelo vira erro com a lista das que existem', async () => {
    const { llm } = modeloRoteirizado([
      chamar('apagar_banco'),
      (msgs) => {
        const tool = msgs.at(-1)
        assert.ok(tool?.role === 'tool' && tool.content.includes('consultar_desempenho'))
        return chamar('entregar_plano', { prioridades: ['x'] })
      },
    ])
    const r = await rodarAgente({ ...base, llm })
    assert.equal(r.ok, true)
    assert.equal(r.passos[0].erro, 'ferramenta_inexistente')
  })

  test('argumento que não é JSON volta como erro', async () => {
    const { llm } = modeloRoteirizado([
      chamar('consultar_desempenho', '{isso não é json'),
      chamar('entregar_plano', { prioridades: ['x'] }),
    ])
    const r = await rodarAgente({ ...base, llm })
    assert.equal(r.ok, true)
    assert.equal(r.passos[0].erro, 'json_invalido')
  })

  // A ferramenta final valida a entrega: entrega ruim volta, modelo corrige.
  test('entrega inválida é recusada e o modelo tenta de novo', async () => {
    const { llm } = modeloRoteirizado([
      chamar('entregar_plano', { prioridades: [] }),
      chamar('entregar_plano', { prioridades: ['Penal'] }),
    ])
    const r = await rodarAgente({ ...base, llm })
    assert.equal(r.ok, true)
    assert.deepEqual(r.passos.map((p) => p.ok), [false, true])
  })

  test('resposta em texto livre recebe instrução para usar a ferramenta final', async () => {
    const { llm } = modeloRoteirizado([
      { conteudo: 'Estude Penal.', chamadas: [] },
      (msgs) => {
        const ultima = msgs.at(-1)
        assert.ok(ultima?.role === 'user' && ultima.content.includes('entregar_plano'))
        return chamar('entregar_plano', { prioridades: ['Penal'] })
      },
    ])
    assert.equal((await rodarAgente({ ...base, llm })).ok, true)
  })

  test('teto de passos: modelo em loop para, sem gastar cota pra sempre', async () => {
    const { llm, recebidas } = modeloRoteirizado(Array.from({ length: 50 }, () => chamar('consultar_desempenho')))
    const r = await rodarAgente({ ...base, llm, maxPassos: 3 })
    assert.equal(r.ok, false)
    assert.equal(recebidas.length, 3)
  })

  test('várias chamadas na mesma resposta rodam em ordem', async () => {
    const ordem: string[] = []
    const a: Ferramenta = { nome: 'a', descricao: '', parametros: {}, executar: async () => { ordem.push('a'); return 1 } }
    const b: Ferramenta = { nome: 'b', descricao: '', parametros: {}, executar: async () => { ordem.push('b'); return 2 } }
    const { llm } = modeloRoteirizado([
      { conteudo: null, chamadas: [chamar('a').chamadas[0], chamar('b').chamadas[0]] },
      chamar('entregar_plano', { prioridades: ['x'] }),
    ])
    await rodarAgente({ ...base, ferramentas: [a, b, entregar], llm })
    assert.deepEqual(ordem, ['a', 'b'])
  })
})
