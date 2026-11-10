import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { avisarVigia, monitorarCron } from '../vigia.ts'

let chamadas: Array<{ url: string; corpo: string }> = []
const fetchOriginal = globalThis.fetch
const ORIGINAL = { ...process.env }

describe('vigia — dead man\'s switch', () => {
  beforeEach(() => {
    chamadas = []
    process.env.HEALTHCHECKS_PING_KEY = 'chave-teste'
    globalThis.fetch = (async (url: any, init?: any) => {
      chamadas.push({ url: String(url), corpo: String(init?.body ?? '') })
      return new Response('OK')
    }) as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = fetchOriginal
    process.env = { ...ORIGINAL }
  })

  test('sucesso avisa no endereço da tarefa, criando o monitor se não existir', async () => {
    const rota = monitorarCron('rag-index', async () => Response.json({ processados: 3 }))
    const res = await rota({})
    assert.equal(res.status, 200)
    assert.equal(chamadas.length, 1)
    assert.equal(chamadas[0].url, 'https://hc-ping.com/chave-teste/rag-index?create=1')
    assert.match(chamadas[0].corpo, /processados/)
  })

  test('resposta de erro avisa falha (/fail)', async () => {
    const rota = monitorarCron('sync', async () => Response.json({ erro: 'x' }, { status: 500 }))
    await rota({})
    assert.equal(chamadas[0].url, 'https://hc-ping.com/chave-teste/sync/fail?create=1')
  })

  test('cron desativado por falta de segredo (503) também é falha', async () => {
    const rota = monitorarCron('sync', async () => Response.json({}, { status: 503 }))
    await rota({})
    assert.match(chamadas[0].url, /\/fail\?/)
  })

  // Alguém sem senha batendo na rota não é "a tarefa rodou".
  test('chamada recusada (401/403) não avisa nada', async () => {
    for (const status of [401, 403]) {
      const res = await monitorarCron('sync', async () => Response.json({}, { status }))({})
      assert.equal(res.status, status)
    }
    assert.equal(chamadas.length, 0)
  })

  test('exceção na tarefa avisa falha e continua sendo lançada', async () => {
    const rota = monitorarCron('cleanup', async () => { throw new Error('banco fora do ar') })
    await assert.rejects(() => rota({}), /banco fora do ar/)
    assert.equal(chamadas[0].url, 'https://hc-ping.com/chave-teste/cleanup/fail?create=1')
    assert.match(chamadas[0].corpo, /banco fora do ar/)
  })

  // A regra mais importante: o vigia nunca derruba a tarefa que ele vigia.
  test('Healthchecks fora do ar não quebra a tarefa', async () => {
    globalThis.fetch = (async () => { throw new Error('ECONNREFUSED') }) as typeof fetch
    const res = await monitorarCron('rag-index', async () => Response.json({ ok: true }))({})
    assert.equal(res.status, 200)
  })

  test('sem HEALTHCHECKS_PING_KEY, não faz nada', async () => {
    delete process.env.HEALTHCHECKS_PING_KEY
    await monitorarCron('rag-index', async () => Response.json({}))({})
    assert.equal(chamadas.length, 0)
  })

  test('nome fora do padrão do Healthchecks não é enviado', async () => {
    await avisarVigia('Nome Inválido', 'ok')
    await avisarVigia('../outra-conta', 'ok')
    assert.equal(chamadas.length, 0)
  })

  test('o corpo da resposta continua legível para quem chamou', async () => {
    const res = await monitorarCron('rag-index', async () => Response.json({ remaining: 0 }))({})
    assert.deepEqual(await res.json(), { remaining: 0 })
  })
})
