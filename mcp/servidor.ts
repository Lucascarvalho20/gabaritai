/**
 * Servidor MCP do Gabaritai, transporte stdio.
 *
 *   npm run mcp
 *
 * Para usar no Claude Desktop ou no Claude Code, ver mcp/README.md.
 *
 * Regra do stdio: o stdout é o canal do protocolo e só pode conter mensagens
 * JSON-RPC, uma por linha. Qualquer `console.log` aqui corromperia a conversa
 * com o cliente — por isso todo log vai para o stderr.
 */
import { createInterface } from 'node:readline'
import { criarServidorMcp } from './protocolo'
import { ferramentasMcp } from './ferramentas'
import { prisma } from '@/lib/prisma'

const responder = criarServidorMcp({ nome: 'gabaritai', versao: '1.0.0', ferramentas: ferramentasMcp })
const escrever = (m: object) => process.stdout.write(JSON.stringify(m) + '\n')
const log = (...a: unknown[]) => console.error('[mcp-gabaritai]', ...a)

const linhas = createInterface({ input: process.stdin, crlfDelay: Infinity })
let pendentes = Promise.resolve()

linhas.on('line', (linha) => {
  if (!linha.trim()) return
  // Encadeia para responder na ordem de chegada.
  pendentes = pendentes.then(async () => {
    let mensagem: unknown
    try {
      mensagem = JSON.parse(linha)
    } catch {
      escrever({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido.' } })
      return
    }
    try {
      const r = await responder(mensagem)
      if (r) escrever(r)
    } catch (e) {
      log('erro inesperado', e)
    }
  })
})

linhas.on('close', async () => {
  await pendentes
  await prisma.$disconnect()
  process.exit(0)
})

log('pronto (stdio)')
