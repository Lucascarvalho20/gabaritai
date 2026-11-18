import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { estimarEdital, type MateriaConteudo, type TopicoConteudo } from '../tempo-estudo.ts'
import {
  similaridade, juntar, pontosDaMateria, etapasDeDuasProvas, avaliarEtapas, prioridadePorPontos,
  contarTopicos, normalizarMateria, casarMateria, estimarPrograma, referenciasPorTopico, diasDaSemana,
  SIMILARIDADE_MINIMA, MIN_TOPICO_REFERENCIA,
} from '../calculadora.ts'

let seq = 0
const topicos = (n: number, palavras: number | null = 1200): TopicoConteudo[] =>
  Array.from({ length: n }, () => ({ id: `t${seq++}`, palavras, publicado: false }))
const materia = (id: string, ts: TopicoConteudo[], extra: Partial<MateriaConteudo> = {}): MateriaConteudo =>
  ({ id, nome: id, peso: 1, topicos: ts, questoes: 0, tempoQuestao: null, ...extra })
const dia = (iso: string) => new Date(`${iso}T12:00:00`)
const hoje = dia('2027-01-01')

// Os tópicos são compartilhados pela matéria: os mesmos objetos nos dois editais, como no banco.
const penal = topicos(6)
const consti = topicos(6)
const contab = topicos(2)
const papilo = topicos(2)
const agente = estimarEdital([materia('penal', penal), materia('consti', consti), materia('contab', contab)])
const papiloscopista = estimarEdital([materia('penal', penal), materia('consti', consti), materia('papilo', papilo)])
const pm = estimarEdital([materia('penal-militar', topicos(6)), materia('legislacao-pm', topicos(6)), materia('consti', consti)])

describe('dois cursos — parecidos e juntos', () => {
  test('conteúdo em comum medido sobre o curso menor', () => {
    const s = similaridade(agente, papiloscopista)
    // 12 dos 14 tópicos de cada um são comuns
    assert.ok(Math.abs(s.percentual - 12 / 14) < 0.002, String(s.percentual))
    assert.deepEqual(s.materiasComuns.sort(), ['consti', 'penal'])
    assert.equal(s.parecidos, true)
  })

  test('pouco em comum: não são parecidos', () => {
    const s = similaridade(agente, pm)
    assert.ok(s.percentual < SIMILARIDADE_MINIMA, String(s.percentual))
    assert.equal(s.parecidos, false)
  })

  test('juntar conta a matéria comum uma vez só', () => {
    const j = juntar(agente, papiloscopista)
    assert.equal(j.materias.length, 4)
    const esperado = agente.totalMin + papiloscopista.totalMin - (agente.totalMin - agente.materias.find((m) => m.id === 'contab')!.totalMin)
    assert.ok(Math.abs(j.totalMin - esperado) < 0.2, `${j.totalMin} ≠ ${esperado}`)
    assert.ok(j.totalMin < agente.totalMin + papiloscopista.totalMin)
  })

  test('juntar soma os pontos da matéria que cai nas duas provas', () => {
    const a = estimarEdital([materia('penal', penal, { questoesNaProva: 18 }), materia('contab', contab, { questoesNaProva: 12 })])
    const b = estimarEdital([materia('penal', penal, { questoesNaProva: 10 })])
    const j = juntar(a, b)
    assert.equal(pontosDaMateria(j.materias.find((m) => m.id === 'penal')!), 28)
    assert.equal(pontosDaMateria(j.materias.find((m) => m.id === 'contab')!), 12)
  })

  test('pontos: as questões da matéria na prova; sem elas, o peso', () => {
    assert.equal(pontosDaMateria({ peso: 2, questoesNaProva: 15 }), 15)
    assert.equal(pontosDaMateria({ peso: 2, questoesNaProva: null }), 2)
    assert.equal(pontosDaMateria({ peso: 3 }), 3)
  })
})

