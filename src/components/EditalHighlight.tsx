import {
  Briefcase, Banknote, Timer, FileQuestion, Pencil, GraduationCap, Receipt, Award,
} from 'lucide-react'

type EditalLike = {
  vagas?: number | null
  salario?: number | null
  escolaridade?: string | null
  totalQuestoes?: number | null
  duracaoMin?: number | null
  hasRedacao?: boolean | null
  examFormat?: string | null
  taxaInscricao?: number | null
  banca?: { name?: string | null } | null
  ano?: number | null
  titulo?: string | null
}

const formatFmt = {
  CE: 'Certo/Errado',
  ME_5: 'Múltipla 5 alt.',
  ME_4: 'Múltipla 4 alt.',
  MISTA: 'Mista',
} as const

function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
  }
  return `${min}min`
}

/**
 * Cartão com os dados-chave do edital. Concurseiro abre página de curso pra
 * ver EXATAMENTE estes números: quantas vagas, salário, duração da prova,
 * tem redação ou não, formato. Tudo num bloco só, scaneável em 5 segundos.
 */
export function EditalHighlight({ edital }: { edital: EditalLike | null | undefined }) {
  if (!edital) return null

  const items: Array<{ icon: typeof Briefcase; label: string; value: string | null }> = [
    { icon: Briefcase, label: 'Vagas', value: edital.vagas ? `${edital.vagas}` : null },
    { icon: Banknote, label: 'Salário', value: edital.salario ? formatMoney(edital.salario) : null },
    {
      icon: GraduationCap,
      label: 'Escolaridade',
      value: edital.escolaridade ?? null,
    },
    {
      icon: FileQuestion,
      label: 'Questões',
      value: edital.totalQuestoes ? `${edital.totalQuestoes}` : null,
    },
    {
      icon: Timer,
      label: 'Duração',
      value: edital.duracaoMin ? formatDuration(edital.duracaoMin) : null,
    },
    {
      icon: Award,
      label: 'Formato',
      value: edital.examFormat ? formatFmt[edital.examFormat as keyof typeof formatFmt] ?? edital.examFormat : null,
    },
    {
      icon: Pencil,
      label: 'Redação',
      value: edital.hasRedacao == null ? null : edital.hasRedacao ? 'Sim' : 'Não',
    },
    {
      icon: Receipt,
      label: 'Taxa',
      value: edital.taxaInscricao ? formatMoney(edital.taxaInscricao) : null,
    },
  ].filter((i) => i.value != null && i.value !== '')

  if (items.length === 0) return null

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-base">Dados do edital</h2>
          {edital.titulo && (
            <p className="text-xs text-muted-foreground mt-0.5">{edital.titulo}</p>
          )}
        </div>
        {edital.banca?.name && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            Banca {edital.banca.name}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="space-y-1">
              <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="w-3 h-3" />
                {item.label}
              </dt>
              <dd className="font-bold text-sm">{item.value}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
