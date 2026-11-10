import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  estimarEdital, cabeNoTempo, mediana,
  PALAVRAS_POR_MINUTO, REVISAO_FRACAO, MIN_AMOSTRAS, MIN_POR_QUESTAO_REFERENCIA, PALAVRAS_TOPICO_REFERENCIA,
  type MateriaConteudo, type TopicoConteudo,
} from '../tempo-estudo.ts'
import { MIX } from '../schedule-algorithm.ts'

const quase = (a: number, b: number, tol = 0.11) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`)
let seq = 0
const topico = (palavras: number | null, publicado = false): TopicoConteudo => ({ id: `t${seq++}`, palavras, publicado })
const materia = (nome: string, topicos: TopicoConteudo[], extra: Partial<MateriaConteudo> = {}): MateriaConteudo =>
  ({ id: nome.toLowerCase(), nome, peso: 1, topicos, questoes: 0, tempoQuestao: null, ...extra })
const so = (r: ReturnType<typeof estimarEdital>, nome: string) => r.materias.find((m) => m.nome === nome)!

describe('estimarEdital — teoria pelo tamanho do material', () => {
  test('teoria medida = palavras ÷ 120 por minuto', () => {
    const r = estimarEdital([materia('Penal', [topico(1200), topico(2400)])])
    assert.equal(PALAVRAS_POR_MINUTO, 120)
    assert.equal(so(r, 'Penal').teoriaMin, 30) // 10 + 20
    assert.equal(so(r, 'Penal').topicosMedidos, 2)
    assert.equal(so(r, 'Penal').palavras, 3600)
  })

  test('revisão segue a proporção do cronograma (revisão ÷ estudo novo)', () => {
    assert.equal(REVISAO_FRACAO, MIX.REVISAO / MIX.ESTUDO)
    const r = estimarEdital([materia('Penal', [topico(1200), topico(2400)])])
    quase(so(r, 'Penal').revisaoMin, 30 * REVISAO_FRACAO)
  })

  test('tópico sem material herda a mediana dos tópicos medidos da MESMA matéria', () => {
    const r = estimarEdital([materia('Penal', [topico(1200), topico(3600), topico(null)])])
    assert.equal(so(r, 'Penal').teoriaMin, 10 + 30 + 20)
    assert.equal(so(r, 'Penal').topicosMedidos, 2)
  })

  test('matéria sem nenhum tópico medido usa a mediana do edital inteiro', () => {
    const r = estimarEdital([
      materia('Penal', [topico(1200), topico(2400), topico(3600)]), // 10, 20, 30 → mediana 20
      materia('Português', [topico(null), topico(null)]),
    ])
    assert.equal(so(r, 'Português').teoriaMin, 40)
    assert.equal(so(r, 'Português').medidoMin, 0)
  })

  test('edital sem material nenhum usa o tamanho padrão de um material da plataforma', () => {
    const r = estimarEdital([materia('Penal', [topico(null), topico(null), topico(null)])])
    quase(so(r, 'Penal').teoriaMin, (3 * PALAVRAS_TOPICO_REFERENCIA) / PALAVRAS_POR_MINUTO)
    assert.equal(r.percentualMedido, 0)
  })

  test('rascunho mede o tamanho, mas só material publicado conta como publicado', () => {
    const r = estimarEdital([materia('Penal', [topico(1200, true), topico(2400, false), topico(null)])])
    assert.equal(r.topicosMedidos, 2)
    assert.equal(r.topicosPublicados, 1)
  })
})

describe('estimarEdital — a árvore de tópicos (assunto → subassuntos)', () => {
  const no = (id: string, palavras: number | null, paiId: string | null = null): TopicoConteudo => ({ id, paiId, palavras, publicado: false })

  test('subassunto sem material, sob assunto com texto, é coberto: não soma tempo', () => {
    const r = estimarEdital([materia('Adm', [no('atos', 1200), no('atributos', null, 'atos'), no('extincao', null, 'atos')])])
    const a = so(r, 'Adm')
    assert.equal(a.teoriaMin, 10) // só a leitura do assunto
    assert.equal(a.topicosCobertos, 2)
    assert.equal(a.topicosEstimados, 0)
  })

  test('assunto que só agrupa não ganha tempo próprio: o tempo é dos filhos', () => {
    const r = estimarEdital([materia('Adm', [no('outro', 1200), no('atos', null), no('atributos', null, 'atos'), no('extincao', null, 'atos')])])
    const a = so(r, 'Adm')
    // "atos" é coberto pelos filhos; os 2 filhos sem cobertura recebem a mediana (10 min) cada.
    assert.equal(a.teoriaMin, 10 + 2 * 10)
    assert.equal(a.topicosCobertos, 1)
    assert.equal(a.topicosEstimados, 2)
  })

  test('assunto e subassunto com texto próprio: os dois somam', () => {
    const r = estimarEdital([materia('Adm', [no('atos', 1200), no('atributos', 600, 'atos')])])
    assert.equal(so(r, 'Adm').teoriaMin, 15)
  })

  test('três níveis: o texto do avô cobre o neto', () => {
    const r = estimarEdital([materia('Adm', [no('a', 2400), no('b', null, 'a'), no('c', null, 'b')])])
    assert.equal(so(r, 'Adm').teoriaMin, 20)
    assert.equal(so(r, 'Adm').topicosCobertos, 2)
  })

  test('pai arquivado (fora da lista) faz o filho contar como assunto próprio', () => {
    const r = estimarEdital([materia('Adm', [no('medido', 1200), no('orfao', null, 'pai-arquivado')])])
    assert.equal(so(r, 'Adm').topicosEstimados, 1)
  })

  test('ciclo no banco (A pai de B, B pai de A) não trava a conta', () => {
    const r = estimarEdital([materia('Adm', [no('m', 1200), no('a', null, 'b'), no('b', null, 'a')])])
    assert.ok(Number.isFinite(r.totalMin))
  })

  test('lista plana dá o mesmo que antes: sem pai, nada é coberto', () => {
    const r = estimarEdital([materia('Adm', [no('x', 1200), no('y', null), no('z', null)])])
    assert.equal(so(r, 'Adm').teoriaMin, 30)
    assert.equal(so(r, 'Adm').topicosCobertos, 0)
  })

  test('toda tópico cai em exatamente um balde: medido, coberto ou estimado', () => {
    const r = estimarEdital([materia('Adm', [no('a', 1200), no('b', null, 'a'), no('c', null), no('d', null, 'c'), no('e', 300, 'c'), no('f', null)])])
    const a = so(r, 'Adm')
    assert.equal(a.topicosMedidos + a.topicosCobertos + a.topicosEstimados, a.topicos)
  })
})

describe('estimarEdital — questões pelo tempo real dos alunos', () => {
  test('mediana da matéria com amostra suficiente', () => {
    const r = estimarEdital([materia('Penal', [topico(1200)], { questoes: 30, tempoQuestao: { medianaMs: 90_000, amostras: MIN_AMOSTRAS } })])
    const p = so(r, 'Penal')
    assert.equal(p.fonteTempoQuestao, 'medido')
    assert.equal(p.minPorQuestao, 1.5)
    assert.equal(p.questoesMin, 45)
  })

  test('amostra pequena na matéria cai para a mediana da plataforma', () => {
    const r = estimarEdital(
      [materia('Penal', [topico(1200)], { questoes: 10, tempoQuestao: { medianaMs: 600_000, amostras: MIN_AMOSTRAS - 1 } })],
      { medianaMs: 60_000, amostras: 500 },
    )
    assert.equal(so(r, 'Penal').fonteTempoQuestao, 'medido_geral')
    assert.equal(so(r, 'Penal').questoesMin, 10)
  })

  test('sem dado confiável, referência de 2,5 min — e ela não conta como medido', () => {
    const r = estimarEdital(
      [materia('Penal', [topico(1200)], { questoes: 4 })],
      { medianaMs: 60_000, amostras: MIN_AMOSTRAS - 1 }, // pouca amostra também na plataforma
    )
    const p = so(r, 'Penal')
    assert.equal(p.fonteTempoQuestao, 'referencia')
    assert.equal(p.questoesMin, 4 * MIN_POR_QUESTAO_REFERENCIA)
    assert.equal(p.medidoMin, 10) // só a teoria medida
  })

  test('tempo medido conta como medido no percentual', () => {
    const r = estimarEdital([materia('Penal', [topico(1200)], { questoes: 20, tempoQuestao: { medianaMs: 60_000, amostras: 50 } })])
    const total = 10 + 20 + 10 * REVISAO_FRACAO
    quase(r.percentualMedido, (10 + 20) / total, 0.002)
  })
})

describe('estimarEdital — lacunas e totais', () => {
  test('matéria sem tópico herda a mediana da teoria das outras e é avisada', () => {
    const r = estimarEdital([
      materia('Penal', [topico(3600)]), // 30
      materia('Português', [topico(7200)]), // 60
      materia('Arquivologia', []),
    ])
    const a = so(r, 'Arquivologia')
    assert.equal(a.semConteudo, true)
    assert.equal(a.teoriaMin, 45)
    assert.equal(a.medidoMin, 0)
    assert.deepEqual(r.materiasSemConteudo, ['Arquivologia'])
  })

  test('matéria sem questão é avisada', () => {
    const r = estimarEdital([materia('Penal', [topico(1200)], { questoes: 5 }), materia('Português', [topico(1200)])])
    assert.deepEqual(r.materiasSemQuestoes, ['Português'])
  })

  test('edital sem conteúdo nenhum não inventa teoria', () => {
    const r = estimarEdital([materia('Penal', []), materia('Português', [])])
    assert.equal(r.totalMin, 0)
    assert.equal(r.topicos, 0)
    assert.equal(r.materiasSemConteudo.length, 2)
  })

  test('total = soma das matérias, e cada matéria = teoria + questões + revisão', () => {
    const r = estimarEdital([
      materia('A', [topico(1234), topico(null), topico(987)], { questoes: 17, tempoQuestao: { medianaMs: 73_000, amostras: 40 } }),
      materia('B', [topico(4321)], { questoes: 3 }),
      materia('C', []),
    ], { medianaMs: 81_000, amostras: 300 })
    for (const m of r.materias) quase(m.totalMin, m.teoriaMin + m.questoesMin + m.revisaoMin, 0.21)
    quase(r.totalMin, r.materias.reduce((s, m) => s + m.totalMin, 0), 0.05)
    assert.equal(r.questoes, 20)
  })

  test('ordena da matéria mais longa para a mais curta', () => {
    const r = estimarEdital([materia('Curta', [topico(120)]), materia('Longa', [topico(12000)]), materia('Média', [topico(1200)])])
    assert.deepEqual(r.materias.map((m) => m.nome), ['Longa', 'Média', 'Curta'])
  })

  test('mais palavras nunca diminui o tempo (monotonia)', () => {
    let anterior = 0
    for (let p = 100; p <= 20000; p += 500) {
      const r = estimarEdital([materia('Penal', [topico(p), topico(1500)])])
      assert.ok(r.totalMin >= anterior, `com ${p} palavras caiu de ${anterior} para ${r.totalMin}`)
      anterior = r.totalMin
    }
  })

  test('medir um tópico SUBSTITUI o palpite: o total pode cair, e o medido sobe', () => {
    const antes = estimarEdital([materia('Penal', [topico(null), topico(1500)])]) // palpite: 1500 palavras
    const depois = estimarEdital([materia('Penal', [topico(500), topico(1500)])]) // o texto real é curto
    assert.ok(depois.totalMin < antes.totalMin)
    assert.ok(depois.percentualMedido > antes.percentualMedido)
  })

  test('entrada ruim não quebra a conta', () => {
    const r = estimarEdital([materia('Penal', [topico(-50), topico(Number.NaN)], { questoes: Number.NaN }), materia('B', [], { questoes: -3 })])
    assert.ok(Number.isFinite(r.totalMin) && r.totalMin >= 0)
    assert.equal(r.questoes, 0)
    assert.deepEqual(estimarEdital([]).totalMin, 0)
  })

  test('mediana: par, ímpar, vazia, ignora zero e negativos', () => {
    assert.equal(mediana([3, 1, 2]), 2)
    assert.equal(mediana([4, 1, 3, 2]), 2.5)
    assert.equal(mediana([]), null)
    assert.equal(mediana([0, -1, 5]), 5)
  })
})

describe('cabeNoTempo — a mesma régua do cronograma', () => {
  const hoje = new Date('2027-01-04T12:00:00Z')
  const emDias = (n: number) => new Date(hoje.getTime() + n * 86_400_000)

  test('3 h declaradas rendem 150 min: só sessões inteiras de 50 min', () => {
    assert.equal(cabeNoTempo(100, { horasPorDia: 3, diasPorSemana: 7, hoje }).minutosPorDia, 150)
    assert.equal(cabeNoTempo(100, { horasPorDia: 1.5, diasPorSemana: 7, hoje }).minutosPorDia, 50)
  })

  test('dias para terminar e data de término', () => {
    const v = cabeNoTempo(1500, { horasPorDia: 3, diasPorSemana: 7, hoje })
    assert.equal(v.diasParaTerminar, 10)
    assert.equal(v.terminaEm.getTime(), emDias(10).getTime())
    assert.equal(v.cabe, undefined) // sem data de prova, sem veredito
  })

  test('5 dias por semana esticam o prazo na proporção certa', () => {
    assert.equal(cabeNoTempo(1500, { horasPorDia: 3, diasPorSemana: 5, hoje }).diasParaTerminar, 14)
  })

  test('cabe com folga: diz quantas voltas no conteúdo dá para dar', () => {
    const v = cabeNoTempo(1500, { horasPorDia: 3, diasPorSemana: 7, hoje, dataProva: emDias(30) })
    assert.equal(v.cabe, true)
    assert.equal(v.disponivelMin, 4500)
    assert.equal(v.voltas, 3)
  })

  test('não cabe: diz quantas horas por dia resolveriam', () => {
    const v = cabeNoTempo(6000, { horasPorDia: 3, diasPorSemana: 7, hoje, dataProva: emDias(20) })
    assert.equal(v.cabe, false)
    assert.equal(v.horasPorDiaNecessarias, 5) // 300 min/dia = 6 sessões = 5 h
    assert.equal(cabeNoTempo(6000, { horasPorDia: 5, diasPorSemana: 7, hoje, dataProva: emDias(20) }).cabe, true)
  })

  test('as horas sugeridas sempre bastam, e meia hora a menos nunca basta', () => {
    for (const total of [90, 777, 1500, 4321, 9000, 30000])
      for (const dias of [1, 3, 5, 6, 7])
        for (const ate of [7, 30, 90, 200]) {
          const base = { diasPorSemana: dias, hoje, dataProva: emDias(ate) }
          const h = cabeNoTempo(total, { ...base, horasPorDia: 1 }).horasPorDiaNecessarias!
          assert.equal(cabeNoTempo(total, { ...base, horasPorDia: h }).cabe, true, `${total}/${dias}/${ate}: ${h} h não bastou`)
          if (h > 1) assert.equal(cabeNoTempo(total, { ...base, horasPorDia: h - 0.5 }).cabe, false, `${total}/${dias}/${ate}: ${h - 0.5} h já bastava`)
        }
  })

  test('prova hoje ou já passada: não cabe e não há horas que resolvam', () => {
    const v = cabeNoTempo(600, { horasPorDia: 8, diasPorSemana: 7, hoje, dataProva: emDias(-3) })
    assert.equal(v.diasAteProva, 0)
    assert.equal(v.cabe, false)
    assert.equal(v.horasPorDiaNecessarias, Infinity)
  })

  test('zero hora por dia: nunca termina', () => {
    assert.equal(cabeNoTempo(600, { horasPorDia: 0, diasPorSemana: 5, hoje }).diasParaTerminar, Infinity)
  })

  test('dias por semana fora de 1–7 são ajustados', () => {
    assert.equal(cabeNoTempo(1050, { horasPorDia: 3, diasPorSemana: 0, hoje }).diasParaTerminar, 49) // 1 dia/semana
    assert.equal(cabeNoTempo(1050, { horasPorDia: 3, diasPorSemana: 9, hoje }).diasParaTerminar, 7)
  })

  test('conteúdo vazio: termina hoje e sempre cabe', () => {
    const v = cabeNoTempo(0, { horasPorDia: 2, diasPorSemana: 5, hoje, dataProva: emDias(10) })
    assert.equal(v.diasParaTerminar, 0)
    assert.equal(v.cabe, true)
    assert.equal(v.horasPorDiaNecessarias, 0)
  })
})
