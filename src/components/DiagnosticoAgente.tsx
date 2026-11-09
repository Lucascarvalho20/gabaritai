'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Brain, Loader2, AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Botão e resultado do agente de diagnóstico (POST /api/agente/diagnostico).
 *
 * Mostra, além do plano, O QUE o agente consultou. Sem isso o resultado parece
 * opinião do modelo; com isso o aluno vê que o plano saiu dos dados dele.
 */

type Prioridade = { materiaId: string; materia: string; motivo: string; acoes: string[] }
type Resposta = {
  plano: { resumo: string; prioridades: Prioridade[] }
  passos: Array<{ ferramenta: string; ok: boolean }>
  provedor: string | null
}

const O_QUE_CONSULTOU: Record<string, string> = {
  consultar_desempenho: 'seu acerto em cada matéria',
  topicos_fracos: 'os tópicos em que você mais erra',
  erros_recentes: 'as últimas questões que você errou',
  buscar_material: 'o material do seu curso',
  tempo_ate_prova: 'quantos dias faltam para a prova',
}

export function DiagnosticoAgente() {
  const [estado, setEstado] = useState<'parado' | 'analisando' | 'pronto' | 'erro'>('parado')
  const [resultado, setResultado] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<{ mensagem: string; bloqueado?: boolean } | null>(null)

  async function analisar() {
    setEstado('analisando')
    setErro(null)
    try {
      const { data } = await api.post<Resposta>('/agente/diagnostico')
      setResultado(data)
      setEstado('pronto')
    } catch (e: any) {
      const status = e?.response?.status
      setErro({
        mensagem: e?.response?.data?.message ?? 'Não foi possível analisar agora. Tente em alguns minutos.',
        bloqueado: status === 403,
      })
      setEstado('erro')
    }
  }

  const consultas = Array.from(new Set(
    (resultado?.passos ?? []).filter((p) => p.ok && O_QUE_CONSULTOU[p.ferramenta]).map((p) => O_QUE_CONSULTOU[p.ferramenta]),
  ))

  return (
    <section className="card p-4 sm:p-5 space-y-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="rounded-xl p-2.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm sm:text-base">Onde você está perdendo mais pontos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A IA cruza seu acerto com o peso de cada matéria no edital e monta um plano curto de ataque.
          </p>
        </div>
        {estado !== 'analisando' && (
          <button
            onClick={analisar}
            className="btn-primary text-xs px-3 py-2 shrink-0"
          >
            {estado === 'pronto' ? 'Analisar de novo' : 'Analisar'}
          </button>
        )}
      </div>

      {estado === 'analisando' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Consultando seu desempenho e o edital — leva uns 15 segundos.
        </div>
      )}

      {estado === 'erro' && erro && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>
            {erro.mensagem}
            {erro.bloqueado && (
              <> <Link href="/planos" className="font-semibold underline">Ver planos</Link></>
            )}
          </span>
        </div>
      )}

      {estado === 'pronto' && resultado && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">{resultado.plano.resumo}</p>

          <ol className="space-y-3">
            {resultado.plano.prioridades.map((p, i) => (
              <li key={p.materiaId} className="rounded-xl border border-border p-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400 tabular-nums">{i + 1}.</span>
                  <h3 className="font-semibold text-sm">{p.materia}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.motivo}</p>
                <ul className="mt-2 space-y-1">
                  {p.acoes.map((a, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-px" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          {consultas.length > 0 && (
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
              <ListChecks className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>Para montar este plano, a IA consultou {consultas.join(', ')}.</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
