import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { corrigir, materiasEmBranco, normalizarResposta, prioridadesDeRevisao, type ItemParaCorrigir } from '../provas/correcao.ts'

const item = (id: string, gabarito: string | null, materia: string | null = 'Penal', anulada = false): ItemParaCorrigir =>
  ({ id, gabarito, anulada, materia })

describe('corrigir — Cebraspe (errada anula certa)', () => {
  const itens = [item('1', 'C'), item('2', 'E'), item('3', 'C'), item('4', 'E'), item('5', null, 'Penal', true)]

  test('acerto +1, erro −1, branco 0', () => {
    const r = corrigir(itens, { 1: 'C', 2: 'C', 3: 'C' }, true)
    assert.equal(r.acertos, 2)
    assert.equal(r.erros, 1)
    assert.equal(r.brancos, 1)
    assert.equal(r.pontos, 2 - 1 + 1) // + o anulado
  })

  test('item anulado dá o ponto a todos — até a quem deixou em branco', () => {
    const r = corrigir(itens, {}, true)
    assert.equal(r.anuladas, 1)
    assert.equal(r.pontos, 1)
    assert.equal(r.itens.find((i) => i.id === '5')!.situacao, 'anulada')
  })

  test('marcar o anulado não muda nada: a resposta é ignorada', () => {
    assert.equal(corrigir(itens, { 5: 'E' }, true).pontos, corrigir(itens, { 5: 'C' }, true).pontos)
  })

  test('chutar tudo errado deixa a nota negativa, como na Cebraspe', () => {
    const r = corrigir(itens, { 1: 'E', 2: 'C', 3: 'E', 4: 'C' }, true)
    assert.equal(r.pontos, -4 + 1)
    assert.ok(r.percentual < 0)
  })

  test('na dúvida, em branco vale mais que errar', () => {
    const errando = corrigir(itens, { 1: 'C', 2: 'C' }, true).pontos
    const branco = corrigir(itens, { 1: 'C' }, true).pontos
    assert.ok(branco > errando)
  })
})

describe('corrigir — múltipla escolha', () => {
  test('erro não desconta', () => {
    const itens = [item('1', 'A'), item('2', 'B'), item('3', 'D')]
    const r = corrigir(itens, { 1: 'A', 2: 'C' }, false)
    assert.equal(r.pontos, 1)
    assert.equal(r.erros, 1)
  })
})

describe('corrigir — por matéria', () => {
  const itens = [item('1', 'C', 'Penal'), item('2', 'E', 'Penal'), item('3', 'C', 'Português'), item('4', 'C', null)]

  test('a soma das matérias é o total', () => {
    const r = corrigir(itens, { 1: 'C', 2: 'C', 3: 'C', 4: 'E' }, true)
    const soma = (k: 'acertos' | 'erros' | 'brancos' | 'anuladas' | 'pontos') => r.porMateria.reduce((s, m) => s + m[k], 0)
    for (const k of ['acertos', 'erros', 'brancos', 'anuladas', 'pontos'] as const) assert.equal(soma(k), r[k], k)
  })

  test('item sem matéria cai em "Sem matéria", não some', () => {
    const r = corrigir(itens, {}, true)
    assert.ok(r.porMateria.some((m) => m.materia === 'Sem matéria'))
  })

  test('percentual por matéria = pontos ÷ itens', () => {
    const r = corrigir(itens, { 1: 'C', 2: 'C' }, true)
    assert.equal(r.porMateria.find((m) => m.materia === 'Penal')!.percentual, 0)
  })
})

describe('respostas', () => {
  test('normaliza caixa e espaço; o que não é alternativa vira branco', () => {
    assert.equal(normalizarResposta(' c '), 'C')
    assert.equal(normalizarResposta('Z'), null)
    assert.equal(normalizarResposta(1), null)
    assert.equal(normalizarResposta(null), null)
  })

  test('resposta de questão que não está na prova é ignorada', () => {
    const r = corrigir([item('1', 'C')], { 1: 'C', intrusa: 'E' }, true)
    assert.equal(r.pontos, 1)
    assert.equal(r.itens.length, 1)
  })
})

describe('prioridadesDeRevisao', () => {
  const m = (materia: string, total: number, pontos: number, anuladas = 0, erros = 1) =>
    ({ materia, total, acertos: Math.max(0, pontos), erros, brancos: 0, anuladas, pontos, percentual: pontos / total })

  test('pior primeiro, só abaixo do corte', () => {
    const r = prioridadesDeRevisao([m('A', 10, 7), m('B', 10, 2), m('C', 10, 4)])
    assert.deepEqual(r.map((x) => x.materia), ['B', 'C'])
  })

  test('matéria com poucos itens não entra: errar 1 de 2 não diz nada', () => {
    assert.equal(prioridadesDeRevisao([m('A', 2, 0)]).length, 0)
  })

  test('itens anulados não contam para o mínimo', () => {
    assert.equal(prioridadesDeRevisao([m('A', 4, 0, 2)]).length, 0)
  })

  test('matéria que o aluno nem tocou não entra: vai para "em branco"', () => {
    const intocada = { materia: 'Estatística', total: 12, acertos: 0, erros: 0, brancos: 12, anuladas: 0, pontos: 0, percentual: 0 }
    assert.equal(prioridadesDeRevisao([intocada]).length, 0)
    assert.deepEqual(materiasEmBranco([intocada, m('B', 10, 2)]), ['Estatística'])
  })
})