describe('duas provas em datas diferentes', () => {
  const a = { rotulo: 'A', totalMin: 600, dataProva: dia('2027-03-01') }
  const b = { rotulo: 'B', totalMin: 900, dataProva: dia('2027-02-01') }

  test('a prova mais cedo cobra só o conteúdo dela; a segunda, o dos dois', () => {
    const e = etapasDeDuasProvas(a, b, 1200)
    assert.deepEqual(e.map((x) => [x.rotulo, x.totalMin]), [['B', 900], ['A + B', 1200]])
    assert.equal(e[1].dataProva!.getTime(), a.dataProva.getTime())
  })

  test('mesma data, ou sem data: o conteúdo junto', () => {
    assert.deepEqual(etapasDeDuasProvas(a, { ...b, dataProva: a.dataProva }, 1200).map((x) => x.totalMin), [1200])
    const semData = etapasDeDuasProvas({ ...a, dataProva: null }, { ...b, dataProva: null }, 1200)
    assert.equal(semData.length, 1)
    assert.equal(semData[0].dataProva, null)
  })

  test('só uma com data: ela é o prazo da parte dela', () => {
    const e = etapasDeDuasProvas({ ...a, dataProva: null }, b, 1200)
    assert.deepEqual(e.map((x) => [x.rotulo, x.totalMin, x.dataProva?.toISOString() ?? null]), [['B', 900, b.dataProva.toISOString()], ['A + B', 1200, null]])
  })

  test('cabe só se cabe nas duas; as horas necessárias são as da etapa mais apertada', () => {
    // 2 h/dia = 4 pomodoros = 100 min de foco; 7 dias por semana
    const d = { horasPorDia: 2, diasPorSemana: 7, hoje }
    const folgada = avaliarEtapas([{ rotulo: 'x', totalMin: 1000, dataProva: dia('2027-02-01') }], d)
    assert.equal(folgada.cabe, true)
    const apertada = avaliarEtapas([
      { rotulo: 'x', totalMin: 1000, dataProva: dia('2027-02-01') }, // 31 dias × 100 = 3.100: cabe
      { rotulo: 'x+y', totalMin: 9000, dataProva: dia('2027-02-15') }, // 45 × 100 = 4.500: não cabe
    ], d)
    assert.equal(apertada.cabe, false)
    assert.equal(apertada.horasPorDiaNecessarias, apertada.etapas[1].veredito.horasPorDiaNecessarias)
    assert.ok(apertada.horasPorDiaNecessarias! > 2)
  })

  test('sem nenhuma data: não há veredito, só o fim', () => {
    const r = avaliarEtapas([{ rotulo: 'x', totalMin: 1000, dataProva: null }], { horasPorDia: 2, diasPorSemana: 7, hoje })
    assert.equal(r.cabe, undefined)
    assert.equal(r.horasPorDiaNecessarias, undefined)
    assert.equal(r.etapas[0].veredito.diasParaTerminar, 10)
  })
})

describe('por onde começar quando não cabe', () => {
  const materias = [
    { id: 'a', nome: 'A', pontos: 10, totalMin: 600 }, // 0,017 ponto/min
    { id: 'b', nome: 'B', pontos: 20, totalMin: 400 }, // 0,05
    { id: 'c', nome: 'C', pontos: 6, totalMin: 200 },  // 0,03
  ]

  test('mais pontos por minuto primeiro; a última entra pela fração que cabe', () => {
    const p = prioridadePorPontos(materias, 700)
    assert.deepEqual(p.itens.map((m) => [m.id, m.fracao]), [['b', 1], ['c', 1], ['a', 0.167]])
    assert.equal(p.pontosTotais, 36)
    assert.ok(Math.abs(p.pontosCobertos - (20 + 6 + 10 * 100 / 600)) < 0.1, String(p.pontosCobertos))
  })

  test('tempo de sobra cobre tudo; tempo zero, nada', () => {
    assert.equal(prioridadePorPontos(materias, 5000).percentual, 1)
    const nada = prioridadePorPontos(materias, 0)
    assert.equal(nada.pontosCobertos, 0)
    assert.ok(nada.itens.every((m) => m.fracao === 0))
  })

  test('matéria sem tempo estimado vem primeiro e sempre conta', () => {
    const p = prioridadePorPontos([...materias, { id: 'z', nome: 'Z', pontos: 1, totalMin: 0 }], 0)
    assert.equal(p.itens[0].id, 'z')
    assert.equal(p.itens[0].fracao, 1)
  })
})

