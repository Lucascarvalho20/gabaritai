import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { avisosDoRelatorio, julgar, type Excecao } from '../../../scripts/ci/auditoria.ts'
import { procurarSegredos, scriptsDaPagina, lerArgs } from '../../../scripts/ci/fumaca.ts'
import { pendentes } from '../../../scripts/ci/migracoes-pendentes.ts'

describe('auditoria de dependências', () => {
  const relatorio = {
    vulnerabilities: {
      next: { via: [
        { url: 'https://github.com/advisories/GHSA-aaaa', severity: 'critical', title: 'RCE', name: 'next' },
        { url: 'https://github.com/advisories/GHSA-bbbb', severity: 'moderate', title: 'XSS', name: 'next' },
      ] },
      postcss: { via: [{ url: 'https://github.com/advisories/GHSA-cccc', severity: 'high', title: 'leitura', name: 'postcss' }] },
      // Herdado: o aviso já aparece no pacote de origem e não pode contar duas vezes.
      'eslint-config-next': { via: ['next'] },
    },
  }
  const ex = (id: string, vence: string): Excecao => ({ id, pacote: 'x', motivo: 'analisado', vence })

  test('lê cada aviso uma vez, ignorando os herdados', () => {
    assert.deepEqual(avisosDoRelatorio(relatorio).map((a) => a.id).sort(), ['GHSA-aaaa', 'GHSA-bbbb', 'GHSA-cccc'])
  })

  test('grave sem exceção bloqueia; moderado não', () => {
    const r = julgar(avisosDoRelatorio(relatorio), [], new Date('2026-11-16'))
    assert.deepEqual(r.bloqueiam.map((b) => b.aviso.id).sort(), ['GHSA-aaaa', 'GHSA-cccc'])
    assert.equal(r.menores.length, 1)
  })

  test('exceção vale até o dia do vencimento e depois volta a bloquear', () => {
    const excecoes = [ex('GHSA-aaaa', '2027-01-31'), ex('GHSA-cccc', '2027-01-31')]
    assert.equal(julgar(avisosDoRelatorio(relatorio), excecoes, new Date('2027-01-31T12:00:00Z')).bloqueiam.length, 0)
    const depois = julgar(avisosDoRelatorio(relatorio), excecoes, new Date('2027-02-01T12:00:00Z'))
    assert.equal(depois.bloqueiam.length, 2)
    assert.match(depois.bloqueiam[0].porque, /venceu em 2027-01-31/)
  })

  test('exceção de aviso que sumiu aparece como sem uso', () => {
    const r = julgar(avisosDoRelatorio(relatorio), [ex('GHSA-zzzz', '2027-01-31')], new Date('2026-11-16'))
    assert.deepEqual(r.semUso.map((e) => e.id), ['GHSA-zzzz'])
  })
})

describe('teste de fumaça', () => {
  test('acha segredos conhecidos e mascara o valor', () => {
    const vazado = `const k="gsk_${'a'.repeat(52)}"; const db="postgresql://user:senha123@db.supabase.co:5432/postgres"`
    const achados = procurarSegredos(vazado)
    assert.deepEqual(achados.map((a) => a.nome), ['chave do Groq', 'URL de banco com senha'])
    assert.ok(achados.every((a) => !a.amostra.includes('senha123') && !a.amostra.includes('a'.repeat(20))))
  })

  test('não confunde código comum com segredo', () => {
    const comum = 'const url="https://api.groq.com/openai/v1"; const sk="sk-curto"; fetch("/api/me/questoes")'
    assert.deepEqual(procurarSegredos(comum), [])
  })

  test('pega só os scripts do próprio site', () => {
    const html = '<script src="/_next/static/chunks/a.js"></script><script src="https://cdn.externo.com/x.js"></script><script src="/_next/static/chunks/b.js?v=1&amp;x=2" async></script>'
    assert.deepEqual(scriptsDaPagina(html, 'https://site.app'), ['https://site.app/_next/static/chunks/a.js', 'https://site.app/_next/static/chunks/b.js?v=1&x=2'])
  })

  test('argumentos: exige site e corta a versão em 7 letras', () => {
    assert.deepEqual(lerArgs(['--site', 'https://site.app/', '--versao', '1234567890', '--esperar', '900']), { site: 'https://site.app', versao: '1234567', esperar: 900 })
    assert.throws(() => lerArgs(['--site', 'site.app']), /Informe o endereço/)
  })
})

describe('migrações pendentes', () => {
  test('lista o que falta, na ordem do manifesto', () => {
    assert.deepEqual(pendentes(['a', 'b', 'c'], ['c', 'a']), ['b'])
    assert.deepEqual(pendentes(['a'], ['a', 'z']), [])
  })
})
