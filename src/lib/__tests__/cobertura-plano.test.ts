import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { planejarCobertura } from '../cobertura-plano.ts'

describe('planejarCobertura — libera só o que foi pago', () => {
  // O caso do plano de teste de R$ 1,00: um curso, e só ele.
  test('curso avulso libera exatamente 1 curso', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: ['pf-agente'],
      courseSlug: null,
      planType: 'SINGLE_COURSE',
    })
    assert.deepEqual(r, { modo: 'slugs', slugs: ['pf-agente'] })
  })

  test('curso avulso respeita a escolha do comprador', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: ['pf-agente', 'pf-escrivao', 'pf-perito'],
      courseSlug: 'pf-escrivao',
      planType: 'SINGLE_COURSE',
    })
    assert.deepEqual(r, { modo: 'slugs', slugs: ['pf-escrivao'] })
  })

  // Esta é a que protege o negócio: pagar por um curso não pode dar outro.
  test('curso fora da cobertura NÃO é liberado', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: ['pf-agente'],
      courseSlug: 'prf-policial',   // não faz parte do plano
      planType: 'SINGLE_COURSE',
    })
    assert.equal(r.modo, 'nenhum')
    assert.equal((r as any).motivo, 'curso_fora_da_cobertura')
  })

  // Na dúvida, não libera. Liberar o curso errado é pior que não liberar:
  // dá pra corrigir quem não recebeu, não dá pra tirar de quem recebeu demais.
  test('vários cursos sem escolha não chuta nenhum', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: ['pf-agente', 'pf-escrivao'],
      courseSlug: null,
      planType: 'SINGLE_COURSE',
    })
    assert.equal(r.modo, 'nenhum')
    assert.equal((r as any).motivo, 'varios_cursos_sem_escolha')
  })

  test('combo libera todos da cobertura e ignora a escolha', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: ['pf-agente', 'pf-escrivao', 'prf-policial'],
      courseSlug: 'pf-agente',
      planType: 'COMBO',
    })
    assert.deepEqual(r, { modo: 'slugs', slugs: ['pf-agente', 'pf-escrivao', 'prf-policial'] })
  })

  test('full access por área', () => {
    const r = planejarCobertura({
      coverageType: 'AREA',
      coverageData: ['POLICIAL'],
      courseSlug: null,
      planType: 'FULL_ACCESS',
    })
    assert.deepEqual(r, { modo: 'areas', areas: ['POLICIAL'] })
  })

  test('cobertura ALL libera tudo', () => {
    const r = planejarCobertura({
      coverageType: 'ALL',
      coverageData: null,
      courseSlug: null,
      planType: 'FULL_ACCESS',
    })
    assert.deepEqual(r, { modo: 'todos' })
  })

  // Plano mal cadastrado não pode virar liberação silenciosa de nada —
  // nem de tudo.
  test('cobertura vazia ou suja não libera', () => {
    const vazios: Array<unknown> = [[], null, undefined, 'texto', [''], [null, 123]]
    for (const dado of vazios) {
      const r = planejarCobertura({
        coverageType: 'SPECIFIC',
        coverageData: dado,
        courseSlug: null,
        planType: 'SINGLE_COURSE',
      })
      assert.equal(r.modo, 'nenhum', `deveria recusar: ${JSON.stringify(dado)}`)
    }
  })

  test('combo sem cobertura não libera', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: [],
      courseSlug: 'pf-agente',
      planType: 'COMBO',
    })
    assert.equal(r.modo, 'nenhum')
    assert.equal((r as any).motivo, 'combo_sem_cobertura')
  })

  test('trial com curso específico funciona como avulso', () => {
    const r = planejarCobertura({
      coverageType: 'SPECIFIC',
      coverageData: [],
      courseSlug: 'pf-agente',
      planType: 'TRIAL',
    })
    assert.deepEqual(r, { modo: 'slugs', slugs: ['pf-agente'] })
  })
})
