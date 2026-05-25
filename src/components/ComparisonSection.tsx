'use client'

import { motion } from 'framer-motion'
import { Check, X, Scale, Info } from 'lucide-react'
import { Reveal } from '@/lib/motion-helpers'

/**
 * Tabela de comparação honesta com concorrentes brasileiros de concurso.
 * Concurseiro experiente está comparando agora — vale a pena facilitar a
 * leitura. Bater de frente, sem mentir sobre o concorrente.
 *
 * Regra de honestidade:
 *  - Não inventa feature que concorrente tenha (se a Estratégia tem
 *    cronograma, marca ✓ pra Estratégia)
 *  - Não esconde feature que Gabaritai NÃO tem (se a gente ainda não
 *    tem aprovados destacados, marca explicitamente que estamos
 *    construindo)
 *  - Diferencial é só onde a gente realmente é diferente
 *
 * Bate as plataformas mais comuns: Estratégia Concursos, Gran Cursos,
 * Tec Concursos, Qconcursos.
 */

const RECURSOS: Array<{
  label: string
  desc?: string
  gabaritai: 'sim' | 'nao' | 'parcial' | string
  estrategia: 'sim' | 'nao' | 'parcial' | string
  gran: 'sim' | 'nao' | 'parcial' | string
  tec: 'sim' | 'nao' | 'parcial' | string
}> = [
  {
    label: 'Cronograma adaptativo ao edital',
    desc: 'Cronograma que se ajusta automaticamente ao SEU edital, sem precisar montar manualmente',
    gabaritai: 'sim',
    estrategia: 'parcial',
    gran: 'parcial',
    tec: 'nao',
  },
  {
    label: 'Cronograma se ajusta ao seu desempenho',
    desc: 'Errou muito uma matéria? Próxima semana puxa mais horas pra ela. Sem precisar pedir.',
    gabaritai: 'sim',
    estrategia: 'nao',
    gran: 'nao',
    tec: 'nao',
  },
  {
    label: 'Edital verticalizado pronto',
    desc: 'Edital extraído em árvore de matéria-tópico-assunto, com peso e status de cada item',
    gabaritai: 'sim',
    estrategia: 'parcial',
    gran: 'parcial',
    tec: 'nao',
  },
  {
    label: 'Detecção automática de edital novo',
    desc: 'Saiu edital atualizado? Cronograma rebalanceia sozinho com matéria nova/removida',
    gabaritai: 'sim',
    estrategia: 'nao',
    gran: 'nao',
    tec: 'nao',
  },
  {
    label: 'Banco de questões oficiais',
    desc: 'Questões de provas anteriores reais',
    gabaritai: 'sim',
    estrategia: 'sim',
    gran: 'sim',
    tec: 'sim',
  },
  {
    label: 'Simulado no formato exato da banca',
    desc: 'Cebraspe com penalização, FGV múltipla 5, FCC literal',
    gabaritai: 'sim',
    estrategia: 'sim',
    gran: 'sim',
    tec: 'parcial',
  },
  {
    label: 'Flashcards com repetição espaçada (SM-2)',
    desc: 'Algoritmo SuperMemo SM-2, mesma base do Anki',
    gabaritai: 'sim',
    estrategia: 'nao',
    gran: 'nao',
    tec: 'nao',
  },
  {
    label: 'Mentor 24h com contexto do aluno',
    desc: 'Tira dúvida sabendo SEU progresso, não chatbot genérico',
    gabaritai: 'sim',
    estrategia: 'parcial',
    gran: 'parcial',
    tec: 'nao',
  },
  {
    label: 'Correção de redação',
    desc: 'Nota global + por critério, com sugestão de reescrita',
    gabaritai: 'sim',
    estrategia: 'sim',
    gran: 'sim',
    tec: 'nao',
  },
  {
    label: 'Aulas em vídeo',
    desc: 'Biblioteca grande de aulas gravadas por professor',
    gabaritai: 'nao',
    estrategia: 'sim',
    gran: 'sim',
    tec: 'nao',
  },
  {
    label: 'Sem fidelidade · cancela em 2 cliques',
    gabaritai: 'sim',
    estrategia: 'parcial',
    gran: 'parcial',
    tec: 'sim',
  },
  {
    label: 'Preço (entrada)',
    desc: 'Plano mensal mais barato',
    gabaritai: 'R$ 39/mês',
    estrategia: 'R$ 79+/mês',
    gran: 'R$ 99+/mês',
    tec: 'R$ 36/mês',
  },
]

