import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ollamaConfig, OLLAMA_MODELO_PADRAO } from '../ollama.ts'
import { materiaDoPedido } from '../rag/escopo-pedido.ts'

describe('Ollama — só entra quando configurado', () => {
  const com = (env: Record<string, string | undefined>, f: () => void) => {
    const nomes = ['OLLAMA_URL', 'OLLAMA_MODEL', 'OLLAMA_API_KEY']
    const antes = Object.fromEntries(nomes.map((n) => [n, process.env[n]]))
    for (const n of nomes) if (!(n in env)) delete process.env[n]
    Object.assign(process.env, env)
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]
    try { f() } finally {
      for (const n of nomes) if (antes[n] === undefined) delete process.env[n]; else process.env[n] = antes[n]
    }
  }

  test('sem OLLAMA_URL, desligado', () => com({ OLLAMA_URL: undefined }, () => assert.equal(ollamaConfig(), null)))

  test('com OLLAMA_URL, monta o endereço no formato da OpenAI e usa o modelo padrão', () =>
    com({ OLLAMA_URL: 'http://localhost:11434/', OLLAMA_MODEL: undefined }, () =>
      assert.deepEqual(ollamaConfig(), { url: 'http://localhost:11434/v1/chat/completions', modelo: OLLAMA_MODELO_PADRAO, chave: 'ollama' })))

  test('o modelo escolhido vence o padrão', () =>
    com({ OLLAMA_URL: 'http://localhost:11434', OLLAMA_MODEL: 'llama3.1:8b' }, () =>
      assert.equal(ollamaConfig()?.modelo, 'llama3.1:8b')))

  test('servidor próprio: a chave vai no cabeçalho, por https', () =>
    com({ OLLAMA_URL: 'https://ia.exemplo.com.br', OLLAMA_API_KEY: 'segredo-longo' }, () =>
      assert.deepEqual(ollamaConfig(), { url: 'https://ia.exemplo.com.br/v1/chat/completions', modelo: OLLAMA_MODELO_PADRAO, chave: 'segredo-longo' })))

  test('chave por http aberto para outra máquina: recusado (vazaria no caminho); no próprio computador, pode', () => {
    com({ OLLAMA_URL: 'http://203.0.113.7:11434', OLLAMA_API_KEY: 'segredo-longo' }, () => assert.equal(ollamaConfig(), null))
    com({ OLLAMA_URL: 'http://localhost:11434', OLLAMA_API_KEY: 'segredo-longo' }, () => assert.equal(ollamaConfig()?.chave, 'segredo-longo'))
  })

  test('endereço inválido ou de outro protocolo não liga nada', () => {
    for (const url of ['localhost:11434', 'file:///etc/passwd', 'javascript:alert(1)', 'nada'])
      com({ OLLAMA_URL: url }, () => assert.equal(ollamaConfig(), null, url))
  })
})

describe('mentor na sessão de estudo — a matéria do pedido', () => {
  const doEdital = ['penal', 'portugues']

  test('matéria do edital do aluno: vale', () => assert.equal(materiaDoPedido('penal', doEdital), 'penal'))

  test('matéria de fora do edital: ignorada (não abre material de curso não comprado)', () =>
    assert.equal(materiaDoPedido('contabilidade', doEdital), null))

  test('sem lista de permitidas, restringir só estreita a busca: vale', () =>
    assert.equal(materiaDoPedido('penal', null), 'penal'))

  test('lixo vindo do navegador: ignorado', () => {
    for (const p of [undefined, null, 42, '', '   ', { id: 'penal' }, 'x'.repeat(65)])
      assert.equal(materiaDoPedido(p, doEdital), null, JSON.stringify(p))
  })
})
