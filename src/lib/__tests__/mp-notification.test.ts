import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { lerNotificacaoMp, ehEventoDePagamento } from '../mp-notification.ts'

const SEM_HEADERS = { signatureHeader: null, requestIdHeader: null }
const COM_HEADERS = { signatureHeader: 'ts=123,v1=abc', requestIdHeader: 'req-1' }

describe('lerNotificacaoMp', () => {
  test('webhook v2 de pagamento, pelos query params', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?type=payment&data.id=12345',
      body: {},
      ...COM_HEADERS,
    })
    assert.equal(n.topico, 'payment')
    assert.equal(n.recursoId, '12345')
    assert.equal(n.assinada, true)
    assert.equal(n.formato, 'webhook_v2')
    assert.equal(ehEventoDePagamento(n), true)
  })

  test('webhook v2 de pagamento, pelo corpo', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook',
      body: { type: 'payment', data: { id: '67890' } },
      ...COM_HEADERS,
    })
    assert.equal(n.recursoId, '67890')
    assert.equal(ehEventoDePagamento(n), true)
  })

  test('id numérico no corpo vira string', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook',
      body: { type: 'payment', data: { id: 112233 } },
      ...COM_HEADERS,
    })
    assert.equal(n.recursoId, '112233')
  })

  // O caso que derrubava tudo: o MP manda `topic`/`id`, não `type`/`data.id`.
  test('IPN legado é reconhecido', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?topic=payment&id=999',
      body: {},
      ...SEM_HEADERS,
    })
    assert.equal(n.topico, 'payment')
    assert.equal(n.recursoId, '999')
    assert.equal(n.assinada, false)
    assert.equal(n.formato, 'ipn_legado')
    assert.equal(ehEventoDePagamento(n), true)
  })

  test('merchant_order não é evento de pagamento', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?type=merchant_order&data.id=555',
      body: {},
      ...COM_HEADERS,
    })
    assert.equal(ehEventoDePagamento(n), false)
  })

  test('payment.updated conta como pagamento', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook',
      body: { type: 'payment.updated', data: { id: '1' } },
      ...COM_HEADERS,
    })
    assert.equal(ehEventoDePagamento(n), true)
  })

  test('notificação vazia não vira evento de pagamento', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook',
      body: {},
      ...SEM_HEADERS,
    })
    assert.equal(n.recursoId, null)
    assert.equal(ehEventoDePagamento(n), false)
  })

  test('topic=payment sem id não é processável', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?topic=payment',
      body: {},
      ...SEM_HEADERS,
    })
    assert.equal(ehEventoDePagamento(n), false)
  })

  test('url inválida não derruba o parser', () => {
    const n = lerNotificacaoMp({
      url: 'não-é-url',
      body: { type: 'payment', data: { id: '7' } },
      ...COM_HEADERS,
    })
    assert.equal(n.recursoId, '7')
  })

  test('query tem prioridade sobre corpo', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?type=payment&data.id=AAA',
      body: { type: 'payment', data: { id: 'BBB' } },
      ...COM_HEADERS,
    })
    assert.equal(n.recursoId, 'AAA')
  })

  test('só um dos dois headers não conta como assinada', () => {
    const n = lerNotificacaoMp({
      url: 'https://x.app/api/payments/webhook?type=payment&data.id=1',
      body: {},
      signatureHeader: 'ts=1,v1=a',
      requestIdHeader: null,
    })
    assert.equal(n.assinada, false)
  })
})