const COLUNAS: Array<{ id: string; nome: string; tag?: string }> = [
  { id: 'gabaritai', nome: 'Gabaritai', tag: 'novo' },
  { id: 'estrategia', nome: 'Estratégia' },
  { id: 'gran', nome: 'Gran Cursos' },
  { id: 'tec', nome: 'Tec Concursos' },
]

function Cell({ value, isGabaritai }: { value: string; isGabaritai: boolean }) {
  if (value === 'sim') {
    return (
      <div className="flex items-center justify-center">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isGabaritai
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>
      </div>
    )
  }
  if (value === 'nao') {
    return (
      <div className="flex items-center justify-center">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center justify-center">
          <X className="w-4 h-4" strokeWidth={3} />
        </div>
      </div>
    )
  }
  if (value === 'parcial') {
    return (
      <div className="flex items-center justify-center">
        <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">~</span>
      </div>
    )
  }
  return (
    <div
      className={`text-center text-xs font-bold tabular-nums ${
        isGabaritai ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
      }`}
    >
      {value}
    </div>
  )
}

export function ComparisonSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/60 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" /> Comparação honesta
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Gabaritai vs concorrentes
          </h2>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            Sem demonizar concorrente. Eles têm pontos fortes que a gente não tem (ainda).
            E vice-versa. Esse quadro te ajuda a decidir o que importa <strong className="text-foreground">pra você</strong>.
          </p>
        </Reveal>

        {/* Tabela — desktop */}
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recurso
                  </th>
                  {COLUNAS.map((c) => (
                    <th
                      key={c.id}
                      className={`p-4 text-center ${
                        c.id === 'gabaritai' ? 'bg-brand-500/5 border-x border-brand-500/20' : ''
                      }`}
                    >
                      <div className="text-sm font-bold">{c.nome}</div>
                      {c.tag && (
                        <div className="mt-0.5 inline-block text-[9px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                          {c.tag}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECURSOS.map((r, i) => (
                  <motion.tr
                    key={r.label}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-sm">{r.label}</div>
                      {r.desc && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{r.desc}</div>
                      )}
                    </td>
                    {COLUNAS.map((c) => (
                      <td
                        key={c.id}
                        className={`p-4 ${
                          c.id === 'gabaritai' ? 'bg-brand-500/5 border-x border-brand-500/20' : ''
                        }`}
                      >
                        <Cell value={(r as any)[c.id]} isGabaritai={c.id === 'gabaritai'} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: cards comparativos */}
        <div className="md:hidden space-y-3">
          {RECURSOS.map((r) => (
            <div key={r.label} className="card p-4">
              <div className="font-semibold text-sm mb-1">{r.label}</div>
              {r.desc && (
                <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{r.desc}</div>
              )}
              <div className="grid grid-cols-4 gap-1">
                {COLUNAS.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2 rounded-lg text-center ${
                      c.id === 'gabaritai' ? 'bg-brand-500/10' : 'bg-muted/30'
                    }`}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {c.nome}
                    </div>
                    <Cell value={(r as any)[c.id]} isGabaritai={c.id === 'gabaritai'} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer + legenda */}
        <Reveal className="mt-6 grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-semibold text-foreground inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Legenda
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> tem</span>
              <span className="inline-flex items-center gap-1"><span className="text-amber-500 font-bold">~</span> parcial</span>
              <span className="inline-flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> não tem</span>
            </div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Quadro atualizado em mai/2026.</strong> Concorrentes evoluem rápido —
            se sentiu que algo está incorreto, escreve pra gente pelo email. Atualizamos.
          </div>
        </Reveal>
      </div>
    </section>
  )
}
