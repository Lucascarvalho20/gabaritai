import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildSchedule, minutosEfetivosPorDia } from '../schedule-algorithm.ts'
import { REVISOES } from '../metodo-estudo.ts'

const materias = [
  { id: 'con', name: 'Constitucional', weight: 2 },
  { id: 'pen', name: 'Penal', weight: 1 },
  { id: 'por', name: 'Português', weight: 1 },
]
const base = {
  startDate: new Date('2027-01-04T12:00:00'), // segunda
  endDate: new Date('2027-06-30T12:00:00'),
  hoursPerDay: 3,
  daysPerWeek: [1, 2, 3, 4, 5],
  subjects: materias,
}
const dia = (d: Date) => d.toISOString().slice(0, 10)

describe('buildSchedule — propriedades do cronograma', () => {
  test('determinístico: mesma entrada, mesma saída', () => {
    const a = buildSchedule(base)
    const b = buildSchedule(base)
    assert.deepEqual(a, b)
  })

  test('só agenda nos dias da semana escolhidos', () => {
    const r = buildSchedule(base)
    for (const s of r.sessions) {
      const dow = s.date.getDay()
      assert.ok(dow >= 1 && dow <= 5, `sessão num ${dow}`)
    }
  })

  test('toda matéria aparece', () => {
    const r = buildSchedule(base)
    for (const m of materias) assert.ok(r.perSubject[m.id].sessions > 0, m.name)
  })

  test('tempo proporcional ao peso', () => {
    const r = buildSchedule({ ...base, includeMocks: false, prePresenceMode: false })
    const razao = r.perSubject.con.minutes / r.perSubject.pen.minutes
    assert.ok(razao > 1.8 && razao < 2.2, `peso 2 vs 1 deu razão ${razao.toFixed(2)}`)
  })

  test('não repete a mesma matéria em sequência no mesmo dia', () => {
    const r = buildSchedule({ ...base, includeMocks: false })
    const porDia = new Map<string, string[]>()
    for (const s of r.sessions) {
      if (!s.subjectId) continue
      const k = dia(s.date)
      porDia.set(k, [...(porDia.get(k) ?? []), s.subjectId])
    }
    for (const [d, seq] of porDia) {
      for (let i = 1; i < seq.length; i++) {
        assert.notEqual(seq[i], seq[i - 1], `${d}: ${seq.join(',')}`)
      }
    }
  })

  // A pergunta "vai dar tempo?" precisa ser respondida ANTES, não descoberta na véspera.
  test('pouco tempo vira déficit explícito', () => {
    const apertado = buildSchedule({ ...base, endDate: new Date('2027-01-29T12:00:00'), hoursPerDay: 1 })
    assert.equal(apertado.isFeasible, false)
    assert.ok(apertado.deficit > 0)
    const folgado = buildSchedule({ ...base, hoursPerDay: 6 })
    assert.equal(folgado.isFeasible, true)
    assert.equal(folgado.deficit, 0)
  })

  test('nos últimos 30 dias não há conteúdo novo — só revisão e questões', () => {
    const r = buildSchedule(base)
    const limite = new Date(base.endDate)
    limite.setDate(limite.getDate() - 30)
    const finais = r.sessions.filter((s) => s.date >= limite && s.subjectId)
    assert.ok(finais.length > 0)
    for (const s of finais) assert.notEqual(s.type, 'ESTUDO', `${dia(s.date)} tem ESTUDO`)
  })

  test('simulado aparece, e fica mais frequente perto da prova', () => {
    const r = buildSchedule(base)
    const simulados = r.sessions.filter((s) => s.type === 'SIMULADO').map((s) => s.date)
    assert.ok(simulados.length >= 4)
    const limite = new Date(base.endDate)
    limite.setDate(limite.getDate() - 30)
    const antes = simulados.filter((d) => d < limite).length
    const depois = simulados.filter((d) => d >= limite).length
    const diasAntes = (limite.getTime() - base.startDate.getTime()) / 864e5
    assert.ok(depois / 30 > antes / diasAntes, 'densidade de simulado maior no fim')
  })

  // Antes: sessões inteiras de 50 min, sem pausa contada (2,5 h rendiam 150 min).
  // Agora o dia rende os pomodoros que cabem nas horas declaradas, com as pausas.
  test('o dia rende os pomodoros que cabem nas horas, com as pausas', () => {
    assert.equal(minutosEfetivosPorDia(3), 125)
    assert.equal(minutosEfetivosPorDia(2.5), 100)
    assert.equal(minutosEfetivosPorDia(1), 50)
    assert.equal(minutosEfetivosPorDia(0.5), 25)
    assert.equal(minutosEfetivosPorDia(10), 450)
    assert.equal(buildSchedule({ ...base, endDate: base.startDate }).totalMinAvailable, 125)
  })

  test('cada sessão de estudo agenda as revisões da matéria: 1, 7, 15 e 30 dias depois', () => {
    const todoDia = { ...base, daysPerWeek: [0, 1, 2, 3, 4, 5, 6], includeMocks: false, prePresenceMode: false }
    const r = buildSchedule(todoDia)
    const tem = (tipo: string, materia: string, d: Date) =>
      r.sessions.some((s) => s.type === tipo && s.subjectId === materia && dia(s.date) === dia(d))
    const estudo = r.sessions.find((s) => s.type === 'ESTUDO' && s.date.getTime() < new Date('2027-02-01').getTime())!
    for (const rev of REVISOES) {
      const quando = new Date(estudo.date)
      quando.setDate(quando.getDate() + rev.diasDepois)
      assert.ok(tem('REVISAO', estudo.subjectId!, quando), `sem revisão de ${rev.nome} de ${estudo.subjectName} em ${dia(quando)}`)
    }
  })

  test('revisão abre o dia e nunca passa de metade do tempo; o dia nunca passa do foco', () => {
    const r = buildSchedule({ ...base, includeMocks: false, prePresenceMode: false })
    const porDia = new Map<string, typeof r.sessions>()
    for (const s of r.sessions) porDia.set(dia(s.date), [...(porDia.get(dia(s.date)) ?? []), s])
    for (const [d, sessoes] of porDia) {
      const revisao = sessoes.filter((s) => s.type === 'REVISAO')
      const total = sessoes.reduce((t, s) => t + s.durationMin, 0)
      assert.ok(total <= 125, `${d}: ${total} min num dia de 125 de foco`)
      assert.ok(revisao.reduce((t, s) => t + s.durationMin, 0) <= 62, `${d}: revisão passou da metade`)
      const primeiraNaoRevisao = sessoes.findIndex((s) => s.type !== 'REVISAO')
      if (primeiraNaoRevisao >= 0) assert.ok(sessoes.slice(primeiraNaoRevisao).every((s) => s.type !== 'REVISAO'), `${d}: revisão depois do estudo`)
    }
  })

  test('as revisões somam ~42% do estudo, a fração do método', () => {
    const r = buildSchedule({ ...base, daysPerWeek: [0, 1, 2, 3, 4, 5, 6], includeMocks: false, prePresenceMode: false })
    const soma = (tipo: string) => r.sessions.filter((s) => s.type === tipo).reduce((t, s) => t + s.durationMin, 0)
    const razao = soma('REVISAO') / soma('ESTUDO')
    assert.ok(razao > 0.38 && razao < 0.5, `revisão ÷ estudo = ${razao.toFixed(2)}`)
  })

  // Antes: 60 h por matéria, iguais para todas. Continua sendo a reserva para
  // quem não traz o tempo medido do próprio conteúdo.
  test('sem tempo medido, o necessário continua 60 h por matéria', () => {
    assert.equal(buildSchedule(base).totalMinRecommended, 3 * 60 * 60)
  })

  test('com tempo medido, o necessário é a soma do conteúdo de cada matéria', () => {
    const medidas = [
      { ...materias[0], hoursRecommended: 12.5 },
      { ...materias[1], hoursRecommended: 30 },
      materias[2], // sem medida: reserva de 60 h
    ]
    const r = buildSchedule({ ...base, subjects: medidas })
    assert.equal(r.totalMinRecommended, (12.5 + 30 + 60) * 60)
    // A distribuição do tempo continua pelo PESO da prova, não pelo conteúdo.
    const razao = r.perSubject.con.minutes / r.perSubject.pen.minutes
    assert.ok(razao > 1.8 && razao < 2.2, `razão ${razao.toFixed(2)}`)
  })

  test('conteúdo pequeno cabe onde a regra fixa dizia que não cabia', () => {
    const curto = { ...base, endDate: new Date('2027-01-29T12:00:00'), hoursPerDay: 1 }
    assert.equal(buildSchedule(curto).isFeasible, false)
    const medido = materias.map((m) => ({ ...m, hoursRecommended: 4 }))
    assert.equal(buildSchedule({ ...curto, subjects: medido }).isFeasible, true)
  })

  test('sem matéria nenhuma não quebra', () => {
    const r = buildSchedule({ ...base, subjects: [] })
    assert.equal(r.sessions.filter((s) => s.subjectId).length, 0)
  })
})
