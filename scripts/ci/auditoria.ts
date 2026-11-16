/**
 * Portão de dependências do CI: falha quando aparece vulnerabilidade ALTA ou
 * CRÍTICA numa dependência de produção que ninguém analisou.
 *
 * Por que não só `npm audit --audit-level=high`: o Next 14 chegou ao fim do
 * suporte e tem avisos que a linha 14 não corrige mais. Com o comando cru o
 * CI ficaria vermelho para sempre — e CI sempre vermelho é CI que ninguém
 * olha. Aqui cada aviso conhecido tem uma exceção escrita em
 * auditoria-excecoes.json (por que não se aplica, ou por que o risco foi
 * aceito) com data de vencimento. Vencida a data, o CI volta a falhar; aviso
 * novo, sem exceção, derruba o CI no mesmo dia.
 *
 * Uso: node scripts/ci/auditoria.ts
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export type Aviso = { id: string; pacote: string; gravidade: string; titulo: string }
export type Excecao = { id: string; pacote: string; motivo: string; vence: string }

const GRAVES = new Set(['high', 'critical'])

/** Os avisos (GHSA) do JSON do `npm audit`, cada um uma vez só. */
export function avisosDoRelatorio(relatorio: any): Aviso[] {
  const porId = new Map<string, Aviso>()
  for (const [pacote, vuln] of Object.entries<any>(relatorio?.vulnerabilities ?? {})) {
    for (const via of vuln?.via ?? []) {
      // Texto em `via` = herdado de outro pacote, que já aparece com o aviso.
      if (!via || typeof via !== 'object') continue
      const id = String(via.url ?? '').split('/').pop() || String(via.source)
      if (!porId.has(id)) porId.set(id, { id, pacote: via.name ?? pacote, gravidade: via.severity, titulo: via.title })
    }
  }
  return [...porId.values()]
}

export function julgar(avisos: Aviso[], excecoes: Excecao[], hoje: Date) {
  const dia = hoje.toISOString().slice(0, 10)
  const bloqueiam: { aviso: Aviso; porque: string }[] = []
  const aceitos: { aviso: Aviso; excecao: Excecao }[] = []
  for (const aviso of avisos.filter((a) => GRAVES.has(a.gravidade))) {
    const excecao = excecoes.find((e) => e.id === aviso.id)
    if (!excecao) bloqueiam.push({ aviso, porque: 'sem exceção analisada' })
    else if (excecao.vence < dia) bloqueiam.push({ aviso, porque: `exceção venceu em ${excecao.vence}` })
    else aceitos.push({ aviso, excecao })
  }
  const presentes = new Set(avisos.map((a) => a.id))
  return {
    bloqueiam,
    aceitos,
    menores: avisos.filter((a) => !GRAVES.has(a.gravidade)),
    // Exceção de aviso que sumiu (pacote atualizado): pode sair da lista.
    semUso: excecoes.filter((e) => !presentes.has(e.id)),
  }
}

function main() {
  const { excecoes } = JSON.parse(readFileSync(new URL('./auditoria-excecoes.json', import.meta.url), 'utf8')) as { excecoes: Excecao[] }

  let bruto = ''
  try {
    bruto = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e: any) {
    bruto = e?.stdout ?? '' // o npm audit sai com código ≠ 0 quando encontra algo
  }
  let relatorio: any = null
  try { relatorio = JSON.parse(bruto) } catch {}
  if (!relatorio?.vulnerabilities) {
    // Registro do npm fora do ar não pode travar deploy: avisa e segue.
    console.log('::warning::npm audit não respondeu; auditoria de dependências pulada nesta execução.')
    return
  }

  const r = julgar(avisosDoRelatorio(relatorio), excecoes, new Date())
  const linha = (a: Aviso) => `${a.gravidade.padEnd(8)} ${a.pacote.padEnd(12)} ${a.id}  ${a.titulo}`
  console.log(`Dependências de produção: ${r.bloqueiam.length} bloqueiam, ${r.aceitos.length} com exceção analisada, ${r.menores.length} baixas/moderadas.\n`)
  for (const b of r.bloqueiam) console.log(`::error::${linha(b.aviso)} — ${b.porque}`)
  for (const a of r.aceitos) console.log(`aceito até ${a.excecao.vence}: ${linha(a.aviso)}`)
  for (const e of r.semUso) console.log(`::notice::Exceção ${e.id} (${e.pacote}) não corresponde a mais nenhum aviso — pode sair de auditoria-excecoes.json.`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    const tabela = [
      '### Auditoria de dependências de produção',
      '',
      '| Situação | Gravidade | Pacote | Aviso | Título |',
      '|---|---|---|---|---|',
      ...r.bloqueiam.map((b) => `| ❌ ${b.porque} | ${b.aviso.gravidade} | ${b.aviso.pacote} | ${b.aviso.id} | ${b.aviso.titulo} |`),
      ...r.aceitos.map((a) => `| ⚠️ exceção até ${a.excecao.vence} | ${a.aviso.gravidade} | ${a.aviso.pacote} | ${a.aviso.id} | ${a.aviso.titulo} |`),
      '',
    ].join('\n')
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, tabela)
  }
  if (r.bloqueiam.length > 0) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
