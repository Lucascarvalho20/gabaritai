import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { caminhoInternoSeguro, destinoOuPadrao, DESTINO_PADRAO } from '../safe-redirect.ts'

describe('caminhoInternoSeguro', () => {
  test('aceita caminho interno', () => {
    assert.equal(caminhoInternoSeguro('/dashboard'), '/dashboard')
    assert.equal(caminhoInternoSeguro('/checkout/teste-1-real'), '/checkout/teste-1-real')
    assert.equal(caminhoInternoSeguro('/cursos?area=policial'), '/cursos?area=policial')
  })

  // Cada um destes manda a vítima pra fora do site mantendo o domínio
  // verdadeiro no link que ela clicou. É o open redirect.
  test('recusa destino externo', () => {
    const ataques = [
      'https://site-falso.com',
      'http://site-falso.com',
      '//site-falso.com',          // relativo ao protocolo: o navegador resolve como externo
      '/\\site-falso.com',         // '\' normalizado vira '//'
      '\\\\site-falso.com',
      '%2F%2Fsite-falso.com',      // '//' percent-encoded
      'javascript:alert(1)',
      'dashboard',                 // relativo solto
    ]
    for (const a of ataques) {
      assert.equal(caminhoInternoSeguro(a), null, `deveria recusar: ${a}`)
    }
  })

  test('recusa quebra de linha (header injection)', () => {
    assert.equal(caminhoInternoSeguro('/ok\nLocation: https://falso.com'), null)
    assert.equal(caminhoInternoSeguro('/ok\r\nSet-Cookie: a=b'), null)
  })

  test('recusa vazio e inválido sem lançar', () => {
    assert.equal(caminhoInternoSeguro(null), null)
    assert.equal(caminhoInternoSeguro(undefined), null)
    assert.equal(caminhoInternoSeguro(''), null)
    assert.equal(caminhoInternoSeguro('   '), null)
    assert.equal(caminhoInternoSeguro('%E0%A4%A'), null) // percent-encoding quebrado
  })

  test('destinoOuPadrao cai no padrão quando recusa', () => {
    assert.equal(destinoOuPadrao('//site-falso.com'), DESTINO_PADRAO)
    assert.equal(destinoOuPadrao(null), DESTINO_PADRAO)
    assert.equal(destinoOuPadrao('/admin'), '/admin')
    assert.equal(destinoOuPadrao(null, '/admin'), '/admin')
  })
})
