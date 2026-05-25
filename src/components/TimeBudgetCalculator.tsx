'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Clock, BookOpen, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Calculadora de tempo de estudo. Concurseiro tem 2 perguntas constantes:
 *  1) "Quanto preciso estudar por dia pra passar na prova X?"
 *  2) "Dado meu tempo, dá pra eu passar até o dia X?"
 *
 * Esse widget responde as duas com matemática simples (sem chamar IA),
 * direto na landing, sem precisar cadastrar. É um lead magnet de utilidade:
 * mostra que o sistema PENSA em concurseiro, antes mesmo de a pessoa criar
 * conta.
 *
 * Cálculo: regra simples baseada em benchmarks reais de aprovados:
 *   - 4-6 meses de prep com 3-4h/dia = aprovação realista pra prova fácil
 *   - 8-12 meses de prep com 3-4h/dia = aprovação realista pra Cebraspe nível PF
 *
 *   carga_total_recomendada (horas):
 *     básico (PRF/PMDF/GCM):    400-500h
 *     intermediário (PCDF/PMMG): 600-800h
 *     avançado (PF Agente/PRF):  900-1100h
 *     expert (PF Delegado/Perito): 1500h+
 */

const DIFICULDADES = [
  { id: 'basico', label: 'Básico', desc: 'PRF, GCM, PM soldado (média)', cargaTotal: 450 },
  { id: 'medio', label: 'Médio', desc: 'PCDF, PMDF, CBMDF, Bombeiros', cargaTotal: 700 },
  { id: 'avancado', label: 'Avançado', desc: 'PF Agente/Escrivão, PRF, Polícia Penal', cargaTotal: 1000 },
  { id: 'expert', label: 'Expert', desc: 'PF Delegado, Perito, Auditor Federal', cargaTotal: 1500 },
] as const

export function TimeBudgetCalculator() {
  const [horasPorDia, setHorasPorDia] = useState(3)
  const [diasUteis, setDiasUteis] = useState(6) // dias por semana
  const [dificuldade, setDificuldade] = useState<typeof DIFICULDADES[number]['id']>('medio')

  const resultado = useMemo(() => {
    const cargaTotal = DIFICULDADES.find((d) => d.id === dificuldade)!.cargaTotal
    const horasSemana = horasPorDia * diasUteis
    const semanasNecessarias = Math.ceil(cargaTotal / horasSemana)
    const mesesNecessarios = Math.ceil(semanasNecessarias / 4.345)
    return { cargaTotal, horasSemana, semanasNecessarias, mesesNecessarios }
  }, [horasPorDia, diasUteis, dificuldade])

  return (
    <section className="py-12 sm:py-16 bg-muted/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
            <Calculator className="w-3.5 h-3.5" /> Calculadora gratuita
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Quanto tempo de estudo até a sua aprovação?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Resposta honesta em 5 segundos, sem cadastro. Baseada em horas reais de aprovados.
          </p>
        </div>

        <div className="card p-5 sm:p-7 grid lg:grid-cols-[1fr_1px_320px] gap-6">
          {/* Inputs */}
          <div className="space-y-5">
            {/* Horas por dia */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  Quantas horas por dia você consegue estudar?
                </label>
                <span className="text-brand-600 dark:text-brand-400 font-bold tabular-nums">{horasPorDia}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={horasPorDia}
                onChange={(e) => setHorasPorDia(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1h</span>
                <span>5h</span>
                <span>10h</span>
              </div>
            </div>

            {/* Dias por semana */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                  Quantos dias por semana?
                </label>
                <span className="text-brand-600 dark:text-brand-400 font-bold tabular-nums">{diasUteis} dias</span>
              </div>
              <input
                type="range"
                min={3}
                max={7}
                value={diasUteis}
                onChange={(e) => setDiasUteis(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
              </div>
            </div>

            {/* Dificuldade do concurso */}
            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-brand-600" />
                Qual a dificuldade do concurso?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DIFICULDADES.map((d) => {
                  const active = dificuldade === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDificuldade(d.id)}
                      className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-border bg-card hover:border-brand-500/40'
                      }`}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{d.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Divider vertical */}
          <div className="hidden lg:block w-px bg-border" />

          {/* Resultado */}
          <motion.div
            key={`${horasPorDia}-${diasUteis}-${dificuldade}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col justify-center"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Estimativa pra ficar pronto
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-brand-600 to-emerald-500 bg-clip-text text-transparent tabular-nums">
                {resultado.mesesNecessarios}
              </span>
              <span className="text-lg font-semibold text-muted-foreground">
                {resultado.mesesNecessarios === 1 ? 'mês' : 'meses'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              ≈ {resultado.semanasNecessarias} semanas · {resultado.cargaTotal}h totais
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carga semanal:</span>
                <span className="font-semibold tabular-nums">{resultado.horasSemana}h/semana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carga total:</span>
                <span className="font-semibold tabular-nums">{resultado.cargaTotal}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ritmo:</span>
                <span className="font-semibold">
                  {horasPorDia >= 5 ? 'Intenso' : horasPorDia >= 3 ? 'Consistente' : 'Tranquilo'}
                </span>
              </div>
            </div>

            <Link
              href="/planos"
              className="group inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all"
            >
              Receber um plano com essa carga
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Cronograma adaptativo · 3 dias grátis · sem cartão
            </p>
          </motion.div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4 max-w-2xl mx-auto">
          Estimativa baseada em horas médias de aprovados (sem ciência exata — varia conforme base anterior,
          consistência e dificuldade pessoal). Pra um plano específico do seu edital, comece o trial.
        </p>
      </div>
    </section>
  )
}
