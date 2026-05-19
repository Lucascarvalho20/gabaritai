'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Upload, ArrowLeft, Loader2, Sparkles, Check, CheckCircle2, AlertTriangle, FileText, Bot, Hash } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Extracted = {
  numero?: number
  enunciado: string
  alternativas?: Array<{ letra: string; texto: string }>
  gabarito: string
  materia?: string
}

type Stats = {
  totals: { OFFICIAL: number; AI_GENERATED: number; ADAPTED: number }
  byBanca: Array<{ bancaSlug: string; source: string; count: number }>
  bySubject: Array<{ subjectId: string; subjectName: string; subjectSlug: string; source: string; count: number }>
  byYearBanca: Array<{ ano: number; bancaSlug: string; count: number }>
}

export default function ImportarProvaPage() {
  const [text, setText] = useState('')
  const [meta, setMeta] = useState({ banca: 'cebraspe', ano: '', orgao: '' })
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracted, setExtracted] = useState<Extracted[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  async function loadStats() {
    try {
      const { data } = await api.get('/admin/content/questions-stats')
      setStats(data)
    } catch {}
  }
  useEffect(() => { loadStats() }, [])

  async function preview() {
    if (text.length < 200) return toast.error('Cole o texto completo (mín 200 caracteres)')
    setPreviewing(true)
    setExtracted(null)
    try {
      const { data } = await api.post('/admin/content/import-pdf', {
        text, ...meta, ano: meta.ano ? parseInt(meta.ano, 10) : undefined, dryRun: true,
      })
      setExtracted(data.questions)
      toast.success(`${data.extractedCount} questões extraídas — revise e confirme`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro na extração')
    } finally {
      setPreviewing(false)
    }
  }

  async function save() {
    if (!extracted?.length) return
    setSaving(true)
    try {
      const { data } = await api.post('/admin/content/import-pdf', {
        text, ...meta, ano: meta.ano ? parseInt(meta.ano, 10) : undefined, dryRun: false,
      })
      toast.success(`${data.count} questões salvas no banco!`)
      setExtracted(null)
      setText('')
      loadStats()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <Link href="/admin/conteudo" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Upload className="w-6 h-6 text-purple-500" /> Importar prova oficial
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cole o texto da prova (de PDF ou site da banca) → IA extrai todas as questões → você revisa → salvar.
        </p>
      </div>

      <div className="card p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Como pegar o texto do PDF:</strong> abre o PDF → ⌘A (selecionar tudo) → ⌘C (copiar) → cola abaixo. Pra PDFs escaneados, use OCR (Google Drive ou cmd+shift+4 + reconhecer texto no Mac).
        </span>
      </div>

      {/* Inventário do banco */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={FileText} label="Oficiais" value={stats.totals.OFFICIAL} color="text-green-600 dark:text-green-400" sub="Importadas por você" />
          <StatCard icon={Bot} label="Geradas por IA" value={stats.totals.AI_GENERATED} color="text-purple-600 dark:text-purple-400" sub="Sob demanda" />
          <StatCard icon={Hash} label="Total ativo" value={stats.totals.OFFICIAL + stats.totals.AI_GENERATED + stats.totals.ADAPTED} color="text-brand-600 dark:text-brand-400" sub="Disponível pra simulados" />
        </div>
      )}

      {stats && stats.bySubject.length > 0 && (
        <details className="card p-3">
          <summary className="cursor-pointer text-xs font-bold">📊 Por matéria (clique pra expandir)</summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-1.5 text-xs">
            {Object.entries(
              stats.bySubject.reduce<Record<string, { name: string; OFFICIAL: number; AI_GENERATED: number }>>((acc, s) => {
                const k = s.subjectName
                if (!acc[k]) acc[k] = { name: k, OFFICIAL: 0, AI_GENERATED: 0 }
                if (s.source === 'OFFICIAL') acc[k].OFFICIAL += s.count
                if (s.source === 'AI_GENERATED') acc[k].AI_GENERATED += s.count
                return acc
              }, {})
            ).sort((a, b) => (b[1].OFFICIAL + b[1].AI_GENERATED) - (a[1].OFFICIAL + a[1].AI_GENERATED)).map(([k, v]) => (
              <div key={k} className="flex justify-between p-2 rounded border border-border">
                <span className="truncate">{v.name}</span>
                <span className="font-mono text-[10px]">
                  <span className="text-green-600">{v.OFFICIAL}of</span> · <span className="text-purple-600">{v.AI_GENERATED}ia</span>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          placeholder="Banca (slug, ex: cebraspe)"
          value={meta.banca}
          onChange={(e) => setMeta((p) => ({ ...p, banca: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Ano"
          type="number"
          value={meta.ano}
          onChange={(e) => setMeta((p) => ({ ...p, ano: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Órgão (PF, PMDF, etc)"
          value={meta.orgao}
          onChange={(e) => setMeta((p) => ({ ...p, orgao: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold">Texto da prova (cola aqui)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder="Cole aqui o conteúdo completo da prova (questões + gabarito se tiver)..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
        />
        <div className="text-[10px] text-muted-foreground mt-1 text-right">{text.length} caracteres</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={preview}
          disabled={previewing || text.length < 200}
          className="rounded-xl bg-purple-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extraindo…</> : <><Sparkles className="w-4 h-4" /> 1. Extrair com IA</>}
        </button>
        {extracted && (
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-green-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-600 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> 2. Salvar {extracted.length} no banco</>}
          </button>
        )}
      </div>

      {extracted && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <strong>{extracted.length} questões extraídas</strong> — revise antes de salvar
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {extracted.map((q, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Q{q.numero ?? i + 1}</span>
                  <span className="font-mono text-muted-foreground">Gab: <strong>{q.gabarito || '?'}</strong></span>
                </div>
                <p className="line-clamp-2">{q.enunciado}</p>
                {q.materia && <div className="text-[10px] text-muted-foreground mt-1">→ {q.materia}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: number; color: string; sub: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-xs">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-black mt-0.5 ${color}`}>{value.toLocaleString('pt-BR')}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  )
}
