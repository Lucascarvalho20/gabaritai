import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { urlDoSite } from '../site-url.ts'

const ORIGINAL = { ...process.env }

describe('urlDoSite', () => {
  afterEach(() => { process.env = { ...ORIGINAL } })

  // O valor real que estava na Vercel: colado com duas quebras de linha.
  test('remove quebras de linha coladas junto', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://gabaritai-red.vercel.app\n\n'
    assert.equal(urlDoSite(), 'https://gabaritai-red.vercel.app')
  })

  test('remove barra final e espaços', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '  https://exemplo.com.br//  '
    assert.equal(urlDoSite(), 'https://exemplo.com.br')
  })

  test('valor inválido cai no padrão em vez de publicar lixo', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'gabaritai sem protocolo'
    assert.equal(urlDoSite(), 'https://gabaritai-red.vercel.app')
  })

  test('sem variável nenhuma, usa o padrão', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_BASE_URL
    assert.equal(urlDoSite(), 'https://gabaritai-red.vercel.app')
  })
})
