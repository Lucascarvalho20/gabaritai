import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limparAnotacao, MAX_ANOTACAO } from '../provas/anotacao.ts'

test('anotação: espaço sobrando sai, quebra de linha fica (no máximo uma linha em branco)', () => {
  assert.equal(limparAnotacao('  fui   mal \n\n\n\n em crase  '), 'fui mal\n\nem crase')
})

test('anotação: caractere de controle vira espaço; tab também', () => {
  assert.equal(limparAnotacao('a\u0000b\u0007c\td'), 'a b c d')
})

test('anotação: no máximo 500 caracteres, contando acento e emoji como um', () => {
  assert.equal(MAX_ANOTACAO, 500)
  assert.equal(limparAnotacao('é'.repeat(800))!.length, 500)
  assert.equal(Array.from(limparAnotacao('😀'.repeat(600))!).length, 500)
})

test('anotação: vazia ou de tipo errado vira null (apaga)', () => {
  for (const v of ['', '   ', '\n\n', null, undefined, 42, {}, ['x']]) assert.equal(limparAnotacao(v), null, String(v))
})
