'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Link as LinkIcon, Loader2, Sparkles, Check, AlertTriangle, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Extracted = {
  numero?: number
  enunciado: string
  alternativas?: Array<{ letra: string; texto: string }>
  gabarito: string
  materia?: string
}

export default function ImportarUrlPage() {
  const [pdfUrl, setPdfUrl] = useState('')
  const [banca, setBanca] = useState('cebraspe')
  const [ano, setAno] = useState('')
  const [orgao, setOrgao] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracted, setExtracted] = useState<Extracted[] | null>(null)
  const [pdfSize, setPdfSize] = useState(0)

  async function preview() {
    if (!pdfUrl) return toast.error('Cola a URL do PDF da prova')
    setPreviewing(true)
    setExtracted(null)
    try {
      const { data } = await api.post('/admin/content/import-from-url', {
        pdfUrl, banca: banca || undefined,
        ano: ano ? parseInt(ano, 10) : undefined,
        orgao: orgao || undefined,
        dryRun: true,
      })
      setExtracted(data.questions)
      setPdfSize(data.pdfSizeKb)
      toast.success(`${data.extractedCount} questões extraídas do PDF de ${data.pdfSizeKb}KB`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setPreviewing(false) }
  }

  async function save() {
    if (!pdfUrl) return
    setSaving(true)
    try {
      const { data } = await api.post('/admin/content/import-from-url', {
        pdfUrl, banca: banca || undefined,
        ano: ano ? parseInt(ano, 10) : undefined,
        orgao: orgao || undefined,
      })
      toast.success(`${data.count} questões salvas!`)
      setExtracted(null); setPdfUrl('')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <Link href="/admin/conteudo/importar" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-purple-500" /> Importar prova via URL
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cola o link direto do PDF da banca → IA baixa, lê e extrai todas questões.
        </p>
      </div>

      <div className="card p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Usa Gemini Flash (grátis até 1500 PDFs/dia)</strong> com OCR built-in.
          Custo R$ 0 por prova. Funciona em PDFs digitais E escaneados.
        </div>
      </div>

      {/* Fontes públicas conhecidas */}
      <details className="card p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
        <summary className="cursor-pointer text-xs font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Onde achar links de PDFs públicos
        </summary>
        <ul className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 space-y-1.5 pl-5 list-disc">
          <li><strong>Cebraspe</strong>: <a href="https://www.cebraspe.org.br/concursos/encerrado" target="_blank" rel="noopener" className="underline inline-flex items-center gap-0.5">cebraspe.org.br/concursos/encerrado <ExternalLink className="w-3 h-3" /></a> → busca concurso → "Provas e gabaritos" → clica direito no PDF → "Copiar link"</li>
          <li><strong>FGV</strong>: <a href="https://conhecimento.fgv.br/concursos/encerrados" target="_blank" rel="noopener" className="underline">conhecimento.fgv.br/concursos/encerrados</a></li>
          <li><strong>FCC</strong>: <a href="https://www.concursosfcc.com.br" target="_blank" rel="noopener" className="underline">concursosfcc.com.br</a> → "Concursos Encerrados"</li>
          <li><strong>VUNESP</strong>: <a href="https://www.vunesp.com.br/concursos-encerrados" target="_blank" rel="noopener" className="underline">vunesp.com.br/concursos-encerrados</a></li>
        </ul>
        <p className="text-[10px] mt-2 text-yellow-700 dark:text-yellow-300 italic">
          URL deve apontar DIRETO pro PDF (terminar em .pdf ou content-type application/pdf).
        </p>
      </details>

      <div className="card p-4 space-y-4">
        <div>
          <label className="text-xs font-bold">URL do PDF da prova</label>
          <input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://www.cebraspe.org.br/.../prova.pdf"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
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
          <button onClick={preview} disabled={previewing || !pdfUrl}
            className="rounded-xl bg-purple-500 text-white px-4 py-2.5 text-sm font-bold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center gap-2">
            {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Baixando e extraindo (~2min)…</> : <><Sparkles className="w-4 h-4" /> Extrair</>}
          </button>
          {extracted && (
            <button onClick={save} disabled={saving}
              className="rounded-xl bg-green-500 text-white px-4 py-2.5 text-sm font-bold hover:bg-green-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar {extracted.length}
            </button>
          )}
        </div>
      </div>

      {extracted && (
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm">Preview das {extracted.length} questões ({pdfSize}KB)</h3>
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
