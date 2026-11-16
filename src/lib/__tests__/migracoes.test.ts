import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { MIGRACOES_ANTERIORES_AO_REGISTRO } from '../migracoes-anteriores.ts'

// Confere o contrato que o pipeline usa para não promover código antes do SQL.
const raiz = join(import.meta.dirname, '..', '..', '..')
const manifesto = JSON.parse(readFileSync(join(raiz, 'prisma', 'migracoes.json'), 'utf8'))
const pastaSql = join(raiz, 'prisma', 'sql')
const sqls = readdirSync(pastaSql).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(join(pastaSql, f), 'utf8'))

describe('manifesto de migrações', () => {
  test('toda migração necessária tem o arquivo SQL correspondente', () => {
    for (const nome of manifesto.necessarias) {
      assert.ok(existsSync(join(pastaSql, `${nome}.sql`)), `falta prisma/sql/${nome}.sql`)
    }
  })

  test('toda migração necessária é reconhecível em produção', () => {
    // Ou é anterior ao registro (reconhecida pela tabela que criou), ou algum
    // SQL grava o nome dela em schema_migracoes. Sem isso o pipeline travaria
    // para sempre esperando uma migração que nunca aparece.
    for (const nome of manifesto.necessarias) {
      const anterior = nome in MIGRACOES_ANTERIORES_AO_REGISTRO
      const registrada = sqls.some((s) => s.includes('schema_migracoes') && s.includes(`'${nome}'`))
      assert.ok(anterior || registrada, `${nome} não se registra em schema_migracoes`)
    }
  })

  test('as tabelas usadas como sinal têm nome simples', () => {
    for (const tabela of Object.values(MIGRACOES_ANTERIORES_AO_REGISTRO)) {
      assert.match(tabela, /^[a-z_][a-z0-9_]*$/)
    }
  })
})
