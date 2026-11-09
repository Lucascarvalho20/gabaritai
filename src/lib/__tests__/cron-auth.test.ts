import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { exigirTokenCron } from '../cron-auth.ts'

const ORIGINAL = { ...process.env }
const req = (headers: Record<string, string>) =>
  ({ headers: new Headers(headers) }) as any

describe('exigirTokenCron', () => {
  afterEach(() => { process.env = { ...ORIGINAL } })

  test('sem token configurado: cron desativado (503), nunca aberto', () => {
    delete process.env.CRON_TOKEN; delete process.env.CRON_SECRET
    const r = exigirTokenCron(req({ 'x-cron-token': 'qualquer' }))
    assert.equal(r?.status, 503)
  })

  test('o literal antigo do repositório não abre nada', () => {
    process.env.CRON_TOKEN = 'token-real-de-verdade'
    const r = exigirTokenCron(req({ 'x-cron-token': 'gabaritai-dev-cron-token' }))
    assert.equal(r?.status, 403)
  })

  test('aceita pelo header x-cron-token e pelo Bearer', () => {
    process.env.CRON_TOKEN = 'abc123'
    assert.equal(exigirTokenCron(req({ 'x-cron-token': 'abc123' })), null)
    assert.equal(exigirTokenCron(req({ authorization: 'Bearer abc123' })), null)
  })

  // O bug que motivou a função `some`: com as duas variáveis diferentes, o
  // agendamento da Vercel (que manda a CRON_SECRET) era recusado.
  test('CRON_TOKEN e CRON_SECRET diferentes: as duas valem', () => {
    process.env.CRON_TOKEN = 'manual-111'
    process.env.CRON_SECRET = 'vercel-222'
    assert.equal(exigirTokenCron(req({ 'x-cron-token': 'manual-111' })), null)
    assert.equal(exigirTokenCron(req({ authorization: 'Bearer vercel-222' })), null)
    assert.equal(exigirTokenCron(req({ authorization: 'Bearer outro' }))?.status, 403)
  })

  test('sem header nenhum é recusado', () => {
    process.env.CRON_SECRET = 'abc'
    assert.equal(exigirTokenCron(req({}))?.status, 403)
  })
})
