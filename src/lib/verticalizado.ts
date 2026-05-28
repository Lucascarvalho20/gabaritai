/**
 * Helpers compartilhados pro edital verticalizado.
 *
 * Cache key padronizada pra que tanto o endpoint do aluno, o endpoint
 * admin (editar) e o renderer do email apontem pro MESMO registro de
 * AIGenerationCache.
 */

export function getVerticalizadoCacheKey(input: {
  orgao: string | null | undefined
  cargo: string | null | undefined
  banca: string | null | undefined
}): string {
  const o = (input.orgao ?? 'curso').toLowerCase().replace(/\s+/g, '-')
  const c = (input.cargo ?? 'cargo').toLowerCase().replace(/\s+/g, '-')
  const b = (input.banca ?? 'banca').toLowerCase().replace(/\s+/g, '-')
  return `edital_analise:${o}:${c}:${b}`
}
