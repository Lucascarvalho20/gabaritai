'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Upload, Sparkles, Check, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }
type Edital = { id: string; titulo: string; ano: number; courseId: string; banca?: { slug: string } | null }
type Banca = { id: string; slug: string; name: string }
type Subject = { id: string; name: string; slug: string }
type Questao = {
  numero: number
  enunciado: string
  alternativas: Array<{ letra: string; texto: string }>
  gabarito: string | null
  anulada: boolean
  subjectId?: string | null
  explicacao?: string
}

export default function AdminProvasUploadPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [editais, setEditais] = useState<Edital[]>([])
  const [bancas, setBancas] = useState<Banca[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [provaFile, setProvaFile] = useState<File | null>(null)
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null)

  const [courseId, setCourseId] = useState('')
  const [editalId, setEditalId] = useState('')
  const [bancaSlug, setBancaSlug] = useState('')
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [titulo, setTitulo] = useState('')
  const [etapa, setEtapa] = useState('')
  const [cargo, setCargo] = useState('')
  const [examFormat, setExamFormat] = useState<'CE' | 'ME_5' | 'ME_4' | 'MISTA'>('CE')

  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [stats, setStats] = useState<{ total: number; comGabarito: number; anuladas: number; semGabarito: number } | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([
      api.get('/courses?all=true').then((r) => r.data.courses ?? []),
      api.get('/admin/editais').then((r) => r.data.editais ?? []),
      api.get('/admin/bancas').then((r) => r.data.bancas ?? []).catch(() => []),
      api.get('/admin/subjects').then((r) => r.data.subjects ?? []).catch(() => []),
    ]).then(([c, e, b, s]) => {
      setCourses(c)
      setEditais(e)
      setBancas(b)
      setSubjects(s)
    }).catch(() => toast.error('Erro ao carregar metadados'))
  }, [])

  const editaisDoCurso = editais.filter((e) => !courseId || e.courseId === courseId)

  async function handleExtract() {
    if (!provaFile) return toast.error('Anexe o PDF da prova')
    setExtracting(true)
    try {
      const form = new FormData()
      form.append('prova', provaFile)
      if (gabaritoFile) form.append('gabarito', gabaritoFile)
      form.append('examFormat', examFormat)
      const { data } = await api.post('/admin/provas/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setQuestoes(data.questoes)
      setStats(data.stats)
      toast.success(`${data.stats.total} questões extraídas — ${data.stats.comGabarito} com gabarito`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro na extração')
    } finally {
      setExtracting(false)
    }
  }

  function updateQuestao(idx: number, patch: Partial<Questao>) {
    setQuestoes((prev) => {
      const c = [...prev]
      c[idx] = { ...c[idx], ...patch }
      return c
    })
  }

  function toggleExpand(idx: number) {
    setExpanded((prev) => {
      const c = new Set(prev)
      if (c.has(idx)) c.delete(idx)
      else c.add(idx)
      return c
    })
  }

  async function handleSave() {
    if (questoes.length === 0) return toast.error('Extraia a prova primeiro')
    if (!titulo.trim()) return toast.error('Informe o título')
    if (!ano) return toast.error('Informe o ano')

    setSaving(true)
    try {
      const { data } = await api.post('/admin/provas/save', {
        courseId: courseId || null,
        editalId: editalId || null,
        bancaSlug: bancaSlug || null,
        ano,
        titulo,
        etapa: etapa || null,
        cargo: cargo || null,
        questoes: questoes.map((q) => ({
          numero: q.numero,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          gabarito: q.gabarito,
          anulada: q.anulada,
          subjectId: q.subjectId,
          explicacao: q.explicacao,
        })),
      })
      toast.success(`✅ Prova salva — ${data.questoesSalvas} questões`)
      // Reset
      setQuestoes([])
      setStats(null)
      setProvaFile(null)
      setGabaritoFile(null)
      setTitulo('')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Importar prova oficial
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sobe o PDF da prova + (opcional) o PDF do gabarito separado. A IA extrai todas as questões e
          cruza com o gabarito quando disponível.
        </p>
      </div>

      {/* ── Metadados ───────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">1) Metadados da prova</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <Select label="Curso" value={courseId} onChange={setCourseId}
            options={[{ value: '', label: '— selecione —' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Edital (opcional)" value={editalId} onChange={setEditalId}
            options={[{ value: '', label: '— sem edital —' }, ...editaisDoCurso.map((e) => ({ value: e.id, label: `${e.titulo} (${e.ano})` }))]} />
          <Select label="Banca" value={bancaSlug} onChange={setBancaSlug}
            options={[{ value: '', label: '— selecione —' }, ...bancas.map((b) => ({ value: b.slug, label: b.name }))]} />
          <InputBox label="Ano" type="number" value={String(ano)} onChange={(v) => setAno(Number(v) || new Date().getFullYear())} />
          <InputBox label="Título" value={titulo} onChange={setTitulo} placeholder="Ex: PF Agente 2024" />
          <InputBox label="Cargo" value={cargo} onChange={setCargo} placeholder="Ex: Agente" />
          <InputBox label="Etapa" value={etapa} onChange={setEtapa} placeholder="Ex: Objetiva" />
          <Select label="Formato" value={examFormat} onChange={(v) => setExamFormat(v as any)}
            options={[
              { value: 'CE', label: 'Certo/Errado (Cebraspe)' },
              { value: 'ME_5', label: 'Múltipla A-E' },
              { value: 'ME_4', label: 'Múltipla A-D' },
              { value: 'MISTA', label: 'Mista' },
            ]} />
        </div>
      </div>

      {/* ── Upload ──────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-sm">2) PDFs</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <FileSlot label="PDF da prova *" file={provaFile} onChange={setProvaFile} />
          <FileSlot label="PDF do gabarito (opcional)" file={gabaritoFile} onChange={setGabaritoFile} />
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting || !provaFile}
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {extracting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Extraindo… (até 2min)</>
            : <><Sparkles className="w-4 h-4" /> Extrair com IA</>}
        </button>
      </div>

      {/* ── Stats + lista ────────────────────────────────────────── */}
      {stats && (
        <div className="card p-4 grid grid-cols-4 gap-3 text-xs">
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Com gabarito" value={stats.comGabarito} color="text-green-600" />
          <StatBox label="Sem gabarito" value={stats.semGabarito} color={stats.semGabarito > 0 ? 'text-yellow-600' : ''} />
          <StatBox label="Anuladas" value={stats.anuladas} color="text-red-500" />
        </div>
      )}

      {questoes.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center justify-between">
            <span>3) Confira as questões ({questoes.length})</span>
            <span className="text-xs text-muted-foreground font-normal">
              Click pra expandir/editar gabarito ou matéria
            </span>
          </h2>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {questoes.map((q, idx) => (
              <QuestaoRow
                key={idx}
                q={q}
                expanded={expanded.has(idx)}
                onToggle={() => toggleExpand(idx)}
                onChange={(patch) => updateQuestao(idx, patch)}
                subjects={subjects}
                examFormat={examFormat}
              />
            ))}
          </div>
        </div>
      )}

      {questoes.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => { setQuestoes([]); setStats(null) }}
            className="rounded-xl border border-border bg-card hover:bg-muted px-4 py-2 text-sm font-semibold"
          >
            Descartar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar prova
          </button>
        </div>
      )}
    </div>
  )
}

