'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Plus, Trash2, ChevronRight, ChevronDown, Save, AlertTriangle, Check, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Subtopico = { nome: string; ordem?: number; subtopicos?: Subtopico[] }
type Topico = { nome: string; ordem?: number; subtopicos?: Subtopico[] }
type Materia = {
  nome: string
  ordem?: number
  subjectId?: string // match com matéria global existente
  topicos: Topico[]
}

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }
type KnownSubject = { id: string; name: string; slug: string }

type ExtractResponse = {
  ok: true
  courseId: string | null
  ano: number | null
  banca: string | null
  pdfHash: string
  pdfSizeKb: number
  extracted: Materia[]
  stats: { materias: number; topicos: number }
  knownSubjects: KnownSubject[]
}

export default function ExtrairEditalPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [knownSubjects, setKnownSubjects] = useState<KnownSubject[]>([])

  const [courseId, setCourseId] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [banca, setBanca] = useState('')
  const [titulo, setTitulo] = useState('')
  const [numero, setNumero] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<Materia[] | null>(null)
  const [pdfHash, setPdfHash] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/courses').then(({ data }) => {
      const flat: Course[] = []
      for (const g of data.groups ?? []) flat.push(...g.cargos)
      setCourses(flat)
    }).catch(() => {})
  }, [])

  async function handleExtract() {
    if (!file) return toast.error('Anexe o PDF do edital')
    if (!courseId) return toast.error('Selecione o curso')
    setExtracting(true)
    try {
      const form = new FormData()
      form.append('pdf', file)
      form.append('courseId', courseId)
      form.append('ano', String(ano))
      if (banca) form.append('banca', banca)
      const { data } = await api.post<ExtractResponse>('/admin/editais/extract-structure', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setExtracted(data.extracted)
      setKnownSubjects(data.knownSubjects)
      setPdfHash(data.pdfHash)
      // Auto-match: pra cada matéria extraída, tenta match por nome com matéria global
      const auto = data.extracted.map((m) => {
        const found = data.knownSubjects.find((s) => s.name.toLowerCase() === m.nome.toLowerCase())
        return { ...m, subjectId: found?.id }
      })
      setExtracted(auto)
      if (!titulo) {
        const course = courses.find((c) => c.id === courseId)
        setTitulo(`${course?.name ?? 'Edital'} — ${ano}`)
      }
      toast.success(`Extraído: ${data.stats.materias} matérias, ${data.stats.topicos} tópicos`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro na extração')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave() {
    if (!extracted) return
    if (!titulo) return toast.error('Informe o título do edital')
    setSaving(true)
    try {
      const { data } = await api.post('/admin/editais/save-structure', {
        courseId, ano, banca: banca || undefined, numero: numero || undefined,
        titulo, pdfHash, materias: extracted,
      })
      toast.success(`Salvo! ${data.materiasSalvas} matérias, ${data.topicosSalvos} tópicos`)
      router.push('/admin/editais')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  // Edits sobre a árvore
  function updateMateria(idx: number, patch: Partial<Materia>) {
    if (!extracted) return
    const copy = [...extracted]
    copy[idx] = { ...copy[idx], ...patch }
    setExtracted(copy)
  }
  function removeMateria(idx: number) {
    if (!extracted) return
    setExtracted(extracted.filter((_, i) => i !== idx))
  }
  function addMateria() {
    setExtracted([...(extracted ?? []), { nome: 'Nova matéria', topicos: [] }])
  }

  function updateTopico(mi: number, ti: number, patch: Partial<Topico>) {
    if (!extracted) return
    const copy = [...extracted]
    copy[mi].topicos[ti] = { ...copy[mi].topicos[ti], ...patch }
    setExtracted(copy)
  }
  function removeTopico(mi: number, ti: number) {
    if (!extracted) return
    const copy = [...extracted]
    copy[mi].topicos = copy[mi].topicos.filter((_, i) => i !== ti)
    setExtracted(copy)
  }
  function addTopico(mi: number) {
    if (!extracted) return
    const copy = [...extracted]
    copy[mi].topicos.push({ nome: 'Novo tópico' })
    setExtracted(copy)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Extrair edital
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sobe o PDF do edital oficial. IA extrai a estrutura (matérias + tópicos) <strong>exatamente como está no edital</strong>. Você revisa e salva.
        </p>
      </div>

      {/* Passo 1: Form de upload */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold">1) Dados do edital</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold">Curso *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">— escolha —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold">Ano *</label>
            <input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold">Banca</label>
            <input value={banca} onChange={(e) => setBanca(e.target.value)} placeholder="cebraspe, fgv, fcc..."
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold">Número (opcional)</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="001/2026"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">PDF do edital *</label>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-border file:bg-card file:text-sm" />
          {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {Math.round(file.size / 1024)} KB</p>}
        </div>

        <button onClick={handleExtract} disabled={extracting || !file || !courseId}
          className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
          {extracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Extraindo ({Math.round((file?.size ?? 0) / 1024)} KB)…</> : <><Upload className="w-4 h-4" /> Extrair estrutura</>}
        </button>
        <p className="text-[10px] text-muted-foreground">Pode levar 30-90s pra PDFs grandes. IA é instruída a NÃO inventar tópicos.</p>
      </div>

      {/* Passo 2: Revisar árvore */}
      {extracted && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">2) Revisar estrutura ({extracted.length} matérias)</h2>
            <button onClick={addMateria} className="text-xs rounded-lg border border-border px-2 py-1 inline-flex items-center gap-1 hover:bg-muted">
              <Plus className="w-3 h-3" /> Matéria
            </button>
          </div>

          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 text-xs text-yellow-700 dark:text-yellow-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Revise antes de salvar. Confira: nomes batem com o edital? Sobrou lixo (cabeçalho, tabela de vagas)?
              Faltou matéria? Edite aqui mesmo. <strong>Você é a última palavra</strong> — IA pode ter errado.
            </div>
          </div>

          <div className="space-y-3">
            {extracted.map((m, mi) => (
              <MateriaCard
                key={mi}
                materia={m}
                knownSubjects={knownSubjects}
                onUpdate={(patch) => updateMateria(mi, patch)}
                onRemove={() => removeMateria(mi)}
                onUpdateTopico={(ti, patch) => updateTopico(mi, ti, patch)}
                onRemoveTopico={(ti) => removeTopico(mi, ti)}
                onAddTopico={() => addTopico(mi)}
              />
            ))}
          </div>

          {/* Passo 3: Título + Salvar */}
          <div className="border-t border-border pt-4 space-y-3">
            <h2 className="font-bold">3) Salvar</h2>
            <div>
              <label className="text-xs font-bold">Título do edital *</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="ex: PF Agente — 2026"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <button onClick={handleSave} disabled={saving || !titulo}
              className="rounded-xl bg-green-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4" /> Salvar edital + estrutura</>}
            </button>
            <p className="text-[10px] text-muted-foreground">
              Vai criar: o Edital, matérias que não existem ainda, e todos os tópicos. Editais antigos do mesmo curso ficam inativos.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function MateriaCard({
  materia, knownSubjects, onUpdate, onRemove, onUpdateTopico, onRemoveTopico, onAddTopico,
}: {
  materia: Materia
  knownSubjects: KnownSubject[]
  onUpdate: (patch: Partial<Materia>) => void
  onRemove: () => void
  onUpdateTopico: (ti: number, patch: Partial<Topico>) => void
  onRemoveTopico: (ti: number) => void
  onAddTopico: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const matched = knownSubjects.find((s) => s.id === materia.subjectId)
  return (
    <div className="rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 p-3">
        <button onClick={() => setExpanded((v) => !v)} className="p-0.5 hover:bg-muted rounded">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input value={materia.nome} onChange={(e) => onUpdate({ nome: e.target.value })}
          className="flex-1 bg-transparent font-bold text-sm border-none outline-none" />
        <select value={materia.subjectId ?? ''} onChange={(e) => onUpdate({ subjectId: e.target.value || undefined })}
          className="text-xs rounded-md border border-border bg-background px-2 py-1 max-w-[200px]">
          <option value="">⚡ Criar nova</option>
          {knownSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {matched && <Check className="w-4 h-4 text-green-500" />}
        <span className="text-xs text-muted-foreground">{materia.topicos.length} tópicos</span>
        <button onClick={onRemove} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-1 border-t border-border pt-2">
          {materia.topicos.map((t, ti) => (
            <div key={ti} className="flex items-center gap-1.5 group">
              <span className="text-muted-foreground text-xs w-6 text-right">{ti + 1}.</span>
              <input value={t.nome} onChange={(e) => onUpdateTopico(ti, { nome: e.target.value })}
                className="flex-1 bg-transparent text-sm border-b border-transparent hover:border-border focus:border-brand-500 outline-none py-0.5" />
              {Array.isArray(t.subtopicos) && t.subtopicos.length > 0 && (
                <span className="text-[10px] text-muted-foreground">+{t.subtopicos.length} sub</span>
              )}
              <button onClick={() => onRemoveTopico(ti)} className="text-red-500 opacity-0 group-hover:opacity-100 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={onAddTopico} className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1 mt-1">
            <Plus className="w-3 h-3" /> Adicionar tópico
          </button>
        </div>
      )}
    </div>
  )
}
