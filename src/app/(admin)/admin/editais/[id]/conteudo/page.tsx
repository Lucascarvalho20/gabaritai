'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Loader2, Upload, Sparkles, Check, X, FileText, AlertTriangle, BookOpen, Edit2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

type Resumo = { id: string; status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'REJECTED'; updatedAt: string }
type Topic = {
  id: string; name: string; order: number
  sourcesCount: number
  resumo: Resumo | null
  children: Topic[]
}
type Materia = { subjectId: string; name: string; slug: string; topics: Topic[] }
type Edital = { id: string; titulo: string; ano: number }

export default function EditalConteudoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [edital, setEdital] = useState<Edital | null>(null)
  const [materias, setMaterias] = useState<Materia[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/editais/${id}/topics`)
      setEdital(data.edital)
      setMaterias(data.materias)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao carregar')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <button onClick={() => router.push('/admin/editais')} className="text-xs text-muted-foreground hover:underline mb-1">← Voltar</button>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-500" /> {edital?.titulo}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revise cada tópico: anexe fontes oficiais (PDFs de leis, apostilas) e gere o resumo do tópico. Só conteúdo PUBLICADO aparece pro aluno.
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-5">
        {/* Árvore */}
        <div className="card p-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {materias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Esse edital ainda não tem matérias vinculadas. Volte em "Extrair edital" e salve.
            </p>
          ) : materias.map((m) => (
            <div key={m.subjectId}>
              <button onClick={() => setExpanded((s) => ({ ...s, [m.subjectId]: !s[m.subjectId] }))}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left">
                {expanded[m.subjectId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-bold text-sm flex-1">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.topics.length}</span>
              </button>
              {expanded[m.subjectId] && (
                <div className="ml-5 space-y-0.5 mt-0.5">
                  {m.topics.map((t) => <TopicItem key={t.id} t={t} onSelect={setSelectedTopic} selectedId={selectedTopic?.id} />)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Painel do tópico */}
        <div className="card p-5 min-h-[60vh]">
          {selectedTopic ? (
            <TopicEditor topic={selectedTopic} onChange={load} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground py-16">
              ← Selecione um tópico à esquerda pra revisar conteúdo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicItem({ t, onSelect, selectedId, depth = 0 }: {
  t: Topic; onSelect: (t: { id: string; name: string }) => void; selectedId?: string; depth?: number
}) {
  const [open, setOpen] = useState(false)
  const status = t.resumo?.status
  const statusBadge = status === 'PUBLISHED' ? '✅' : status === 'DRAFT' ? '📝' : status === 'REVIEWED' ? '👀' : status === 'REJECTED' ? '❌' : '○'
  return (
    <div>
      <div className="flex items-center gap-1 group">
        {t.children.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="p-0.5">
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        <button onClick={() => onSelect({ id: t.id, name: t.name })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1 rounded text-xs text-left',
            selectedId === t.id ? 'bg-brand-100 dark:bg-brand-900/30 font-semibold' : 'hover:bg-muted'
          )}
          style={{ marginLeft: depth * 8 }}>
          <span className="shrink-0">{statusBadge}</span>
          <span className="flex-1 truncate">{t.name}</span>
          {t.sourcesCount > 0 && <span className="text-[10px] text-muted-foreground">📎{t.sourcesCount}</span>}
        </button>
      </div>
      {open && t.children.length > 0 && (
        <div className="ml-3">
          {t.children.map((c) => <TopicItem key={c.id} t={c} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

function TopicEditor({ topic, onChange }: { topic: { id: string; name: string }; onChange: () => void }) {
  const [sources, setSources] = useState<any[]>([])
  const [resumo, setResumo] = useState<any | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [manualMode, setManualMode] = useState(false) // true = criar manual sem passar pela IA

  async function loadData() {
    setLoadingData(true)
    try {
      const [srcRes, topicsRes] = await Promise.all([
        api.get(`/admin/topics/${topic.id}/sources`),
        api.get(`/admin/topics/${topic.id}`).catch(() => ({ data: null })),
      ])
      setSources(srcRes.data.sources ?? [])
      // Busca resumo via API de materials list (simples)
      const matRes = await api.get('/admin/content/materials', { params: { topicId: topic.id, type: 'RESUMO' } }).catch(() => null)
      setResumo(matRes?.data?.materials?.[0] ?? null)
    } finally { setLoadingData(false) }
  }
  useEffect(() => { loadData() }, [topic.id])

  async function generateSummary() {
    setGenerating(true)
    try {
      const force = !!resumo
      const { data } = await api.post(`/admin/topics/${topic.id}/generate-summary`, { force })
      toast.success(`Resumo gerado (${data.rag ? 'usando ' + data.sourcesUsed.length + ' fontes' : 'best-effort'})`)
      loadData()
      onChange()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao gerar')
    } finally { setGenerating(false) }
  }

  async function review(action: 'approve' | 'reject') {
    if (!resumo) return
    try {
      await api.patch(`/admin/materials/${resumo.id}/review`, { action })
      toast.success(action === 'approve' ? 'Resumo publicado!' : 'Resumo rejeitado')
      loadData()
      onChange()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function saveEdit(publish: boolean) {
    try {
      // Modo manual sem resumo prévio: usa endpoint manual-summary
      if (manualMode || !resumo) {
        if (editContent.trim().length < 50) {
          return toast.error('Conteúdo muito curto (mín 50 caracteres)')
        }
        await api.post(`/admin/topics/${topic.id}/manual-summary`, {
          content: editContent, publish, source: 'admin redação',
        })
        toast.success(publish ? 'Resumo manual publicado!' : 'Salvo como rascunho revisado')
      } else {
        // Edição de resumo IA existente
        await api.patch(`/admin/materials/${resumo.id}/review`, { action: 'edit', content: editContent, publish })
        toast.success(publish ? 'Editado e publicado!' : 'Edição salva')
      }
      setEditing(false)
      setManualMode(false)
      loadData()
      onChange()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  if (loadingData) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg">{topic.name}</h2>
      </div>

      {/* Fontes anexadas */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Fontes anexadas ({sources.length})</h3>
        </div>
        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhuma fonte anexada ainda. Anexe PDFs de leis, apostilas ou textos abaixo.<br />
            Sem fonte: IA gera "best-effort" (qualidade variável).
          </div>
        ) : (
          <div className="space-y-1">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span className="flex-1 truncate">{s.title}</span>
                <span className="text-muted-foreground">{(s.content?.length ?? 0).toLocaleString()} chars</span>
              </div>
            ))}
          </div>
        )}
        <SourceUploader topicId={topic.id} onUploaded={loadData} />
      </section>

      {/* Resumo */}
      <section className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Resumo do tópico</h3>
          {resumo && (
            <span className={cn('badge text-xs',
              resumo.status === 'PUBLISHED' ? 'badge-green' :
              resumo.status === 'DRAFT' ? 'badge-yellow' :
              resumo.status === 'REJECTED' ? 'badge-red' : 'badge-blue')}>{resumo.status}</span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            {manualMode && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 p-3 text-xs text-blue-700 dark:text-blue-200">
                ✍️ <strong>Modo manual.</strong> Cole o resumo do NotebookLM ou escreva direto em markdown.
                Será publicado com sua autoria, sem precisar revisão extra.
              </div>
            )}
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[400px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              placeholder={manualMode
                ? "## Princípios Fundamentais\n\nConteúdo em markdown… (cole do NotebookLM ou escreva aqui)"
                : "Markdown do resumo…"} />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => saveEdit(true)} className="btn-primary btn-sm">
                <Check className="w-3 h-3" /> Salvar e publicar
              </button>
              <button onClick={() => saveEdit(false)} className="btn-outline btn-sm">
                Salvar como rascunho revisado
              </button>
              <button onClick={() => { setEditing(false); setManualMode(false) }} className="btn-ghost btn-sm">
                Cancelar
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {editContent.length} caracteres · {editContent.split(/\s+/).filter(Boolean).length} palavras
            </p>
          </div>
        ) : !resumo ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-xs text-muted-foreground">Nenhum resumo cadastrado ainda. Escolha:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={generateSummary} disabled={generating}
                className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</> : <><Sparkles className="w-4 h-4" /> Gerar via IA</>}
              </button>
              <button onClick={() => { setEditContent(''); setEditing(true); setManualMode(true) }}
                className="rounded-xl border border-border bg-card hover:bg-muted px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Escrever manual / Colar do NotebookLM
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Resumo via IA fica em DRAFT esperando sua revisão. Manual já vai publicado direto.
            </p>
          </div>
        ) : (
          <>
            {resumo.status === 'DRAFT' && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 p-3 text-xs text-yellow-700 dark:text-yellow-200 flex gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Rascunho gerado por IA.</strong> Leia, edite se precisar, e aprove pra ficar visível ao aluno.
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="prose prose-sm dark:prose-invert max-w-none border border-border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <ReactMarkdown>{resumo.content ?? ''}</ReactMarkdown>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumo.status !== 'PUBLISHED' && (
                  <button onClick={() => review('approve')}
                    className="rounded-lg bg-green-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Aprovar e publicar
                  </button>
                )}
                <button onClick={() => { setEditContent(resumo.content ?? ''); setEditing(true); setManualMode(false) }}
                  className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => { setEditContent(''); setEditing(true); setManualMode(true) }}
                  className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1"
                  title="Substituir por resumo manual (NotebookLM ou redação própria)">
                  ✍️ Escrever do zero
                </button>
                <button onClick={() => review('reject')}
                  className="rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
                  <X className="w-3 h-3" /> Rejeitar
                </button>
                <button onClick={generateSummary} disabled={generating}
                  className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regerar via IA
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function SourceUploader({ topicId, onUploaded }: { topicId: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf')
  const [uploading, setUploading] = useState(false)

  async function send() {
    if (mode === 'pdf' && !file) return toast.error('Anexe um PDF')
    if (mode === 'text' && !text.trim()) return toast.error('Cole o texto')
    setUploading(true)
    try {
      let res
      if (mode === 'pdf') {
        const form = new FormData()
        form.append('pdf', file!)
        if (title) form.append('title', title)
        if (sourceRef) form.append('source', sourceRef)
        res = await api.post(`/admin/topics/${topicId}/sources`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        res = await api.post(`/admin/topics/${topicId}/sources`, {
          text, title: title || undefined, source: sourceRef || undefined,
        })
      }
      toast.success('Fonte anexada')
      setFile(null); setText(''); setTitle(''); setSourceRef('')
      onUploaded()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setUploading(false) }
  }

  return (
    <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
      <div className="flex gap-1">
        <button onClick={() => setMode('pdf')}
          className={cn('text-xs px-2 py-1 rounded', mode === 'pdf' ? 'bg-brand-500 text-white' : 'bg-muted')}>PDF</button>
        <button onClick={() => setMode('text')}
          className={cn('text-xs px-2 py-1 rounded', mode === 'text' ? 'bg-brand-500 text-white' : 'bg-muted')}>Texto</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
        <input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)}
          placeholder="Fonte (ex: planalto.gov.br/CF88)"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
      </div>
      {mode === 'pdf' ? (
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs w-full" />
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Cole o texto da fonte (lei, súmula, trecho de doutrina…)"
          className="w-full min-h-[120px] rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
      )}
      <button onClick={send} disabled={uploading}
        className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
        {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</> : <><Upload className="w-3 h-3" /> Anexar fonte</>}
      </button>
    </div>
  )
}