describe('edital em PDF — a suposição pelo programa', () => {
  test('conta os subitens; o item que só agrupa não soma', () => {
    assert.equal(contarTopicos([
      { nome: '1 Crase', subtopicos: [] },
      { nome: '2 Sintaxe', subtopicos: ['2.1 Termos', '2.2 Orações', '2.3 Período'] },
    ]), 4)
  })

  test('nomes do edital casam com a matéria do site sem acento, sem "Noções de"', () => {
    assert.equal(normalizarMateria('Noções de Direito Penal'), 'direito penal')
    assert.equal(normalizarMateria('DIREITO PENAL'), 'direito penal')
    assert.equal(normalizarMateria('Língua Portuguesa'), 'lingua portuguesa')
    assert.equal(normalizarMateria('Português'), 'lingua portuguesa')
    assert.equal(normalizarMateria('Matemática e Raciocínio Lógico'), 'raciocinio logico')
    const site = [{ nome: 'Direito Penal' }, { nome: 'Direito Penal Militar' }]
    assert.equal(casarMateria('Noções de Direito Penal', site)?.nome, 'Direito Penal')
    assert.equal(casarMateria('Direito Penal Militar', site)?.nome, 'Direito Penal Militar')
    assert.equal(casarMateria('Direito Processual Penal', site), null) // parecido não basta
  })

  test('tempo = tópicos do edital × tempo por tópico da matéria do site', () => {
    const r = estimarPrograma(
      [
        { nome: 'Noções de Direito Penal', qtdQuestoes: 15, peso: null, topicos: [{ nome: 'a', subtopicos: [] }, { nome: 'b', subtopicos: ['b1', 'b2'] }] },
        { nome: 'Geografia do Goiás', qtdQuestoes: 5, peso: 2, topicos: [{ nome: 'x', subtopicos: [] }] },
      ],
      [{ id: 'penal', nome: 'Direito Penal', minPorTopico: 40 }],
      30,
    )
    const penal = r.materias.find((m) => m.nome === 'Noções de Direito Penal')!
    assert.deepEqual([penal.topicos, penal.minPorTopico, penal.totalMin, penal.base, penal.materiaDoSite, penal.pontos], [3, 40, 120, 'materia', 'Direito Penal', 15])
    const geo = r.materias.find((m) => m.nome === 'Geografia do Goiás')!
    assert.deepEqual([geo.topicos, geo.totalMin, geo.base, geo.pontos], [1, 30, 'plataforma', 10])
    assert.equal(r.totalMin, 150)
    assert.equal(r.percentualPelaMateria, 0.8)
  })

  test('matéria sem programa no edital recebe a mediana de tópicos das outras', () => {
    const r = estimarPrograma(
      [
        { nome: 'A', qtdQuestoes: null, peso: null, topicos: [{ nome: '1', subtopicos: [] }, { nome: '2', subtopicos: [] }] },
        { nome: 'B', qtdQuestoes: null, peso: null, topicos: [{ nome: '1', subtopicos: ['a', 'b', 'c', 'd'] }] },
        { nome: 'C', qtdQuestoes: null, peso: null, topicos: [] },
      ],
      [], null,
    )
    const c = r.materias.find((m) => m.nome === 'C')!
    assert.equal(c.semPrograma, true)
    assert.equal(c.topicos, 3) // mediana de 2 e 4
    assert.equal(c.base, 'referencia')
    assert.ok(Math.abs(c.minPorTopico - MIN_TOPICO_REFERENCIA) < 0.1)
    assert.ok(r.materias.every((m) => m.pontos === 1 && !m.pontosInformados))
  })

  test('referência por tópico: total da matéria ÷ tópicos que somam tempo, só de matéria medida', () => {
    const medido = estimarEdital([materia('penal', topicos(4, 2400)), materia('vazia', topicos(3, null))])
    const r = referenciasPorTopico([medido])
    assert.equal(r.porMateria.length, 1)
    const penalEst = medido.materias.find((m) => m.id === 'penal')!
    assert.ok(Math.abs(r.porMateria[0].minPorTopico - penalEst.totalMin / 4) < 0.1)
    assert.equal(r.geral, r.porMateria[0].minPorTopico)
    assert.deepEqual(referenciasPorTopico([]), { porMateria: [], geral: null })
  })
})

test('dias por semana viram os dias do cronograma, de segunda em diante', () => {
  assert.deepEqual(diasDaSemana(5), [1, 2, 3, 4, 5])
  assert.deepEqual(diasDaSemana(6), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(diasDaSemana(7), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(diasDaSemana(0), [1])
  assert.deepEqual(diasDaSemana(99), [0, 1, 2, 3, 4, 5, 6])
})
