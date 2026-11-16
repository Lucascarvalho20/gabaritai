/**
 * Quais migrações de banco a versão deste checkout precisa e a produção ainda
 * não recebeu. É a trava do promover.yml: código que lê coluna nova só vai
 * para produção depois que o SQL que cria a coluna rodou no Supabase.
 *
 * Uso: npm run ci:migracoes -- --site https://gabaritai-red.vercel.app
 * Saída: a lista no terminal e `pendentes=<nomes>` no $GITHUB_OUTPUT.
 * Sai com 1 só se não conseguir consultar a produção.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function pendentes(necessarias: string[], aplicadas: string[]): string[] {
  const feitas = new Set(aplicadas)
  return necessarias.filter((n) => !feitas.has(n))
}

async function main() {
  const i = process.argv.indexOf('--site')
  const site = (i >= 0 ? process.argv[i + 1] : process.env.SITE ?? '').replace(/\/+$/, '')
  if (!/^https?:\/\//.test(site)) throw new Error('Informe o endereço: --site https://...')

  const manifesto = JSON.parse(readFileSync(new URL('../../prisma/migracoes.json', import.meta.url), 'utf8'))
  const res = await fetch(`${site}/api/health/migracoes`, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`produção não informou as migrações (${res.status} em /api/health/migracoes)`)
  const { aplicadas } = (await res.json()) as { aplicadas: string[] }

  const faltam = pendentes(manifesto.necessarias, aplicadas)
  const total = manifesto.necessarias.length
  if (faltam.length === 0) console.log(`Banco de produção em dia (${total} de ${total} migrações necessárias aplicadas).`)
  for (const nome of faltam) console.log(`::warning::Falta rodar no Supabase: prisma/sql/${nome}.sql`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pendentes=${faltam.join(' ')}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`::error::${e?.message ?? e}`); process.exitCode = 1 })
}
