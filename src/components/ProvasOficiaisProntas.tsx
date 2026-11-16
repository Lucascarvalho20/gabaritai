'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Download } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Cartão do admin: as provas oficiais já extraídas e revisadas no repositório
 * (data/provas/) e o botão que as coloca no banco. Importa uma por vez, em
 * sequência, mostrando o andamento; pode clicar de novo sem duplicar nada.
 */

type Prova = { slug: string; titulo: string; curso: string; ano: number; itens: number; importada: boolean; itensNoBanco: number }

export function ProvasOficiaisProntas() {
  const [provas, setProvas] = useState<Prova[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [rodando, setRodando] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  const carregar = () =>
    api.get('/admin/provas/importar')
      .then((r) => setProvas(r.data.provas))
      .catch((e) => setErro(e.response?.data?.message ?? 'Não foi possível listar as provas prontas.'))

  useEffect(() => { carregar() }, [])

  async function importarTodas() {
    if (!provas) return
    setLog([])
    for (const p of provas) {
      setRodando(p.slug)
      try {
        const { data } = await api.post('/admin/provas/importar', { slug: p.slug })
        setLog((l) => [...l, `✓ ${p.titulo}: ${data.itens} itens (${data.anulados} anulados)${data.materiasCriadas?.length ? ` · matérias novas: ${data.materiasCriadas.join(', ')}` : ''}`])
      } catch (e: any) {
        setLog((l) => [...l, `✗ ${p.titulo}: ${e.response?.data?.message ?? 'erro'}`])
        break
      }
    }
    setRodando(null)
    carregar()
  }

  if (erro) return <div className="card p-5 text-sm text-danger-600">{erro}</div>
  if (!provas) return <div className="card p-5 h-28 animate-pulse" aria-label="Carregando provas prontas" />

  const faltam = provas.filter((p) => !p.importada || p.itensNoBanco !== p.itens).length
  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm">Provas oficiais prontas ({provas.length})</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Extraídas dos PDFs oficiais (caderno + gabarito definitivo) e revisadas. {faltam ? `${faltam} ainda não estão no banco.` : 'Todas já estão no banco.'}
          </p>
        </div>
        <button type="button" onClick={importarTodas} disabled={!!rodando} className="btn-primary btn-sm">
          {rodando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {rodando ? 'Importando…' : faltam ? 'Importar todas' : 'Reimportar todas'}
        </button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {provas.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              {p.titulo} <span className="text-xs text-muted-foreground">· {p.curso} · {p.itens} itens</span>
            </span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              {rodando === p.slug ? <><Loader2 className="w-3 h-3 animate-spin" /> importando</>
                : p.importada && p.itensNoBanco === p.itens ? <><Check className="w-3 h-3 text-success-600" /> no banco</>
                : 'não importada'}
            </span>
          </li>
        ))}
      </ul>
      {log.length > 0 && (
        <pre className="text-xs bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">{log.join('\n')}</pre>
      )}
    </div>
  )
}
