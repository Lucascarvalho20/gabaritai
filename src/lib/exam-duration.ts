/**
 * Calcula a duração efetiva de um simulado feito no Gabaritai a partir dos
 * metadados do edital. Como o Gabaritai ainda NÃO corrige redação, quando
 * o edital tem redação obrigatória precisamos subtrair o tempo equivalente
 * pra simular o tempo real de prova só pras objetivas.
 *
 * Ordem de preferência:
 *  1. duracaoSoObjetivasMin (admin/IA informou explicitamente em rawData)
 *  2. Se hasRedacao=true e mock sem redação → subtrai proporcional (27%)
 *  3. duracaoMin direto
 *  4. Fallback: 4min por questão
 */
export type EditalDurationInfo = {
  duracaoMin?: number | null
  hasRedacao?: boolean | null
  rawData?: any
}

const REDACAO_FRACTION = 0.27 // ~27% — média Cebraspe/FGV pra discursiva longa

export function computeObjetivasDuration(
  edital: EditalDurationInfo | null | undefined,
  totalQuestoes: number,
  opts: { mockHasRedacao?: boolean } = {},
): { durationMin: number; source: 'rawData' | 'subtracted' | 'edital' | 'fallback'; note?: string } {
  const fallback = Math.max(15, totalQuestoes * 4)

  const explicit = edital?.rawData?.duracaoSoObjetivasMin
  if (typeof explicit === 'number' && explicit > 0) {
    return { durationMin: explicit, source: 'rawData' }
  }

  const total = edital?.duracaoMin
  if (typeof total !== 'number' || total <= 0) {
    return { durationMin: fallback, source: 'fallback' }
  }

  // Edital tem redação MAS o simulado é só objetivas → subtrai proporcional
  if (edital?.hasRedacao && !opts.mockHasRedacao) {
    const subtracted = Math.max(15, Math.round(total * (1 - REDACAO_FRACTION)))
    return {
      durationMin: subtracted,
      source: 'subtracted',
      note: `Tempo oficial do edital (${total}min) inclui redação. Como aqui só temos objetivas, descontamos ~${Math.round(REDACAO_FRACTION * 100)}% pra simular o tempo real.`,
    }
  }

  return { durationMin: total, source: 'edital' }
}
