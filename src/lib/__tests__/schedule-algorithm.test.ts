import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildSchedule } from '../schedule-algorithm.ts'

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

  test('sem matéria nenhuma não quebra', () => {
    const r = buildSchedule({ ...base, subjects: [] })
    assert.equal(r.sessions.filter((s) => s.subjectId).length, 0)
  })
})
