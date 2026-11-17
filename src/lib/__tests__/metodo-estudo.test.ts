import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { pomodorosNoTempo, focoPorDia, horasParaFoco, REVISOES, REVISAO_FRACAO, revisoesDoEstudo } from '../metodo-estudo.ts'

describe('Pomodoro — 25 de foco, 5 de pausa, 15 a cada 4 blocos', () => {
  test('1 h: dois blocos (25 + 5 + 25), a pausa final não precisa caber', () => {
    assert.equal(pomodorosNoTempo(60), 2)
    assert.equal(focoPorDia(1), 50)
  })

  test('3 h: cinco blocos — a pausa longa depois do quarto come o sexto', () => {
    // 25+5, 25+5, 25+5, 25+15 = 130 min; o quinto termina em 155; o sexto terminaria em 185
    assert.equal(pomodorosNoTempo(180), 5)
    assert.equal(focoPorDia(3), 125)
  })

  test('meia hora rende um bloco; 10 h rendem 18', () => {
    assert.equal(focoPorDia(0.5), 25)
    assert.equal(pomodorosNoTempo(600), 18)
  })

  test('com algum tempo, pelo menos um bloco; sem tempo, nenhum', () => {
    assert.equal(pomodorosNoTempo(10), 1)
    assert.equal(pomodorosNoTempo(0), 0)
    assert.equal(pomodorosNoTempo(-5), 0)
    assert.equal(pomodorosNoTempo(Number.NaN), 0)
  })

  test('mais tempo nunca rende menos foco', () => {
    let antes = 0
    for (let m = 0; m <= 900; m += 5) {
      const agora = pomodorosNoTempo(m)
      assert.ok(agora >= antes, `${m} min: ${agora} < ${antes}`)
      antes = agora
    }
  })

  test('as horas sugeridas bastam, e meia hora a menos não basta', () => {
    for (const foco of [25, 50, 75, 125, 200, 300, 450]) {
      const h = horasParaFoco(foco)
      assert.ok(focoPorDia(h) >= foco, `${h} h não rendeu ${foco} min`)
      if (h > 0.5) assert.ok(focoPorDia(h - 0.5) < foco, `${h - 0.5} h já rendia ${foco} min`)
    }
    assert.equal(horasParaFoco(0), 0)
    assert.equal(horasParaFoco(10_000), Infinity)
  })
})

describe('Revisão espaçada — 1, 7, 15 e 30 dias, cada uma mais curta', () => {
  test('os intervalos crescem e as revisões encurtam', () => {
    for (let i = 1; i < REVISOES.length; i++) {
      assert.ok(REVISOES[i].diasDepois > REVISOES[i - 1].diasDepois)
      assert.ok(REVISOES[i].fracao < REVISOES[i - 1].fracao)
    }
    assert.equal(REVISAO_FRACAO, 0.42)
  })

  test('um estudo de 50 min gera revisões de 10, 5, 3,5 e 2,5 min nos dias certos', () => {
    const r = revisoesDoEstudo(new Date('2027-03-01T12:00:00'), 50)
    assert.deepEqual(r.map((x) => x.vence.toISOString().slice(0, 10)), ['2027-03-02', '2027-03-08', '2027-03-16', '2027-03-31'])
    assert.deepEqual(r.map((x) => Math.round(x.minutos * 10) / 10), [10, 5, 3.5, 2.5])
  })
})
