import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verifyWebhookSignature } from '../mercadopago.ts'

const SEGREDO = 'segredo-de-teste-nao-usado-em-producao'

/** Monta um header x-signature válido, do mesmo jeito que o Mercado Pago faz. */
function assinar(dataId: string, requestId: string, ts = Math.floor(Date.now() / 1000)) {
  const payload = `id:${dataId};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac('sha256', SEGREDO).update(payload).digest('hex')
  return `ts=${ts},v1=${v1}`
}

describe('verifyWebhookSignature', () => {
  before(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SEGREDO
  })

  test('assinatura correta passa', () => {
    const r = verifyWebhookSignature({
      signatureHeader: assinar('123', 'req-1'),
      requestId: 'req-1',
      dataId: '123',
    })
    assert.equal(r.valid, true)
  })

  test('segredo diferente é recusado', () => {
    const ts = Math.floor(Date.now() / 1000)
    const payload = `id:123;request-id:req-1;ts:${ts};`
    const v1 = crypto.createHmac('sha256', 'outro-segredo').update(payload).digest('hex')
    const r = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: 'req-1',
      dataId: '123',
    })
    assert.equal(r.valid, false)
    assert.equal(r.reason, 'signature_mismatch')
  })

  // Troca o id do pagamento mantendo a assinatura: é o ataque que a
  // assinatura existe pra barrar.
  test('id trocado invalida a assinatura', () => {
    const r = verifyWebhookSignature({
      signatureHeader: assinar('123', 'req-1'),
      requestId: 'req-1',
      dataId: '456',
    })
    assert.equal(r.valid, false)
  })

  test('request-id trocado invalida a assinatura', () => {
    const r = verifyWebhookSignature({
      signatureHeader: assinar('123', 'req-1'),
      requestId: 'req-2',
      dataId: '123',
    })
    assert.equal(r.valid, false)
  })

  // Anti-replay: assinatura capturada e reenviada depois não vale.
  test('timestamp antigo é recusado mesmo com assinatura correta', () => {
    const antigo = Math.floor(Date.now() / 1000) - 600 // 10 min atrás
    const r = verifyWebhookSignature({
      signatureHeader: assinar('123', 'req-1', antigo),
      requestId: 'req-1',
      dataId: '123',
    })
    assert.equal(r.valid, false)
    assert.match(r.reason ?? '', /timestamp_too_old/)
  })

  test('header malformado é recusado sem explodir', () => {
    for (const header of ['', 'lixo', 'ts=abc', 'v1=abc', 'ts=1,v1=']) {
      const r = verifyWebhookSignature({ signatureHeader: header, requestId: 'r', dataId: '1' })
      assert.equal(r.valid, false, `deveria recusar: ${JSON.stringify(header)}`)
    }
  })

  test('v1 com tamanho errado não derruba o timingSafeEqual', () => {
    const ts = Math.floor(Date.now() / 1000)
    const r = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=aabb`, // hex válido, curto demais
      requestId: 'r',
      dataId: '1',
    })
    assert.equal(r.valid, false)
  })

  test('parâmetro faltando é recusado', () => {
    assert.equal(verifyWebhookSignature({ signatureHeader: null, requestId: 'r', dataId: '1' }).valid, false)
    assert.equal(verifyWebhookSignature({ signatureHeader: 'ts=1,v1=a', requestId: null, dataId: '1' }).valid, false)
    assert.equal(verifyWebhookSignature({ signatureHeader: 'ts=1,v1=a', requestId: 'r', dataId: null }).valid, false)
  })
})