function FileSlot({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="rounded-xl border border-dashed border-border bg-card p-4 flex flex-col items-center justify-center gap-1.5 text-xs cursor-pointer hover:border-brand-500/40">
      <Upload className="w-5 h-5 text-muted-foreground" />
      <span className="font-semibold">{label}</span>
      {file
        ? <span className="text-[10px] text-muted-foreground">{file.name} ({Math.round(file.size / 1024)} KB)</span>
        : <span className="text-[10px] text-muted-foreground">clique pra escolher</span>}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
    </label>
  )
}

function StatBox({ label, value, color = '' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={cn('text-2xl font-black tabular-nums', color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  )
}

function InputBox({
  label, value, onChange, type = 'text', placeholder = '',
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  )
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function QuestaoRow({
  q, expanded, onToggle, onChange, subjects, examFormat,
}: {
  q: Questao
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<Questao>) => void
  subjects: Subject[]
  examFormat: string
}) {
  const letters = examFormat === 'CE' ? ['C', 'E'] : ['A', 'B', 'C', 'D', 'E']
  return (
    <div className="py-3">
      <button onClick={onToggle} className="w-full text-left flex items-center gap-2">
        {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        <span className="text-xs font-bold tabular-nums shrink-0 w-8">Q{q.numero}</span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {q.enunciado.slice(0, 100)}{q.enunciado.length > 100 ? '…' : ''}
        </span>
        {q.anulada
          ? <span className="text-[10px] font-bold text-red-500 shrink-0">ANULADA</span>
          : q.gabarito
            ? <span className="text-[10px] font-bold text-green-600 shrink-0">Gab: {q.gabarito}</span>
            : <span className="text-[10px] font-bold text-yellow-600 inline-flex items-center gap-1 shrink-0"><AlertTriangle className="w-3 h-3" />sem gab.</span>}
      </button>
      {expanded && (
        <div className="mt-3 pl-6 space-y-2 text-xs">
          <textarea
            value={q.enunciado}
            onChange={(e) => onChange({ enunciado: e.target.value })}
            className="w-full rounded-lg border border-border bg-card p-2 text-xs min-h-24 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Gabarito"
              value={q.gabarito ?? ''}
              onChange={(v) => onChange({ gabarito: v || null })}
              options={[{ value: '', label: '—' }, ...letters.map((l) => ({ value: l, label: l }))]}
            />
            <Select
              label="Matéria"
              value={q.subjectId ?? ''}
              onChange={(v) => onChange({ subjectId: v || null })}
              options={[{ value: '', label: '— sem matéria —' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={q.anulada} onChange={(e) => onChange({ anulada: e.target.checked })} />
            Marcar como anulada
          </label>
        </div>
      )}
    </div>
  )
}
