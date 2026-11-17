import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { paraJsonLd } from '../json-ld.ts'

describe('paraJsonLd — JSON dentro de <script> sem abrir a tag', () => {
  test('um título com </script> não fecha a tag', () => {
    const dados = { '@type': 'BlogPosting', headline: 'Prova </script><script>alert(1)</script> PF' }
    const saida = paraJsonLd(dados)
    assert.ok(!/<\/script/i.test(saida), saida)
    assert.ok(!saida.includes('<'), saida)
  })

  test('quem lê o JSON recebe exatamente o mesmo objeto', () => {
    const dados = { name: 'Direito <Penal> & Processo', itens: ['<!--', 'a < b'], n: 3 }
    assert.deepEqual(JSON.parse(paraJsonLd(dados)), dados)
  })
})
