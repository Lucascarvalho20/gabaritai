import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Trava de regressão para uma CLASSE de bug, não para um bug.
 *
 * `process.env.ALGUM_SEGREDO ?? 'valor-literal'` num repositório público faz o
 * literal virar a chave: se a variável faltar em algum ambiente, o sistema não
 * quebra — opera com uma chave que qualquer leitor do GitHub conhece. O projeto
 * já teve isso na senha do admin, no token dos crons e na chave de CPF.
 *
 * Este teste varre o código e falha se o padrão voltar. O jeito certo de ler
 * segredo é `segredo()` (src/lib/segredo.ts), que só aceita fallback fora de
 * produção.
 */
const PADRAO = /process\.env\.[A-Z_]*(?:SECRET|TOKEN|KEY|PASSWORD|SALT)[A-Z_]*\s*(?:\?\?|\|\|)\s*['"`][^'"`]/

const RAIZ = join(import.meta.dirname, '..', '..')

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : []
  })
}

test('nenhum segredo com valor padrão literal no código', () => {
  const achados: string[] = []
  for (const arquivo of arquivos(RAIZ)) {
    readFileSync(arquivo, 'utf8').split('\n').forEach((linha, i) => {
      // Comentários podem citar o padrão para explicá-lo.
      const t = linha.trim()
      if (t.startsWith('//') || t.startsWith('*')) return
      if (PADRAO.test(linha)) achados.push(`${relative(RAIZ, arquivo)}:${i + 1}  ${t}`)
    })
  }
  assert.deepEqual(achados, [], `Segredo com fallback literal:\n${achados.join('\n')}`)
})
