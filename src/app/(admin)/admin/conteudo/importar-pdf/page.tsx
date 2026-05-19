'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, Sparkles, Check, FileText, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Extracted = {
  numero?: number
  enunciado: string
  alternativas?: Array<{ letra: string; texto: string }>
  gabarito: string
  materia?: string
}

export default function ImportarPdfUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [banca, setBanca] = useState('cebraspe')
  const [ano, setAno] = useState('')
  const [orgao, setOrgao] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracted, setExtracted] = useState<Extracted[] | null>(null)

  async function preview() {
    if (!file) return toast.error('Selecione um PDF')
    setPreviewing(true)
    setExtracted(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (banca) formData.append('banca', banca)
      if (ano) formData.append('ano', ano)
      if (orgao) formData.append('orgao', orgao)
      formData.append('dryRun', 'true')

      const { data } = await api.post('/admin/content/import-pdf-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setExtracted(data.questions)
      toast.success(`${data.extractedCount} questões extraídas! Revise antes de salvar.`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setPreviewing(false)
    }
  }

  async function save() {
    if (!file) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (banca) formData.append('banca', banca)
      if (ano) formData.append('ano', ano)
      if (orgao) formData.append('orgao', orgao)

      const { data } = await api.post('/admin/content/import-pdf-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${data.count} questões salvas!`)
      setExtracted(null)
      setFile(null)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <Link href="/admin/conteudo/importar" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Upload className="w-6 h-6 text-purple-500" /> Upload PDF direto
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manda o PDF da prova (qualquer formato — texto extraível OU escaneado). IA lê e extrai todas as questões.
        </p>
      </div>

      <div className="card p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Usa Gemini Flash (grátis até 1500 PDFs/dia)</strong> com OCR automático.
          Funciona até pra PDFs escaneados/imagens. Custo zero por prova.
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <label className="text-xs font-bold">PDF da prova (máx 20MB)</label>
          <div className="mt-1">
            <label className="block w-full border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {file ? (
                <div>
                  <FileText className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="font-bold text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Arraste ou clica pra escolher o PDF</div>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={banca} onChange={(e) => setBanca(e.target.value)} placeholder="Banca (cebraspe)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={ano} onChange={(e) => setAno(e.target.value)} placeholder="Ano (2024)" type="number"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Órgão (PF, PMDF)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-2">
          <button onClick={preview} disabled={previewing || !file}
            className="rounded-xl bg-purple-500 text-white px-4 py-2.5 text-sm font-bold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center gap-2">
            {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extraindo (pode levar 1-2min)…</> : <><Sparkles className="w-4 h-4" /> Extrair com IA</>}
          </button>
          {extracted && (
            <button onClick={save} disabled={saving}
              className="rounded-xl bg-green-500 text-white px-4 py-2.5 text-sm font-bold hover:bg-green-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Salvar {extracted.length}</>}
            </button>
          )}
        </div>
      </div>

      {extracted && (
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm">Preview das {extracted.length} questões</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {extracted.map((q, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Q{q.numero ?? i + 1}</span>
                  <span className="font-mono">Gab: <strong>{q.gabarito || '?'}</strong></span>
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
