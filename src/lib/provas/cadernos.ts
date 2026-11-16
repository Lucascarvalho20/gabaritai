/**
 * Prova em mais de um caderno (PF 2025: blocos I, II e III; PRF 2021: a língua
 * estrangeira à parte). O aviso "ver na prova original, página N" precisa abrir
 * o caderno daquele item, não o primeiro.
 */
export type FaixaDeCaderno = { de: number; ate: number; url: string; rotulo?: string }

export function cadernosDaFonte(fonte: unknown): FaixaDeCaderno[] {
  const lista = (fonte as { cadernos?: unknown } | null)?.cadernos
  if (!Array.isArray(lista)) return []
  return lista.filter((c): c is FaixaDeCaderno =>
    !!c && typeof c.url === 'string' && Number.isInteger(c.de) && Number.isInteger(c.ate) && c.de <= c.ate)
}

export function cadernoDoItem(fonte: unknown, numero: number | null): string | null {
  if (numero == null) return null
  return cadernosDaFonte(fonte).find((c) => numero >= c.de && numero <= c.ate)?.url ?? null
}
