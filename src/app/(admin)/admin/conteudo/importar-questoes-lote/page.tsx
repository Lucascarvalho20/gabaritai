'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText, X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Result = {
  key: string
  ok: boolean
  ano?: number; banca?: string; orgao?: string; cargo?: string
  questoesExtraidas?: number
  persistidas?: number
  semGabarito?: number
  amostra?: any[]
  motivo?: string
}

const FONTES = [
  { label: 'PCI Concursos — provas em PDF', url: 'https://www.pciconcursos.com.br/provas/' },
  { label: 'Cebraspe — concursos anteriores', url: 'https://www.cebraspe.org.br/concursos/encerrados' },
  { label: 'Polícia Federal — provas históricas', url: 'https://www.gov.br/pf/pt-br/acesso-a-informacao/concursos' },
  { label: 'FGV — concursos', url: 'https://conhecimento.fgv.br/concursos' },
  { label: 'FCC — concursos encerrados', url: 'https://www.concursosfcc.com.br' },
  { label: 'VUNESP — concursos encerrados', url: 'https://www.vunesp.com.br/concursos-encerrados' },
  { label: 'AOCP — concursos', url: 'https://www.institutoaocp.org.br' },
]

export default function ImportarQuestoesLotePage() {
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [meta, setMeta] = useState({ arquivos: 0, grupos: 0, persistidas: 0, naoReconhecidos: [] as string[] })

  function handleFiles(list: FileList | null) {
    if (!list) return
    const arr = Array.from(list).filter((f) => f.type === 'application/pdf')
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]))
      for (const f of arr) map.set(f.name, f)
      return Array.from(map.values())
    })
  }

  function removeFile(name: string) {
    setFiles(files.filter((f) => f.name !== name))
  }

  async function submit() {
    if (files.length === 0) return toast.error('Anexe pelo menos um PDF')
    setSubmitting(true)
    setResults(null)
    const form = new FormData()
    for (const f of files) form.append('files', f)
    form.append('dryRun', dryRun ? 'true' : 'false')
    try {
      const { data } = await api.post('/admin/content/import-questions-bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResults(data.resultados)
      setMeta({
        arquivos: data.arquivosRecebidos,
        grupos: data.gruposProcessados,
        persistidas: data.totalQuestoesPersistidas,
        naoReconhecidos: data.naoReconhecidos,
      })
      toast.success(dryRun
        ? `Preview: ${data.gruposProcessados} provas analisadas`
        : `${data.totalQuestoesPersistidas} questões importadas`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-500" /> Importar questões em lote
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Suba múltiplos PDFs de provas + gabaritos de uma vez. IA extrai questões, agrupa por matéria e cruza com o gabarito.
        </p>
      </div>

      {/* Instruções */}
      <div className="card p-5 space-y-3 border-l-4 border-l-brand-500">
        <h2 className="font-bold text-sm">📋 Como nomear os arquivos (importante!)</h2>
        <p className="text-xs text-muted-foreground">
          O sistema lê o nome do arquivo pra saber ano, banca, órgão e cargo. Use o padrão:
        </p>
        <code className="block bg-muted px-3 py-2 rounded-lg text-xs font-mono">
          {'{ANO}_{BANCA}_{ORGAO}_{CARGO}_{caderno|gabarito}.pdf'}
        </code>
        <div className="text-xs space-y-1">
          <div>✅ <code className="text-green-600">2025_CEBRASPE_PF_AGENTE_caderno.pdf</code></div>
          <div>✅ <code className="text-green-600">2025_CEBRASPE_PF_AGENTE_gabarito.pdf</code></div>
          <div>✅ <code className="text-green-600">2022_AOCP_PMGO_SOLDADO_caderno.pdf</code></div>
          <div>❌ <code className="text-red-500">prova-pf-2025.pdf</code> (formato desconhecido)</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pra cada concurso, suba <strong>caderno + gabarito</strong> com o mesmo prefixo. Sistema cruza automaticamente.
        </p>
      </div>

      {/* Fontes pra baixar */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">🔗 De onde baixar provas oficiais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONTES.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer"
              className="text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted inline-flex items-center gap-2 justify-between">
              <span>{f.label}</span>
              <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold">Anexar PDFs ({files.length})</h2>
        <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted cursor-pointer transition">
          <input type="file" accept="application/pdf" multiple className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm font-semibold">Clique pra escolher ou arrasta aqui</div>
          <div className="text-xs text-muted-foreground mt-1">Pode selecionar vários PDFs de uma vez</div>
        </label>

        {files.length > 0 && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs rounded-lg bg-muted/50 px-3 py-1.5">
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-muted-foreground mx-2">{Math.round(f.size / 1024)} KB</span>
                <button onClick={() => removeFile(f.name)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <span>Preview (não persistir ainda)</span>
          </label>
          <button onClick={submit} disabled={submitting || files.length === 0}
            className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando…</> : <><Upload className="w-4 h-4" /> {dryRun ? 'Analisar' : 'Importar'}</>}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          ⚠️ Pode levar 30-90s por PDF. Não feche a aba.
        </p>
      </div>

      {/* Resultados */}
      {results && (
        <div className="card p-5 space-y-3">
          <h2 className="font-bold">Resultados</h2>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="badge badge-blue">📄 {meta.arquivos} arquivos</div>
            <div className="badge badge-green">🎯 {meta.grupos} provas detectadas</div>
            {meta.persistidas > 0 && <div className="badge badge-green">✅ {meta.persistidas} questões persistidas</div>}
            {meta.naoReconhecidos.length > 0 && (
              <div className="badge badge-red">⚠️ {meta.naoReconhecidos.length} arquivos não reconhecidos</div>
            )}
          </div>

          {meta.naoReconhecidos.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-xs">
              <strong>Não reconhecidos</strong> (nome fora do padrão):
              <ul className="list-disc list-inside mt-1">
                {meta.naoReconhecidos.map((n) => <li key={n} className="font-mono">{n}</li>)}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.key} className={`rounded-lg border p-3 ${r.ok ? 'border-border bg-card' : 'border-red-300 bg-red-50/40 dark:bg-red-900/10'}`}>
                <button onClick={() => setExpanded((s) => ({ ...s, [r.key]: !s[r.key] }))}
                  className="w-full flex items-center gap-2 text-left">
                  {expanded[r.key] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span className="font-semibold text-sm">{r.key}</span>
                  {r.questoesExtraidas !== undefined && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {r.questoesExtraidas} questões {r.semGabarito ? `(${r.semGabarito} sem gabarito)` : ''}
                    </span>
                  )}
                </button>
                {!r.ok && <p className="text-xs text-red-600 mt-1">{r.motivo}</p>}
                {expanded[r.key] && r.amostra && (
                  <div className="mt-3 text-xs space-y-2 max-h-64 overflow-y-auto">
                    {r.amostra.map((q: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-muted/30">
                        <div className="font-semibold">#{q.numero} — {q.materia}</div>
                        <div className="text-muted-foreground line-clamp-3 mt-1">{q.enunciado}</div>
                        {q.gabarito && <div className="text-green-600 mt-1">Gabarito: {q.gabarito}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {dryRun && results.some((r) => r.ok) && (
            <div className="pt-2 border-t border-border">
              <button onClick={() => { setDryRun(false); submit() }} disabled={submitting}
                className="rounded-xl bg-green-500 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
                ✅ Confirmar e persistir tudo no banco
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href="/admin/conteudo" className="text-xs text-muted-foreground hover:underline">← Voltar pra conteúdo</Link>
      </div>
    </div>
  )
}
