import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { cadernoDoItem, cadernosDaFonte } from '../provas/cadernos.ts'

describe('caderno de cada item', () => {
  const fonte = { cadernos: [
    { de: 1, ate: 60, url: 'https://x/bloco1.pdf' },
    { de: 61, ate: 96, url: 'https://x/bloco2.pdf' },
    { de: 97, ate: 120, url: 'https://x/bloco3.pdf' },
  ] }

  test('cada faixa abre o próprio caderno, nas bordas também', () => {
    assert.equal(cadernoDoItem(fonte, 1), 'https://x/bloco1.pdf')
    assert.equal(cadernoDoItem(fonte, 60), 'https://x/bloco1.pdf')
    assert.equal(cadernoDoItem(fonte, 61), 'https://x/bloco2.pdf')
    assert.equal(cadernoDoItem(fonte, 120), 'https://x/bloco3.pdf')
  })

  test('sem lista de cadernos (prova de caderno único) ou item fora: null, e a tela usa o caderno da prova', () => {
    assert.equal(cadernoDoItem({ caderno: 'https://x/u.pdf' }, 5), null)
    assert.equal(cadernoDoItem(null, 5), null)
    assert.equal(cadernoDoItem(fonte, 121), null)
    assert.equal(cadernoDoItem(fonte, null), null)
  })

  test('ignora faixa malformada', () => {
    assert.deepEqual(cadernosDaFonte({ cadernos: [{ de: 5, ate: 1, url: 'a' }, { de: 1, ate: 2 }, null] }), [])
  })
})
