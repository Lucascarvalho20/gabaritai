/**
 * Teste de fumaça: confere, de fora, que o site no ar está de pé, na versão
 * certa e sem porta aberta que não devia. "Fumaça" porque é o teste de ligar
 * o aparelho e ver se sai fumaça — rápido, raso, e pega o desastre.
 *
 * Roda no pipeline logo depois de cada deploy de produção e também à mão:
 *   npm run ci:fumaca -- --site https://gabaritai-red.vercel.app
 *   npm run ci:fumaca -- --site https://... --versao 1a2b3c4 --esperar 900
 *
 * --versao   commit (7 letras) que precisa estar no ar.
 * --esperar  segundos esperando o /api/health mostrar essa versão: a Vercel
 *            leva uns 2 minutos para publicar depois do push.
 */
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

type Resultado = { nome: string; ok: boolean; detalhe: string; ms: number }

/**
 * Formatos de segredo que nunca podem aparecer no JavaScript que vai para o
 * navegador. Prefixos oficiais de cada serviço usado (ou usável) pelo projeto.
 */
export const PADROES_DE_SEGREDO: { nome: string; re: RegExp }[] = [
  { nome: 'chave da Anthropic', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { nome: 'chave da OpenAI', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  { nome: 'chave do Groq', re: /\bgsk_[A-Za-z0-9]{40,}/ },
  { nome: 'chave do Google (Gemini)', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { nome: 'token do Mercado Pago', re: /\b(?:APP_USR|TEST)-\d{6,}-\d{6}-[0-9a-f]{32}-\d{6,}\b/ },
  { nome: 'chave do Resend', re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/ },
  { nome: 'token do GitHub', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})\b/ },
  { nome: 'token de bot do Telegram', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/ },
  { nome: 'chave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { nome: 'URL de banco com senha', re: /\bpostgres(?:ql)?:\/\/[^\s:"'@/]+:[^\s@"'/]+@[^\s"']+/ },
  // JWT do Supabase (anon ou service_role): com RLS desligado, qualquer um
  // deles dá acesso direto às tabelas pela API do Supabase.
  { nome: 'JWT (chave do Supabase?)', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]

/** Onde achou e o quê — com o valor mascarado: o relatório do CI é público. */
export function procurarSegredos(texto: string): { nome: string; amostra: string }[] {
  const achados: { nome: string; amostra: string }[] = []
  for (const { nome, re } of PADROES_DE_SEGREDO) {
    const m = texto.match(re)
    if (m) achados.push({ nome, amostra: `${m[0].slice(0, 6)}…(${m[0].length} caracteres)` })
  }
  return achados
}

/** Os <script src> da página que vêm do próprio site (os pedaços do bundle). */
export function scriptsDaPagina(html: string, site: string): string[] {
  const base = new URL(site)
  const urls = new Set<string>()
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), base)
    if (url.origin === base.origin) urls.add(url.href)
  }
  return [...urls]
}

export function lerArgs(argv: string[]) {
  const valor = (nome: string) => {
    const i = argv.indexOf(`--${nome}`)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const site = (valor('site') ?? process.env.SITE ?? '').replace(/\/+$/, '')
  if (!/^https?:\/\//.test(site)) throw new Error('Informe o endereço: --site https://...')
  return { site, versao: valor('versao')?.slice(0, 7), esperar: Number(valor('esperar') ?? 0) }
}

async function buscar(url: string, init?: RequestInit) {
  const t0 = performance.now()
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000), ...init })
  const corpo = await res.text()
  return { res, corpo, ms: Math.round(performance.now() - t0) }
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function esperarVersao(site: string, versao: string, segundos: number) {
  const limite = Date.now() + segundos * 1000
  let vista = '?'
  while (Date.now() < limite) {
    try {
      const { res, corpo } = await buscar(`${site}/api/health`)
      if (res.ok) {
        vista = JSON.parse(corpo).versao
        if (vista === versao) return
      }
    } catch {}
    await pausa(10_000)
  }
  throw new Error(`a versão ${versao} não apareceu no ar em ${segundos}s (no ar: ${vista})`)
}

