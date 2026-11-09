import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { priorizar } from '../agente/prioridade.ts'

describe('priorizar — onde o aluno perde mais pontos', () => {
  test('matéria pesada com acerto médio pode render mais que leve com acerto péssimo', () => {
    const r = priorizar([
      { id: 'pes', nome: 'Pesada', peso: 6, acertos: 60, tentativas: 100 }, // 60%
      { id: 'lev', nome: 'Leve', peso: 1, acertos: 20, tentativas: 100 },   // 20%
    ])
    assert.equal(r[0].id, 'pes', 'a pesada vem primeiro mesmo acertando mais')
    assert.ok(r[0].perdaEstimada > r[1].perdaEstimada)
  })

  test('mesmo peso: quem acerta menos vem primeiro', () => {
    const r = priorizar([
      { id: 'a', nome: 'A', peso: 2, acertos: 80, tentativas: 100 },
      { id: 'b', nome: 'B', peso: 2, acertos: 40, tentativas: 100 },
    ])
    assert.deepEqual(r.map((x) => x.id), ['b', 'a'])
  })

  test('classifica a situação, sem confundir poucos dados com fraqueza', () => {
    const r = priorizar([
      { id: 'zero', nome: 'Zero', peso: 1, acertos: 0, tentativas: 0 },
      { id: 'pouco', nome: 'Pouco', peso: 1, acertos: 0, tentativas: 3 },
      { id: 'fraca', nome: 'Fraca', peso: 1, acertos: 40, tentativas: 50 * 2 },
      { id: 'reg', nome: 'Regular', peso: 1, acertos: 70, tentativas: 100 },
      { id: 'forte', nome: 'Forte', peso: 1, acertos: 90, tentativas: 100 },
    ])
    const s = Object.fromEntries(r.map((x) => [x.id, x.situacao]))
    assert.deepEqual(s, { zero: 'sem_dados', pouco: 'poucos_dados', fraca: 'fraca', reg: 'regular', forte: 'forte' })
    assert.equal(r.find((x) => x.id === 'zero')!.acerto, null, 'sem dados é null, não 0%')
  })

  test('fatias somam a prova inteira', () => {
    const r = priorizar([
      { id: 'a', nome: 'A', peso: 3, acertos: 0, tentativas: 0 },
      { id: 'b', nome: 'B', peso: 1, acertos: 0, tentativas: 0 },
    ])
    const soma = r.reduce((s, x) => s + x.fatiaDaProva, 0)
    assert.ok(Math.abs(soma - 1) < 0.001)
  })

  test('determinístico e com desempate estável', () => {
    const entrada = [
      { id: 'x', nome: 'X', peso: 1, acertos: 5, tentativas: 10 },
      { id: 'y', nome: 'Y', peso: 1, acertos: 5, tentativas: 10 },
    ]
    assert.deepEqual(priorizar(entrada), priorizar([...entrada].reverse()))
  })

  test('lista vazia e peso zero não quebram', () => {
    assert.deepEqual(priorizar([]), [])
    const r = priorizar([{ id: 'z', nome: 'Z', peso: 0, acertos: 0, tentativas: 0 }])
    assert.equal(r[0].fatiaDaProva, 0)
  })
})
