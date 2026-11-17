import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ollamaConfig, OLLAMA_MODELO_PADRAO } from '../ollama.ts'
import { materiaDoPedido } from '../rag/escopo-pedido.ts'

describe('Ollama — só entra quando configurado', () => {
  const com = (env: Record<string, string | undefined>, f: () => void) => {
    const antes = { url: process.env.OLLAMA_URL, modelo: process.env.OLLAMA_MODEL }
    Object.assign(process.env, env)
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]
    try { f() } finally {
      if (antes.url === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = antes.url
      if (antes.modelo === undefined) delete process.env.OLLAMA_MODEL; else process.env.OLLAMA_MODEL = antes.modelo
    }
  }

  test('sem OLLAMA_URL, desligado', () => com({ OLLAMA_URL: undefined }, () => assert.equal(ollamaConfig(), null)))

  test('com OLLAMA_URL, monta o endereço no formato da OpenAI e usa o modelo padrão', () =>
    com({ OLLAMA_URL: 'http://localhost:11434/', OLLAMA_MODEL: undefined }, () =>
      assert.deepEqual(ollamaConfig(), { url: 'http://localhost:11434/v1/chat/completions', modelo: OLLAMA_MODELO_PADRAO })))

  test('o modelo escolhido vence o padrão', () =>
    com({ OLLAMA_URL: 'http://localhost:11434', OLLAMA_MODEL: 'llama3.1:8b' }, () =>
      assert.equal(ollamaConfig()?.modelo, 'llama3.1:8b')))

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
