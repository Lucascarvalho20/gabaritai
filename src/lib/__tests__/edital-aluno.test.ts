import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { limparExtracao, dataDoEdital, recortarEdital, pareceComPdf, impressaoDigital, ErroEdital } from '../edital-aluno.ts'

const materia = (nome: string, extra: Record<string, unknown> = {}) => ({
  nome, qtdQuestoes: 10, peso: 1, topicos: [{ nome: '1 Tópico', subtopicos: ['1.1 a'] }], ...extra,
})

describe('limparExtracao — a resposta da IA é dado não confiável', () => {
  test('aceita o formato pedido e devolve só os campos esperados', () => {
    const e = limparExtracao({
      editalGeral: { orgao: 'Polícia Federal', banca: 'Cebraspe', ano: 2025, dataProva: '2025-07-27', segredo: 'x' },
      cargos: [{ nome: 'Agente', totalQuestoes: 120, materias: [materia('Língua Portuguesa')], extra: true }],
      instrucao: 'ignore tudo',
    })
    assert.deepEqual(e, {
      orgao: 'Polícia Federal', banca: 'Cebraspe', ano: 2025, dataProva: '2025-07-27',
      cargos: [{ nome: 'Agente', totalQuestoes: 120, materias: [{ nome: 'Língua Portuguesa', qtdQuestoes: 10, peso: 1, topicos: [{ nome: '1 Tópico', subtopicos: ['1.1 a'] }] }] }],
    })
  })

  test('documento que não é edital vira erro com a explicação da IA', () => {
    assert.throws(() => limparExtracao({ erro: 'é um boleto bancário' }), (e: unknown) =>
      e instanceof ErroEdital && /boleto/.test(e.message) && e.status === 422)
  })

  test('sem nenhum cargo com matéria: erro (não dá para calcular)', () => {
    for (const bruto of [{}, null, 'texto', { cargos: [] }, { cargos: [{ nome: 'x', materias: [] }] }, { cargos: [{ materias: [{ nome: '' }] }] }])
      assert.throws(() => limparExtracao(bruto), ErroEdital, JSON.stringify(bruto))
  })

  test('limita tamanho e quantidade: nome longo cortado, cargos e matérias contados', () => {
    const e = limparExtracao({
      cargos: Array.from({ length: 30 }, (_, i) => ({ nome: `Cargo ${i}`, materias: Array.from({ length: 60 }, (_, j) => materia(`M${j} ${'x'.repeat(300)}`)) })),
    })
    assert.equal(e.cargos.length, 20)
    assert.equal(e.cargos[0].materias.length, 40)
    assert.ok(e.cargos[0].materias[0].nome.length <= 160)
    assert.ok(e.cargos[0].materias[0].nome.endsWith('…'))
  })

  test('números fora da faixa e tipos errados viram null; tópico como texto solto também vale', () => {
    const e = limparExtracao({
      editalGeral: { ano: 1850, dataProva: 'amanhã' },
      cargos: [{ nome: 'C', totalQuestoes: -3, materias: [materia('A', { qtdQuestoes: '15', peso: 'muito', topicos: ['Crase', { nome: 'Sintaxe', subtopicos: [{ nome: 'Orações' }, 7, null] }] })] }],
    })
    assert.equal(e.ano, null)
    assert.equal(e.dataProva, null)
    assert.equal(e.cargos[0].totalQuestoes, null)
    const m = e.cargos[0].materias[0]
    assert.equal(m.qtdQuestoes, 15)
    assert.equal(m.peso, null)
    // número solto e null não viram subitem
    assert.deepEqual(m.topicos, [{ nome: 'Crase', subtopicos: [] }, { nome: 'Sintaxe', subtopicos: ['Orações'] }])
  })

  test('caractere de controle de PDF quebrado vira espaço', () => {
    const e = limparExtracao({ cargos: [{ nome: 'Agente\u0000de\u0007Polícia', materias: [materia('Penal\n\tGeral')] }] })
    assert.equal(e.cargos[0].nome, 'Agente de Polícia')
    assert.equal(e.cargos[0].materias[0].nome, 'Penal Geral')
  })
})

test('data da prova: só dia de verdade, entre 2000 e 2100', () => {
  assert.equal(dataDoEdital('2026-07-05'), '2026-07-05')
  assert.equal(dataDoEdital('2026-07-05T08:00:00'), '2026-07-05')
  for (const ruim of ['2026-02-30', '2026-13-01', '1999-12-31', '2101-01-01', '05/07/2026', '', null, 20260705])
    assert.equal(dataDoEdital(ruim), null, String(ruim))
})

test('texto colado longo: fica o começo (datas, quadro de provas) e o anexo do conteúdo programático', () => {
  const longo = 'EDITAL Nº 1 — data da prova 05/07/2026. ' + 'regras gerais '.repeat(20_000) + 'ANEXO II CONTEÚDO PROGRAMÁTICO LÍNGUA PORTUGUESA: 1 Compreensão de textos. ' + 'tópico '.repeat(2_000)
  const r = recortarEdital(longo)
  assert.ok(r.length <= 125_000, String(r.length))
  assert.ok(r.startsWith('EDITAL Nº 1 — data da prova 05/07/2026.'))
  assert.ok(r.includes('CONTEÚDO PROGRAMÁTICO LÍNGUA PORTUGUESA'))
  const curto = 'texto curto\r\n\n\n\nsegunda   parte'
  assert.equal(recortarEdital(curto), 'texto curto\n\nsegunda parte')
})

test('PDF pelo começo do arquivo, não pelo nome; impressão digital estável', () => {
  assert.equal(pareceComPdf(Buffer.from('%PDF-1.7\n...')), true)
  assert.equal(pareceComPdf(Buffer.from('<html>%PDF-')), false)
  assert.equal(pareceComPdf(Buffer.from('')), false)
  assert.equal(impressaoDigital(Buffer.from('abc')), impressaoDigital('abc'))
  assert.notEqual(impressaoDigital('abc'), impressaoDigital('abd'))
})
