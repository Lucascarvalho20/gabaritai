import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { validarPlano, exigirMateria } from '../agente/plano.ts'

const escopo = new Map([['pen', 'Direito Penal'], ['por', 'Língua Portuguesa']])
const prioridade = (materia_id: string, extra: object = {}) => ({
  materia_id, motivo: 'Maior perda estimada.', acoes: ['Revisar princípios'], ...extra,
})

describe('validarPlano', () => {
  test('plano válido sai com o nome do BANCO, não o do modelo', () => {
    const p = validarPlano({ resumo: 'Foque em Penal.', prioridades: [prioridade('pen', { materia: 'Penal Avançado (inventado)' })] }, escopo)
    assert.equal(p.prioridades[0].materia, 'Direito Penal')
  })

  // O modelo não inventa matéria nem acessa fora do edital do aluno.
  test('matéria fora do escopo é recusada', () => {
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [prioridade('contabilidade')] }, escopo), /não é matéria do edital/)
  })

  test('limites de tamanho e quantidade', () => {
    assert.throws(() => validarPlano({ resumo: '', prioridades: [prioridade('pen')] }, escopo), /resumo/)
    assert.throws(() => validarPlano({ resumo: 'x'.repeat(701), prioridades: [prioridade('pen')] }, escopo), /700/)
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [] }, escopo), /1 a 4/)
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [prioridade('pen', { acoes: [] })] }, escopo), /acoes/)
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [prioridade('pen', { motivo: 'y'.repeat(321) })] }, escopo), /motivo/)
  })

  test('matéria repetida é recusada', () => {
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [prioridade('pen'), prioridade('pen')] }, escopo), /repetida/)
  })

  test('entrada com tipo errado não explode com TypeError', () => {
    assert.throws(() => validarPlano({ resumo: 42 as any, prioridades: 'nada' as any }, escopo), /resumo/)
    assert.throws(() => validarPlano({ resumo: 'x', prioridades: [null] as any }, escopo), /materia_id/)
  })
})

describe('exigirMateria', () => {
  test('aceita id do escopo, recusa o resto', () => {
    assert.equal(exigirMateria({ materia_id: 'pen' }, escopo), 'pen')
    assert.throws(() => exigirMateria({ materia_id: 'outra' }, escopo))
    assert.throws(() => exigirMateria({}, escopo))
  })
})
