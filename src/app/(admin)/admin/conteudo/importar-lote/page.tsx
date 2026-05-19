'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, Check, AlertTriangle, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type ProvaInput = {
  banca: string
  ano: string
  orgao: string
  text: string
}

type ResultRow = {
  index: number
  banca?: string
  ano?: number
  orgao?: string
  extracted?: number
  saved?: number
  error?: string
}

export default function ImportarLotePage() {
  const [provas, setProvas] = useState<ProvaInput[]>([
    { banca: 'cebraspe', ano: '', orgao: '', text: '' },
  ])
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)

  function addProva() {
    if (provas.length >= 20) {
      toast.error('Máximo 20 por lote')
      return
    }
    setProvas([...provas, { banca: 'cebraspe', ano: '', orgao: '', text: '' }])
  }

  function removeProva(i: number) {
    setProvas(provas.filter((_, idx) => idx !== i))
  }

  function updateProva(i: number, field: keyof ProvaInput, value: string) {
    setProvas(provas.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  async function preview() {
    const validas = provas.filter((p) => p.text.length >= 200)
    if (validas.length === 0) return toast.error('Adicione pelo menos 1 prova com texto')
    setPreviewing(true)
    setResults(null)
    try {
      const { data } = await api.post('/admin/content/import-bulk', {
        provas: validas.map((p) => ({
          text: p.text,
          banca: p.banca || undefined,
          ano: p.ano ? parseInt(p.ano, 10) : undefined,
          orgao: p.orgao || undefined,
        })),
        dryRun: true,
      })
      setResults(data.results)
      toast.success(`${data.totalExtracted} questões extraídas de ${data.totalProvas} provas — revisar antes de salvar`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setPreviewing(false)
    }
  }

  async function save() {
    const validas = provas.filter((p) => p.text.length >= 200)
    if (validas.length === 0) return
    setSaving(true)
    try {
      const { data } = await api.post('/admin/content/import-bulk', {
        provas: validas.map((p) => ({
          text: p.text,
          banca: p.banca || undefined,
          ano: p.ano ? parseInt(p.ano, 10) : undefined,
          orgao: p.orgao || undefined,
        })),
        dryRun: false,
      })
      toast.success(`${data.totalSaved} questões salvas (${data.erros} erros)`)
      setResults(data.results)
      setProvas([{ banca: 'cebraspe', ano: '', orgao: '', text: '' }])
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const totalValid = provas.filter((p) => p.text.length >= 200).length

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <Link href="/admin/conteudo/importar" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar pra importação simples
      </Link>

      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-500" /> Importar provas em LOTE
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cola até 20 provas oficiais ao mesmo tempo. IA extrai e organiza tudo por matéria.
        </p>
      </div>

      <div className="card p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Dica:</strong> use provas dos últimos 5 anos do mesmo curso pra ter base sólida.
          Ex: PF 2024, 2018, 2014, 2013, 2012. Pode levar 5-10min pra processar tudo.
        </div>
      </div>

      <div className="space-y-3">
        {provas.map((p, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">Prova {i + 1}</h2>
              {provas.length > 1 && (
                <button onClick={() => removeProva(i)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input placeholder="Banca (cebraspe, fgv, fcc...)" value={p.banca}
                onChange={(e) => updateProva(i, 'banca', e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
              <input placeholder="Ano (2024)" type="number" value={p.ano}
                onChange={(e) => updateProva(i, 'ano', e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
              <input placeholder="Órgão (PF, PMDF...)" value={p.orgao}
                onChange={(e) => updateProva(i, 'orgao', e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
            </div>
            <textarea value={p.text} onChange={(e) => updateProva(i, 'text', e.target.value)}
              rows={6}
              placeholder="Cole aqui o texto completo da prova..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono" />
            <div className="text-[10px] text-muted-foreground text-right">
              {p.text.length} caracteres {p.text.length < 200 && <span className="text-red-500">(mín 200)</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={addProva} disabled={provas.length >= 20}
          className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50">
          <Plus className="w-3 h-3" /> Adicionar mais uma prova
        </button>
        <div className="flex-1" />
        <button onClick={preview} disabled={previewing || totalValid === 0}
          className="rounded-xl bg-purple-500 text-white px-4 py-2 text-sm font-bold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center gap-2">
          {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extraindo {totalValid} provas…</> : <><Sparkles className="w-4 h-4" /> Preview ({totalValid})</>}
        </button>
        {results && (
          <button onClick={save} disabled={saving}
            className="rounded-xl bg-green-500 text-white px-4 py-2 text-sm font-bold hover:bg-green-600 disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Salvar tudo</>}
          </button>
        )}
      </div>

      {results && (
        <div className="card p-4 space-y-2">
          <h3 className="font-bold text-sm">Resultados</h3>
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.index}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-xs',
                  r.error ? 'bg-red-50 dark:bg-red-900/20' : r.saved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted',
                )}>
                <span className="font-bold w-12">#{r.index + 1}</span>
                <span className="flex-1">
                  {r.banca?.toUpperCase()} {r.ano} {r.orgao}
                  {r.error ? <span className="text-red-600"> · {r.error}</span> :
                   r.saved !== undefined ? <span className="text-green-600"> · ✓ {r.saved} salvas</span> :
                   r.extracted !== undefined ? <span> · {r.extracted} extraídas (preview)</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
