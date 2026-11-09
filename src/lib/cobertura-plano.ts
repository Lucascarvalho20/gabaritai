/**
 * Decide QUAIS cursos um plano libera.
 *
 * Esta parte é pura de propósito: ela não consulta o banco, só diz o que
 * procurar. Antes a decisão estava embutida na função que também fazia as
 * queries, e misturar as duas coisas tornava impossível testar a regra sem um
 * Postgres do lado — justamente a regra que decide quem recebe o que pagou.
 *
 * Quem executa a busca é `resolveCourseIds`, em checkout-fulfillment.ts.
 */

export type TipoCobertura = 'SPECIFIC' | 'AREA' | 'ALL'
export type TipoPlano = 'TRIAL' | 'SINGLE_COURSE' | 'COMBO' | 'FULL_ACCESS' | 'VITALICIO_PROMO'

export type PlanoDeBusca =
  /** Busca os cursos ativos com estes slugs exatos. */
  | { modo: 'slugs'; slugs: string[] }
  /** Busca todos os cursos ativos destas áreas. */
  | { modo: 'areas'; areas: string[] }
  /** Busca todos os cursos ativos. */
  | { modo: 'todos' }
  /** Não há o que liberar — e o motivo, para registro. */
  | { modo: 'nenhum'; motivo: string }

export function planejarCobertura(opts: {
  coverageType: TipoCobertura
  coverageData: unknown
  courseSlug?: string | null
  planType: TipoPlano
}): PlanoDeBusca {
  const lista = Array.isArray(opts.coverageData) ? (opts.coverageData as unknown[]) : []
  const textos = lista.filter((v): v is string => typeof v === 'string' && v.trim() !== '')

  if (opts.coverageType === 'ALL') return { modo: 'todos' }

  if (opts.coverageType === 'AREA') {
    return textos.length ? { modo: 'areas', areas: textos } : { modo: 'nenhum', motivo: 'area_sem_valores' }
  }

  // SPECIFIC daqui pra baixo.
  const ehCombo = opts.planType === 'COMBO' || opts.planType === 'FULL_ACCESS'

  // Combo libera TODOS os cursos da cobertura, e ignora a escolha do comprador:
  // num combo não há o que escolher.
  if (ehCombo) {
    return textos.length ? { modo: 'slugs', slugs: textos } : { modo: 'nenhum', motivo: 'combo_sem_cobertura' }
  }

  // Curso avulso: vale o escolhido no checkout. Se a cobertura tem exatamente
  // um curso, ele é o escolhido por omissão. Com vários e nenhum escolhido,
  // NÃO se chuta — liberar o curso errado é pior que não liberar.
  const escolhido = opts.courseSlug?.trim() || (textos.length === 1 ? textos[0] : null)
  if (!escolhido) {
    return { modo: 'nenhum', motivo: textos.length > 1 ? 'varios_cursos_sem_escolha' : 'sem_curso_definido' }
  }

  // A validação de que o escolhido pertence à cobertura é feita no checkout,
  // antes de cobrar. Aqui é repetida porque o fulfillment também roda pelo
  // webhook, que não passa por aquele caminho.
  if (textos.length > 0 && !textos.includes(escolhido)) {
    return { modo: 'nenhum', motivo: 'curso_fora_da_cobertura' }
  }

  return { modo: 'slugs', slugs: [escolhido] }
}
