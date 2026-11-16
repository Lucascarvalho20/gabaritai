import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { listarArquivosDeProva, lerArquivoDeProva, problemasDaProva, type ProvaArquivo } from '../provas/arquivo.ts'

describe('provas prontas no repositório', () => {
  const slugs = listarArquivosDeProva()

  test('existe pelo menos uma', () => {
    assert.ok(slugs.length > 0)
  })

  for (const slug of slugs) {
    test(`${slug}: arquivo válido, gabarito completo e fonte citada`, () => {
      const p = lerArquivoDeProva(slug)
      assert.deepEqual(problemasDaProva(p), [])
      assert.equal(p.slug, slug)
      assert.ok(p.fonte.aviso.length > 20)
    })
  }
})

describe('problemasDaProva', () => {
  const base = (): ProvaArquivo => ({
    slug: 'x-2021-a', curso: 'x', titulo: 'X', ano: 2021, banca: 'cebraspe', orgao: 'O', cargo: 'C', formato: 'CE',
    erradaAnulaCerta: true, duracaoMin: 240, incluiaDiscursiva: false, aplicadaEm: null,
    fonte: { pagina: 'p', caderno: 'c', gabarito: 'g', aviso: 'Reprodução permitida citada a fonte.' },
    textos: [{ codigo: 'T1', titulo: 'Texto T1', conteudo: '...' }],
    itens: [
      { numero: 1, materia: 'M', texto: 'T1', comando: 'julgue', enunciado: 'a', gabarito: 'C', anulada: false, figura: false, formula: false, pagina: 2 },
      { numero: 2, materia: 'M', texto: null, comando: 'julgue', enunciado: 'b', gabarito: null, anulada: true, figura: false, formula: false, pagina: 2 },
    ],
  })

  test('arquivo certo não tem problema', () => assert.deepEqual(problemasDaProva(base()), []))

  test('pega numeração quebrada, gabarito fora do formato, texto inexistente e item sem matéria', () => {
    const p = base()
    p.itens[1].numero = 3
    p.itens[0].gabarito = 'A'
    p.itens[0].texto = 'T9'
    p.itens[1].materia = ''
    const erros = problemasDaProva(p).join(' | ')
    for (const trecho of ['numeração', 'gabarito inválido', 'T9', 'sem matéria']) assert.match(erros, new RegExp(trecho))
  })

  test('anulado não pode ter gabarito, e não anulado precisa ter', () => {
    const p = base()
    p.itens[1].gabarito = 'C'
    p.itens[0].gabarito = null
    const erros = problemasDaProva(p).join(' | ')
    assert.match(erros, /anulado com gabarito/)
    assert.match(erros, /gabarito inválido/)
  })

  test('sem fonte não importa: citar a fonte é condição da banca', () => {
    const p = base()
    p.fonte.aviso = ''
    assert.match(problemasDaProva(p).join(), /fonte/)
  })

  test('múltipla escolha exige as alternativas certas, com texto; certo/errado não tem', () => {
    const p = base()
    p.formato = 'ME_5'
    p.itens[0].gabarito = 'B'
    p.itens[0].alternativas = ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: `opção ${letra}` }))
    p.itens[1].alternativas = ['A', 'B', 'C', 'D'].map((letra) => ({ letra, texto: 'x' }))
    assert.match(problemasDaProva(p).join(), /item 2: alternativas ABCD \(esperado ABCDE\)/)
    p.itens[1].alternativas = ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: letra === 'C' ? ' ' : 'x' }))
    assert.match(problemasDaProva(p).join(), /item 2: alternativa sem texto/)
    const ce = base()
    ce.itens[0].alternativas = [{ letra: 'C', texto: 'Certo' }]
    assert.match(problemasDaProva(ce).join(), /certo\/errado não tem alternativas/)
  })

  test('slug de matéria precisa ser um slug', () => {
    const p = base()
    p.materiasSlug = { M: 'Legislação de Trânsito' }
    assert.match(problemasDaProva(p).join(), /materiasSlug inválido/)
    p.materiasSlug = { M: 'legislacao-transito' }
    assert.deepEqual(problemasDaProva(p), [])
  })
})
