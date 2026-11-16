import { prisma } from './prisma'
import { MIGRACOES_ANTERIORES_AO_REGISTRO } from './migracoes-anteriores'

/**
 * Quais migrações de banco a produção já recebeu.
 *
 * O SQL roda à mão no Supabase, então o código não tem como saber sozinho se
 * a coluna nova já existe. Cada migração termina gravando o próprio nome em
 * `schema_migracoes`; as anteriores a esse registro são reconhecidas pela
 * tabela que criaram. O pipeline compara esta lista com `necessarias` do
 * prisma/migracoes.json antes de promover uma versão para produção.
 */

const NOME_DE_TABELA = /^[a-z_][a-z0-9_]*$/

function semTabela(e: unknown): boolean {
  const err = e as { code?: string; meta?: { code?: string }; message?: string }
  return err?.code === 'P2021' || err?.meta?.code === '42P01' || /schema_migracoes" does not exist/.test(String(err?.message))
}

export async function migracoesAplicadas(): Promise<{ aplicadas: string[]; registro: boolean }> {
  let registradas: string[] = []
  let registro = true
  try {
    const linhas = await prisma.$queryRaw<{ nome: string }[]>`SELECT nome FROM schema_migracoes`
    registradas = linhas.map((l) => l.nome)
  } catch (e) {
    if (!semTabela(e)) throw e
    registro = false
  }

  const anteriores = Object.entries(MIGRACOES_ANTERIORES_AO_REGISTRO).filter(([, tabela]) => NOME_DE_TABELA.test(tabela))
  const presentes = await Promise.all(
    anteriores.map(async ([nome, tabela]) => {
      const [r] = await prisma.$queryRaw<{ existe: boolean }[]>`SELECT to_regclass(${`public.${tabela}`}) IS NOT NULL AS existe`
      return r?.existe ? nome : null
    }),
  )

  const aplicadas = [...new Set([...registradas, ...presentes.filter((n): n is string => !!n)])].sort()
  return { aplicadas, registro }
}
