import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { transicaoPermitida } from '../payment-status.ts'

describe('transicaoPermitida — status só anda pra frente', () => {
  // O bug real: notificação atrasada com "pending" chegando depois do "approved".
  test('APPROVED não volta para PENDING', () => {
    assert.equal(transicaoPermitida('APPROVED', 'PENDING'), false)
  })

  test('APPROVED não vira REJECTED nem CANCELLED', () => {
    assert.equal(transicaoPermitida('APPROVED', 'REJECTED'), false)
    assert.equal(transicaoPermitida('APPROVED', 'CANCELLED'), false)
  })

  test('APPROVED pode virar REFUNDED (estorno ou chargeback)', () => {
    assert.equal(transicaoPermitida('APPROVED', 'REFUNDED'), true)
  })

  test('REFUNDED é final', () => {
    for (const s of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const) {
      assert.equal(transicaoPermitida('REFUNDED', s), false, `REFUNDED -> ${s}`)
    }
  })

  test('PENDING pode ir para qualquer status', () => {
    for (const s of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'] as const) {
      assert.equal(transicaoPermitida('PENDING', s), true, `PENDING -> ${s}`)
    }
  })

  // Se o dinheiro entrou, recusar a aprovação seria o "cobrado e não liberado".
  test('REJECTED e CANCELLED ainda podem ser aprovados', () => {
    assert.equal(transicaoPermitida('REJECTED', 'APPROVED'), true)
    assert.equal(transicaoPermitida('CANCELLED', 'APPROVED'), true)
  })

  test('repetir o mesmo status é sempre permitido (idempotência)', () => {
    for (const s of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'] as const) {
      assert.equal(transicaoPermitida(s, s), true, `${s} -> ${s}`)
    }
  })
})
