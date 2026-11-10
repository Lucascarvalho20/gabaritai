'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calculator, ChevronRight, RefreshCw } from 'lucide-react'
import {
  cabeNoTempo, PALAVRAS_POR_MINUTO, REVISAO_FRACAO, MIN_AMOSTRAS, MIN_POR_QUESTAO_REFERENCIA,
  type EstimativaEdital,
} from '@/lib/tempo-estudo'

/**
 * "Dá tempo de estudar o edital até a prova?" — a calculadora da home.
 *
 * O tempo de cada concurso vem do banco (GET /api/tempo/concursos): os
 * tópicos do edital, o tamanho do material de cada um e o tempo real dos
 * alunos por questão. A conta com as horas do visitante roda aqui mesmo
 * (cabeNoTempo), com a régua do cronograma: sessões inteiras de 50 min.
 */

type Concurso = {
  slug: string
  nome: string
  edital: { titulo: string; ano: number; banca: string | null; dataProva: string | null }
  estimativa: EstimativaEdital
}

const fmtNum = (n: number, casas = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
// Uma precisão só para o total e as partes: com casas diferentes, as partes
// somariam 41,9 h embaixo de um total de 41 h.
const fmtHoras = (min: number, casas = 1) => (min < 60 ? `${Math.round(min)} min` : `${fmtNum(min / 60, casas)} h`)
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
// Datas sempre ao meio-dia local: a diferença entre duas delas é um número
// inteiro de dias, sem o fuso empurrar a prova para o dia anterior.
const hojeInput = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const doInput = (v: string) => (v ? new Date(`${v}T12:00:00`) : null)
const fmtDuracaoDia = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`

export function TimeBudgetCalculator() {
  const [concursos, setConcursos] = useState<Concurso[] | null>(null)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [slug, setSlug] = useState('')
  const [horasPorDia, setHorasPorDia] = useState(3)
  const [diasPorSemana, setDiasPorSemana] = useState(6)
  const [dataProva, setDataProva] = useState('')

  useEffect(() => {
    let vivo = true
    setErro(false)
    fetch('/api/tempo/concursos')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { concursos: Concurso[] }) => {
        if (!vivo) return
        setConcursos(d.concursos)
        // Começa pelo concurso com mais conteúdo medido: o exemplo mais fiel.
        const inicial = [...d.concursos].sort((a, b) => b.estimativa.topicosMedidos - a.estimativa.topicosMedidos)[0]
        if (inicial) escolher(inicial)
      })
      .catch(() => vivo && setErro(true))
    return () => { vivo = false }
  }, [tentativa])

  function escolher(c: Concurso) {
    setSlug(c.slug)
    // A data do edital é um dia (gravado à meia-noite UTC): vale a parte da data.
    const dia = c.edital.dataProva?.slice(0, 10) ?? ''
    setDataProva(dia > hojeInput() ? dia : '')
  }

  const atual = concursos?.find((c) => c.slug === slug) ?? null
  const e = atual?.estimativa
  const semConteudo = !!e && e.topicos === 0

  const veredito = useMemo(
    () => e && !semConteudo
      ? cabeNoTempo(e.totalMin, { horasPorDia, diasPorSemana, hoje: doInput(hojeInput())!, dataProva: doInput(dataProva) })
      : null,
    [e, semConteudo, horasPorDia, diasPorSemana, dataProva],
  )

  const casas = e && e.totalMin >= 100 * 60 ? 0 : 1
  const partes = e && !semConteudo ? {
    teoria: e.materias.reduce((s, m) => s + m.teoriaMin, 0),
    questoes: e.materias.reduce((s, m) => s + m.questoesMin, 0),
    revisao: e.materias.reduce((s, m) => s + m.revisaoMin, 0),
  } : null

  return (
    <section id="calculadora" className="scroll-mt-16 py-12 sm:py-16 bg-muted/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
            <Calculator className="w-3.5 h-3.5" /> Calculadora · sem cadastro
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dá tempo de estudar o edital até a prova?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Escolha o concurso e diga quanto você estuda. A conta usa o conteúdo cadastrado de cada edital: os
            tópicos, o tamanho de cada material e o tempo que os alunos levam de verdade em cada questão.
          </p>
        </div>

        {erro ? (
          <div className="card p-6 text-sm flex flex-wrap items-center gap-3">
            <span>Não foi possível carregar os editais agora.</span>
            <button type="button" onClick={() => setTentativa((t) => t + 1)} className="btn-ghost btn-sm">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar de novo
            </button>
          </div>
        ) : concursos && concursos.length === 0 ? (
          <div className="card p-6 text-sm text-muted-foreground">Nenhum edital cadastrado ainda.</div>
        ) : (
          <div className="card p-5 sm:p-7 grid lg:grid-cols-[1fr_1px_340px] gap-6">
            {/* min-w-0: item de grid não encolhe abaixo do conteúdo sem isso, e a página vaza no celular */}
            <div className="space-y-5 min-w-0">
              <div>
                <label htmlFor="calc-concurso" className="label">Concurso</label>
                {concursos ? (
                  <select
                    id="calc-concurso"
                    className="input"
                    value={slug}
                    onChange={(ev) => { const c = concursos.find((x) => x.slug === ev.target.value); if (c) escolher(c) }}
                  >
                    {concursos.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.nome} — edital {c.edital.ano}{c.edital.banca ? ` (${c.edital.banca})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-[42px] rounded-xl bg-muted animate-pulse" aria-label="Carregando concursos" />
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label htmlFor="calc-horas" className="text-sm font-medium">Horas por dia</label>
                  <span className="text-sm font-semibold tabular-nums">{fmtNum(horasPorDia, 1)} h</span>
                </div>
                <input id="calc-horas" type="range" min={1} max={10} step={0.5} value={horasPorDia}
                  onChange={(ev) => setHorasPorDia(Number(ev.target.value))} className="w-full accent-brand-500" />
                {veredito && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Rende {fmtDuracaoDia(veredito.minutosPorDia)} de estudo: {veredito.minutosPorDia / 50} sessões de 50 min, o resto é pausa.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label htmlFor="calc-dias" className="text-sm font-medium">Dias por semana</label>
                  <span className="text-sm font-semibold tabular-nums">{diasPorSemana}</span>
                </div>
                <input id="calc-dias" type="range" min={1} max={7} step={1} value={diasPorSemana}
                  onChange={(ev) => setDiasPorSemana(Number(ev.target.value))} className="w-full accent-brand-500" />
              </div>

              <div>
                <label htmlFor="calc-prova" className="label">Data da prova</label>
                <input id="calc-prova" type="date" className="input" value={dataProva} min={hojeInput()}
                  onChange={(ev) => setDataProva(ev.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {dataProva && dataProva === atual?.edital.dataProva?.slice(0, 10)
                    ? 'Data do edital. Pode mudar.'
                    : 'Opcional. Sem data, mostramos só quanto tempo leva.'}
                </p>
              </div>
            </div>

            <div className="hidden lg:block w-px bg-border" />

            <div aria-live="polite" className="flex flex-col min-w-0">
              {!concursos ? (
                <div className="space-y-3" aria-label="Calculando">
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-12 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-20 rounded-lg bg-muted animate-pulse" />
                </div>
              ) : semConteudo ? (
                <p className="text-sm text-muted-foreground">
                  Este edital ainda não tem conteúdo cadastrado. Sem conteúdo, qualquer número aqui seria inventado.
                </p>
              ) : e && veredito && partes ? (
                <>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Para percorrer o conteúdo</p>
                  <p className="text-5xl font-bold tracking-tight tabular-nums mt-1">{fmtHoras(e.totalMin, casas)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Number.isFinite(veredito.diasParaTerminar)
                      ? <>No seu ritmo, termina em {fmtData(veredito.terminaEm)} ({fmtNum(Math.ceil(veredito.diasParaTerminar / 7))} {Math.ceil(veredito.diasParaTerminar / 7) === 1 ? 'semana' : 'semanas'}).</>
                      : 'Com zero hora por dia, não termina.'}
                  </p>

                  {veredito.cabe !== undefined && (
                    veredito.diasAteProva === 0 ? (
                      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">A prova é hoje ou já passou. Escolha outra data.</p>
                    ) : veredito.cabe ? (
                      <p className="mt-4 rounded-lg bg-success-50 dark:bg-success-600/15 p-3 text-sm">
                        <strong className="text-success-600 dark:text-success-400">Cabe até a prova.</strong>{' '}
                        Em {fmtNum(veredito.diasAteProva!)} dias dá para percorrer o conteúdo inteiro{' '}
                        {veredito.voltas! >= 2 ? <>{fmtNum(veredito.voltas!, 1)} vezes.</> : <>uma vez, com {fmtHoras(veredito.disponivelMin! - e.totalMin)} de folga.</>}
                      </p>
                    ) : (
                      <p className="mt-4 rounded-lg bg-warning-50 dark:bg-warning-600/15 p-3 text-sm">
                        <strong className="text-warning-600 dark:text-warning-400">Não cabe até a prova.</strong>{' '}
                        Faltam {fmtHoras(e.totalMin - veredito.disponivelMin!)}.{' '}
                        {veredito.horasPorDiaNecessarias! <= 12
                          ? <>Com {fmtNum(veredito.horasPorDiaNecessarias!, 1)} h por dia, caberia.</>
                          : 'Nem com 12 h por dia: vale mirar a próxima prova.'}
                      </p>
                    )
                  )}

                  <dl className="mt-4 text-sm divide-y divide-border">
                    <div className="flex justify-between py-1.5">
                      <dt className="text-muted-foreground">Teoria · {fmtNum(e.topicos)} tópicos</dt>
                      <dd className="font-medium tabular-nums">{fmtHoras(partes.teoria, casas)}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-muted-foreground">Questões · {fmtNum(e.questoes)} no banco</dt>
                      <dd className="font-medium tabular-nums">{fmtHoras(partes.questoes, casas)}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-muted-foreground">Revisão</dt>
                      <dd className="font-medium tabular-nums">{fmtHoras(partes.revisao, casas)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fmtNum(e.percentualMedido * 100)}% medido no banco; o resto é estimado.
                  </p>

                  <Link href="/planos" className="btn-primary btn-md mt-5 group">
                    Montar meu cronograma
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}

        {e && !semConteudo && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <details className="card p-4 text-sm min-w-0">
              <summary className="cursor-pointer font-semibold">Tempo de cada matéria ({e.materias.length})</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left tabular-nums">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Matéria</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Peso</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Tópicos</th>
                      <th className="py-1.5 font-medium text-right">Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {e.materias.map((m) => (
                      <tr key={m.id}>
                        <td className="py-1.5 pr-3">
                          {m.nome}
                          {m.semConteudo && <span className="block text-xs text-muted-foreground">sem tópicos ainda · estimado</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{fmtNum(m.peso, 1)}</td>
                        <td className="py-1.5 pr-3 text-right">{m.topicos}</td>
                        <td className="py-1.5 text-right">{fmtHoras(m.totalMin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="card p-4 text-sm min-w-0">
              <summary className="cursor-pointer font-semibold">Como a conta é feita</summary>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Teoria:</strong> palavras do material de cada tópico ÷ {PALAVRAS_POR_MINUTO} por minuto, ritmo de leitura para memorizar. Subassunto cujo assunto já tem texto não conta de novo; tópico ainda sem material recebe a mediana dos tópicos medidos da matéria.</li>
                <li><strong className="text-foreground">Questões:</strong> as questões ativas do banco × a mediana do tempo real dos alunos na matéria (com pelo menos {MIN_AMOSTRAS} respostas); com menos, a mediana da plataforma; sem dado, {fmtNum(MIN_POR_QUESTAO_REFERENCIA, 1)} min.</li>
                <li><strong className="text-foreground">Revisão:</strong> {fmtNum(REVISAO_FRACAO * 100)}% da teoria, a mesma proporção que o cronograma reserva.</li>
                <li><strong className="text-foreground">Seu tempo:</strong> só sessões inteiras de 50 min contam, como no cronograma. Por isso esta conta e a do cronograma dão o mesmo resultado.</li>
              </ul>
            </details>
          </div>
        )}
      </div>
    </section>
  )
}
