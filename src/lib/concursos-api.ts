/**
 * Cliente da API externa https://concursos-api.deno.dev
 * (https://github.com/Jeiel0rbit/concursos-api-deno)
 *
 * Retorna lista de concursos abertos/previstos por UF.
 * Formato: { Órgão: string, Vagas: string }
 */
import { prisma } from './prisma'

const API_BASE = 'https://concursos-api.deno.dev'

const RELEVANT_KEYWORDS = [
  // Polícias
  'polícia militar', 'pm ', 'pm-', 'pmdf', 'pmgo', 'pmmg', 'pmsc', 'pmsp', 'pm sp', 'pm pr', 'pm rs',
  'polícia federal', 'pf', 'polícia rodoviária', 'prf',
  'polícia civil', 'pc ', 'pc-', 'pcdf', 'pcgo', 'pcmg', 'pcsc', 'pcsp',
  'polícia penal', 'penal federal', 'penal estadual', 'depen',
  // Bombeiros
  'bombeiro', 'cbm', 'cbmdf', 'cbmgo', 'cbmmg', 'cbmsc',
  // Guardas
  'guarda civil', 'gcm', 'guarda municipal', 'guarda metropolitana',
  // Forças armadas
  'exército', 'marinha', 'aeronáutica', 'fab',
]

export type ConcursoApiItem = {
  Órgão: string
  Vagas?: string
}

export type ConcursoApiResponse = {
  desenvolvido_por?: string
  estado?: string
  uf?: string
  message?: string
  concursos_abertos?: ConcursoApiItem[]
  concursos_previstos?: ConcursoApiItem[]
}

export async function fetchConcursosByUf(uf: string): Promise<ConcursoApiResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/${uf.toLowerCase()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }, // cache 1h no Next.js
    })
    if (!res.ok) return null
    return (await res.json()) as ConcursoApiResponse
  } catch (err) {
    console.error(`[concursos-api] fetch ${uf} falhou:`, err)
    return null
  }
}

export function isRelevantOrgao(orgao: string): boolean {
  const o = orgao.toLowerCase()
  return RELEVANT_KEYWORDS.some((k) => o.includes(k))
}

/**
 * Sincroniza UFs informadas: cria alertas novos, atualiza lastSeenAt nos existentes.
 * Retorna estatísticas.
 */
export async function syncConcursosFromApi(ufs: string[]): Promise<{
  ufsProcessadas: number
  novosAlertas: number
  alertasAtualizados: number
  relevantes: number
  failed: string[]
}> {
  let novos = 0
  let atualizados = 0
  let relevantes = 0
  const failed: string[] = []

  for (const uf of ufs) {
    const data = await fetchConcursosByUf(uf)
    if (!data) {
      failed.push(uf)
      continue
    }

    const items = [
      ...(data.concursos_abertos ?? []).map((it) => ({ ...it, status: 'ABERTO' as const })),
      ...(data.concursos_previstos ?? []).map((it) => ({ ...it, status: 'PREVISTO' as const })),
    ]

    for (const item of items) {
      if (!item.Órgão) continue
      const relevant = isRelevantOrgao(item.Órgão)
      if (relevant) relevantes++

      try {
        const result = await prisma.concursoAlerta.upsert({
          where: { uf_orgao_status: { uf: uf.toUpperCase(), orgao: item.Órgão, status: item.status } },
          update: {
            vagas: item.Vagas ?? null,
            lastSeenAt: new Date(),
            isRelevant: relevant,
            rawData: item as any,
          },
          create: {
            uf: uf.toUpperCase(),
            orgao: item.Órgão,
            vagas: item.Vagas ?? null,
            status: item.status,
            origem: 'concursos-api.deno.dev',
            isRelevant: relevant,
            rawData: item as any,
          },
        })
        // upsert não retorna se foi criado/atualizado direto — usa createdAt
        if (result.firstSeenAt.getTime() === result.lastSeenAt.getTime()) novos++
        else atualizados++
      } catch (err) {
        console.error(`[concursos-api] upsert ${uf}/${item.Órgão}:`, err)
      }
    }
  }

  return { ufsProcessadas: ufs.length - failed.length, novosAlertas: novos, alertasAtualizados: atualizados, relevantes, failed }
}

/** UFs com foco militar/policial (suas prioridades). */
export const PRIORITY_UFS = ['df', 'go', 'mg', 'sc', 'sp']

/** Todas as UFs do Brasil. */
export const ALL_UFS = [
  'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg',
  'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to',
]
