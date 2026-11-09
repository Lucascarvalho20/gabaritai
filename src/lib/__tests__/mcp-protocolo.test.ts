import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { criarServidorMcp, VERSOES_SUPORTADAS } from '../../../mcp/protocolo.ts'

const servidor = criarServidorMcp({
  nome: 'teste', versao: '1.0.0',
  ferramentas: [
    { nome: 'somar', descricao: 'soma', esquema: { type: 'object' }, executar: async (a) => ({ total: Number(a.x) + Number(a.y) }) },
    { nome: 'quebrar', descricao: 'falha', esquema: { type: 'object' }, executar: async () => { throw new Error('banco fora do ar') } },
  ],
})
const req = (id: number, method: string, params?: unknown) => ({ jsonrpc: '2.0', id, method, params })

describe('protocolo MCP', () => {
  test('initialize aceita a versão do cliente quando a conhecemos', async () => {
    const r: any = await servidor(req(1, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'c', version: '1' } }))
    assert.equal(r.result.protocolVersion, '2025-03-26')
    assert.deepEqual(r.result.capabilities, { tools: {} })
    assert.equal(r.result.serverInfo.name, 'teste')
  })

  test('initialize com versão desconhecida oferece a mais nova', async () => {
    const r: any = await servidor(req(1, 'initialize', { protocolVersion: '1999-01-01' }))
    assert.equal(r.result.protocolVersion, VERSOES_SUPORTADAS[0])
  })

  test('notificação nunca recebe resposta', async () => {
    assert.equal(await servidor({ jsonrpc: '2.0', method: 'notifications/initialized' }), null)
  })

  test('tools/list devolve nome, descrição e schema', async () => {
    const r: any = await servidor(req(2, 'tools/list'))
    assert.deepEqual(r.result.tools.map((t: any) => t.name), ['somar', 'quebrar'])
    assert.ok(r.result.tools[0].inputSchema)
  })

  test('tools/call devolve o resultado como texto', async () => {
    const r: any = await servidor(req(3, 'tools/call', { name: 'somar', arguments: { x: 2, y: 3 } }))
    assert.equal(r.result.isError, false)
    assert.deepEqual(JSON.parse(r.result.content[0].text), { total: 5 })
  })

  // Regra do MCP fácil de errar: falha AO EXECUTAR não é erro de JSON-RPC.
  test('ferramenta que falha volta como resultado com isError, para o modelo ler', async () => {
    const r: any = await servidor(req(4, 'tools/call', { name: 'quebrar', arguments: {} }))
    assert.equal(r.error, undefined)
    assert.equal(r.result.isError, true)
    assert.match(r.result.content[0].text, /banco fora do ar/)
  })

  test('ferramenta inexistente é erro de parâmetro (-32602)', async () => {
    const r: any = await servidor(req(5, 'tools/call', { name: 'apagar_tudo' }))
    assert.equal(r.error.code, -32602)
  })

  test('método inexistente é -32601; mensagem malformada é -32600', async () => {
    assert.equal(((await servidor(req(6, 'resources/list'))) as any).error.code, -32601)
    assert.equal(((await servidor({ id: 7, method: 'ping' })) as any).error.code, -32600)
    assert.equal(((await servidor('lixo')) as any).error.code, -32600)
  })

  test('ping responde vazio e o id volta igual', async () => {
    const r: any = await servidor({ jsonrpc: '2.0', id: 'abc', method: 'ping' })
    assert.equal(r.id, 'abc')
    assert.deepEqual(r.result, {})
  })
})
