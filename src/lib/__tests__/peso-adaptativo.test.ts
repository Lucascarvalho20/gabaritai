import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  acertoSuavizado, fatorDesempenho, aplicarDesempenho, FATOR_MIN, FATOR_MAX,
} from '../peso-adaptativo.ts'
import { buildSchedule } from '../schedule-algorithm.ts'

describe('fatorDesempenho', () => {
  test('sem histórico, nada muda', () => {
    assert.equal(acertoSuavizado({ acertos: 0, tentativas: 0 }), 0.7)
    assert.equal(fatorDesempenho({ acertos: 0, tentativas: 0 }), 1)
  })

  test('no alvo (70%), nada muda', () => {
    assert.equal(fatorDesempenho({ acertos: 70, tentativas: 100 }), 1)
  })

  test('abaixo do alvo, a matéria ganha tempo', () => {
    assert.equal(fatorDesempenho({ acertos: 48, tentativas: 100 }), 1.4)
  })

  test('acima do alvo, a matéria cede tempo', () => {
    assert.ok(fatorDesempenho({ acertos: 90, tentativas: 100 }) < 1)
  })

  // O ponto da suavização: duas questões erradas não podem pesar como vinte.
  test('amostra pequena reage pouco', () => {
    const poucas = fatorDesempenho({ acertos: 0, tentativas: 2 })
    const muitas = fatorDesempenho({ acertos: 0, tentativas: 20 })
    assert.ok(poucas > 1 && poucas < 1.3, `2 erros: ${poucas}`)
    assert.ok(muitas > poucas, 'mais evidência, mais ajuste')
  })

  test('nunca passa dos limites, nem nos extremos', () => {
    assert.equal(fatorDesempenho({ acertos: 0, tentativas: 10_000 }), FATOR_MAX)
    assert.equal(fatorDesempenho({ acertos: 10_000, tentativas: 10_000 }), FATOR_MIN)
  })

  test('dado inconsistente não quebra a conta', () => {
    // mais acertos que tentativas, negativos: o banco não deveria ter isso, mas
    // se tiver, o fator continua dentro dos limites
    for (const d of [{ acertos: 50, tentativas: 10 }, { acertos: -5, tentativas: 10 }, { acertos: 3, tentativas: -1 }]) {
      const f = fatorDesempenho(d)
      assert.ok(f >= FATOR_MIN && f <= FATOR_MAX, JSON.stringify(d))
    }
  })
})

describe('aplicarDesempenho', () => {
  const materias = [
    { id: 'pen', name: 'Direito Penal', weight: 3 },
    { id: 'por', name: 'Português', weight: 3 },
    { id: 'inf', name: 'Informática', weight: 1 },
  ]

  test('nenhuma matéria some', () => {
    const { materias: r } = aplicarDesempenho(materias, new Map([
      ['pen', { acertos: 0, tentativas: 500 }],
      ['por', { acertos: 500, tentativas: 500 }],
    ]))
    assert.equal(r.length, 3)
    for (const m of r) assert.ok(m.weight > 0, m.name)
  })

  test('explica cada ajuste', () => {
    const { ajustes } = aplicarDesempenho(materias, new Map([['pen', { acertos: 24, tentativas: 50 }]]))
    const penal = ajustes.find((a) => a.id === 'pen')!
    assert.equal(penal.acerto, 0.48)
    assert.equal(penal.tentativas, 50)
    assert.ok(penal.fator > 1)
    const info = ajustes.find((a) => a.id === 'inf')!
    assert.equal(info.acerto, null, 'sem histórico mostra null, não 0%')
    assert.equal(info.fator, 1)
  })
})

// O teste que prova a promessa da home, com o algoritmo de verdade.
describe('cronograma real com adaptação', () => {
  const base = {
    startDate: new Date('2027-01-04'),
    endDate: new Date('2027-04-30'),
    hoursPerDay: 3,
    daysPerWeek: [1, 2, 3, 4, 5],
    includeMocks: false,
    prePresenceMode: false,
  }
  const materias = [
    { id: 'pen', name: 'Direito Penal', weight: 2 },
    { id: 'por', name: 'Português', weight: 2 },
    { id: 'inf', name: 'Informática', weight: 2 },
  ]

  test('onde o aluno erra mais, ganha mais tempo; total não muda', () => {
    const sem = buildSchedule({ ...base, subjects: materias })
    const { materias: ajustadas } = aplicarDesempenho(materias, new Map([
      ['pen', { acertos: 30, tentativas: 100 }],  // fraco
      ['por', { acertos: 92, tentativas: 100 }],  // forte
    ]))
    const com = buildSchedule({ ...base, subjects: ajustadas })

    assert.ok(com.perSubject.pen.minutes > sem.perSubject.pen.minutes, 'Penal ganhou tempo')
    assert.ok(com.perSubject.por.minutes < sem.perSubject.por.minutes, 'Português cedeu tempo')
    assert.ok(com.perSubject.inf.minutes > 0, 'Informática continua no cronograma')
    assert.equal(com.totalMinAvailable, sem.totalMinAvailable, 'tempo total igual')
    assert.equal(com.isFeasible, sem.isFeasible, 'viabilidade não depende do ajuste')
  })
})