async function main() {
  const { site, versao, esperar } = lerArgs(process.argv.slice(2))
  const resultados: Resultado[] = []
  const checar = async (nome: string, teste: () => Promise<string>) => {
    const t0 = performance.now()
    try {
      resultados.push({ nome, ok: true, detalhe: await teste(), ms: Math.round(performance.now() - t0) })
    } catch (e: any) {
      resultados.push({ nome, ok: false, detalhe: e?.message ?? String(e), ms: Math.round(performance.now() - t0) })
    }
  }
  const exigir = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg) }

  if (versao && esperar > 0) await checar(`Deploy da versão ${versao} no ar`, async () => { await esperarVersao(site, versao, esperar); return 'publicada' })

  await checar('Saúde e versão (/api/health)', async () => {
    const { res, corpo } = await buscar(`${site}/api/health`)
    exigir(res.status === 200, `status ${res.status}`)
    const j = JSON.parse(corpo)
    exigir(j.ok === true, 'ok != true')
    exigir(!versao || j.versao === versao, `no ar: ${j.versao}, esperado: ${versao}`)
    return `versão ${j.versao}`
  })

  await checar('Página inicial', async () => {
    const { res, corpo } = await buscar(site)
    exigir(res.status === 200, `status ${res.status}`)
    exigir(/gabarit/i.test(corpo), 'a marca não aparece no HTML')
    for (const h of ['strict-transport-security', 'content-security-policy', 'x-frame-options']) {
      exigir(res.headers.has(h), `cabeçalho de segurança ausente: ${h}`)
    }
    return 'ok, com cabeçalhos de segurança'
  })

  await checar('Login', async () => {
    const { res } = await buscar(`${site}/login`)
    exigir(res.status === 200, `status ${res.status}`)
    return 'ok'
  })

  await checar('API pública que lê o banco', async () => {
    const { res, ms } = await buscar(`${site}/api/courses/pf-agente`)
    exigir(res.status === 200, `status ${res.status}`)
    return `${ms} ms`
  })

  await checar('Migrações informadas (/api/health/migracoes)', async () => {
    const { res, corpo } = await buscar(`${site}/api/health/migracoes`)
    exigir(res.status === 200, `status ${res.status}`)
    const j = JSON.parse(corpo)
    exigir(Array.isArray(j.aplicadas), 'resposta sem lista de migrações')
    return `${j.aplicadas.length} aplicadas`
  })

  // Portas que precisam estar FECHADAS para quem não tem login nem token.
  const fechadas: [string, string, number[], RequestInit?][] = [
    ['Diagnóstico completo exige admin', '/api/health?detalhe=1', [401, 403]],
    ['Tarefa agendada exige token', '/api/cron/sync', [401, 403]],
    ['Área do aluno exige login', '/api/me/questoes', [401]],
    ['Responder questão exige login', '/api/me/questoes/x/attempt', [401], { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }],
    ['Painel admin exige login', '/api/admin/crons', [401, 403]],
  ]
  for (const [nome, caminho, aceitos, init] of fechadas) {
    await checar(nome, async () => {
      const { res } = await buscar(`${site}${caminho}`, init)
      exigir(aceitos.includes(res.status), `respondeu ${res.status} (esperado ${aceitos.join(' ou ')})`)
      return String(res.status)
    })
  }

  await checar('Otimizador de imagem não serve imagem externa', async () => {
    const alvo = encodeURIComponent('https://github.githubassets.com/favicons/favicon.png')
    const { res } = await buscar(`${site}/_next/image?url=${alvo}&w=64&q=75`)
    const imagem = (res.headers.get('content-type') ?? '').startsWith('image/')
    exigir(!(res.status === 200 && imagem), 'serviu imagem de outro site: /_next/image está aberto')
    return `recusou (${res.status})`
  })

  await checar('Nenhum segredo no JavaScript público', async () => {
    const paginas = ['/', '/login', '/cadastro', '/dashboard', '/dashboard/questoes', '/admin']
    const scripts = new Set<string>()
    let texto = ''
    for (const p of paginas) {
      const { res, corpo } = await buscar(`${site}${p}`)
      if (res.status !== 200) continue
      texto += corpo
      for (const s of scriptsDaPagina(corpo, site)) scripts.add(s)
    }
    exigir(scripts.size > 0, 'nenhum script encontrado (a página mudou de formato?)')
    for (const s of [...scripts].slice(0, 120)) texto += (await buscar(s)).corpo
    const achados = procurarSegredos(texto)
    exigir(achados.length === 0, achados.map((a) => `${a.nome}: ${a.amostra}`).join('; '))
    return `${scripts.size} arquivos de ${paginas.length} páginas, limpos`
  })

  const falhas = resultados.filter((r) => !r.ok)
  for (const r of resultados) console.log(`${r.ok ? '✅' : '❌'} ${r.nome.padEnd(48)} ${String(r.ms).padStart(6)} ms  ${r.detalhe}`)
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} checagens ok em ${site}`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      `### Teste de fumaça — ${site}`, '', '| | Checagem | Tempo | Detalhe |', '|---|---|---|---|',
      ...resultados.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.nome} | ${r.ms} ms | ${r.detalhe.replace(/\|/g, '/')} |`), '',
    ].join('\n'))
  }
  if (falhas.length > 0) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e?.message ?? e); process.exitCode = 1 })
}
