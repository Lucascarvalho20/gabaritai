import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trechosMarcados, semMarcas } from '../texto-marcado.ts'

test('texto sem marca vira um trecho só, sem estilo', () => {
  assert.deepEqual(trechosMarcados('Assinale a correta.'), [{ texto: 'Assinale a correta.', negrito: false, italico: false, sublinhado: false }])
})

test('sublinhado e negrito juntos, no meio da frase', () => {
  const t = trechosMarcados('No período “e <b><u>os</u></b> torna”, o termo')
  assert.deepEqual(t.map((x) => [x.texto, x.negrito, x.sublinhado]), [
    ['No período “e ', false, false],
    ['os', true, true],
    [' torna”, o termo', false, false],
  ])
})

test('outra tag continua sendo texto: nada vira HTML', () => {
  const t = trechosMarcados('<script>alert(1)</script> e <img src=x onerror=y>')
  assert.equal(t.length, 1)
  assert.equal(t[0].texto, '<script>alert(1)</script> e <img src=x onerror=y>')
})

test('marca mal fechada não quebra nem vaza estilo negativo', () => {
  const t = trechosMarcados('a</b> <i>b')
  assert.deepEqual(t.map((x) => [x.texto, x.italico]), [['a ', false], ['b', true]])
})

test('semMarcas tira só as três marcas', () => {
  assert.equal(semMarcas('o <u>termo</u> e <b>x</b> < y'), 'o termo e x < y')
})
