import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { segredo } from '../segredo.ts'

const ORIGINAL = { ...process.env }

describe('segredo — sem chave publicada em produção', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL }
  })

  test('usa a variável quando existe', () => {
    process.env.TESTE_CHAVE = 'valor-real'
    assert.equal(segredo(['TESTE_CHAVE'], 'fallback'), 'valor-real')
  })

  test('respeita a ordem dos nomes alternativos', () => {
    delete process.env.TESTE_A
    process.env.TESTE_B = 'do-b'
    assert.equal(segredo(['TESTE_A', 'TESTE_B'], 'fallback'), 'do-b')
    process.env.TESTE_A = 'do-a'
    assert.equal(segredo(['TESTE_A', 'TESTE_B'], 'fallback'), 'do-a')
  })

  test('em desenvolvimento, cai no fallback', () => {
    delete process.env.TESTE_CHAVE
    ;(process.env as any).NODE_ENV = 'development'
    assert.equal(segredo(['TESTE_CHAVE'], 'fallback'), 'fallback')
  })

  // O caso que importa: em produção, segredo ausente NÃO pode virar a chave
  // que está escrita no repositório público.
  test('em produção, ausência é erro — nunca o fallback', () => {
    delete process.env.TESTE_CHAVE
    ;(process.env as any).NODE_ENV = 'production'
    assert.throws(() => segredo(['TESTE_CHAVE'], 'fallback-publico'), /TESTE_CHAVE/)
  })

  test('string vazia conta como ausente', () => {
    process.env.TESTE_CHAVE = ''
    ;(process.env as any).NODE_ENV = 'production'
    assert.throws(() => segredo(['TESTE_CHAVE'], 'fallback'))
  })
})
