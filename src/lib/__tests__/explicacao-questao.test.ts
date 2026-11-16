import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ehCertoErrado, promptDeExplicacao } from '../explicacao-questao.ts'

describe('prompt da explicação', () => {
  const ce = { enunciado: 'O inquérito policial é indispensável à ação penal.', alternativas: [{ letra: 'C', texto: 'Certo' }, { letra: 'E', texto: 'Errado' }], gabarito: 'E' }
  const me = {
    enunciado: 'Assinale a alternativa correta.',
    alternativas: ['A', 'B', 'C', 'D', 'E'].map((l) => ({ letra: l, texto: `opção ${l}` })),
    gabarito: 'c',
  }

  test('reconhece certo/errado com e sem alternativas cadastradas', () => {
    assert.equal(ehCertoErrado(ce), true)
    assert.equal(ehCertoErrado({ alternativas: [], gabarito: 'C' }), true)
    assert.equal(ehCertoErrado(me), false)
    assert.equal(ehCertoErrado({ alternativas: null, gabarito: 'A' }), false)
  })

  test('item errado: pede o trecho que erra e a versão correta', () => {
    const p = promptDeExplicacao({ ...ce, bancaSlug: 'cebraspe', orgao: 'PF', ano: 2021 })
    assert.match(p, /Gabarito oficial: ERRADO/)
    assert.match(p, /como ficaria a afirmação correta/)
    assert.match(p, /CEBRASPE PF 2021/)
    assert.match(p, /nunca o contradiga/)
  })

  test('múltipla escolha: lista as alternativas e normaliza a letra do gabarito', () => {
    const p = promptDeExplicacao(me)
    assert.match(p, /Gabarito oficial: letra C/)
    assert.match(p, /E\) opção E/)
    assert.match(p, /Por que as outras estão erradas/)
  })

  test('leva o texto-base e o comando, e corta texto gigante', () => {
    const p = promptDeExplicacao({ ...ce, comando: 'Julgue os itens a seguir.', textoBase: { titulo: 'Texto 1', conteudo: 'x'.repeat(5000) } })
    assert.match(p, /Comando da questão: Julgue os itens a seguir\./)
    assert.match(p, /Texto-base \(Texto 1\)/)
    assert.match(p, /texto cortado/)
    assert.ok(p.length < 5000)
  })
})
