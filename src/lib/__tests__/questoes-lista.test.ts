import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { lerCursor, montarCursor } from '../questoes-lista.ts'

describe('cursor da lista de questões', () => {
  test('ida e volta preserva data e id', () => {
    const em = new Date('2026-11-14T15:50:01.123Z')
    const c = lerCursor(montarCursor(em, 'pf-2021-agente-007'))
    assert.ok(c)
    assert.equal(c.em.toISOString(), em.toISOString())
    assert.equal(c.id, 'pf-2021-agente-007')
  })

  test('ids de cuid também passam', () => {
    const c = lerCursor(montarCursor(new Date(0), 'clx9a8b7c6d5e4f3g2h1'))
    assert.equal(c?.id, 'clx9a8b7c6d5e4f3g2h1')
  })

  test('lixo, vazio e adulteração viram primeira página', () => {
    for (const ruim of [null, undefined, '', 'nao-e-base64-$$$', 'x'.repeat(400)]) {
      assert.equal(lerCursor(ruim), null, String(ruim))
    }
    const semData = Buffer.from('ontem|abc').toString('base64url')
    assert.equal(lerCursor(semData), null)
    const idComAspas = Buffer.from(`${new Date().toISOString()}|abc' OR 1=1`).toString('base64url')
    assert.equal(lerCursor(idComAspas), null)
    const semSeparador = Buffer.from(new Date().toISOString()).toString('base64url')
    assert.equal(lerCursor(semSeparador), null)
  })
})
