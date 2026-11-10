'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { EstadoTarefa } from '@/lib/vigia-regras'

/**
 * Cartão do painel admin com o estado de cada cron (GET /api/admin/crons).
 * É o lugar onde o sumiço aparece mesmo quando nenhum aviso pode chegar:
 * com todos os crons parados, não sobra ninguém para mandar o Telegram.
 */

type Tarefa = {
  tarefa: string
  estado: EstadoTarefa
  prazoHoras: number
  ultima: { ok: boolean; status: number | null; detalhe: string | null; criadoEm: string } | null
  ultimaOk: { criadoEm: string } | null
}

const ROTULO: Record<EstadoTarefa, string> = {
  ok: 'em dia',
  falhando: 'falhou na última rodada',
  atrasada: 'passou do prazo',
  aguardando: 'aguardando a 1ª rodada',
}
const COR: Record<EstadoTarefa, string> = {
  ok: 'bg-success-500',
  falhando: 'bg-danger-500',
  atrasada: 'bg-warning-500',
  aguardando: 'bg-muted-foreground/40',
}
const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function TarefasAgendadas() {
  const [dados, setDados] = useState<{ instalado: boolean; tarefas: Tarefa[] } | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    api.get('/admin/crons').then((r) => setDados(r.data)).catch(() => setErro(true))
  }, [])

  if (erro) return <div className="card p-5 text-sm text-danger-600">Não foi possível ler o vigia dos crons.</div>
  if (!dados) return <div className="card p-5 h-40 animate-pulse" aria-label="Carregando tarefas agendadas" />
  if (!dados.instalado) {
    return (
      <div className="card p-5 text-sm">
        <h2 className="font-bold text-foreground">Tarefas agendadas</h2>
        <p className="text-muted-foreground mt-1">
          O vigia ainda não está ligado: rode <code>prisma/sql/2026-11-10-vigia-crons.sql</code> no SQL Editor do Supabase.
        </p>
      </div>
    )
  }

  const problemas = dados.tarefas.filter((t) => t.estado === 'falhando' || t.estado === 'atrasada').length
  return (
    <div className="card p-5">
      <h2 className="font-bold text-foreground text-sm">Tarefas agendadas</h2>
      <p className="text-xs text-muted-foreground">
        {problemas ? `${problemas} com problema` : 'nenhum problema'} · falha e sumiço também avisam no Telegram
      </p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {dados.tarefas.map((t) => (
          <li key={t.tarefa} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${COR[t.estado]}`} aria-hidden />
              <code className="text-xs">{t.tarefa}</code>
              <span className="text-xs text-muted-foreground">{ROTULO[t.estado]}</span>
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t.estado === 'falhando' && t.ultima ? `${t.ultima.status ? `HTTP ${t.ultima.status}` : 'exceção'} · ` : ''}
              {t.ultimaOk ? `última boa ${quando(t.ultimaOk.criadoEm)}` : 'nenhuma rodada boa'} · prazo {t.prazoHoras} h
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
