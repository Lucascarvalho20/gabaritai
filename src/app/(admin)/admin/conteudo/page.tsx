'use client'

import { useEffect, useState } from 'react'
import { FileText, Brain, Loader2, Plus, Trash2, Edit2, Upload, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab = 'materiais' | 'questoes'

type Subject = { id: string; name: string; slug: string }
type Material = { id: string; title: string; type: string; content: string | null; subject: Subject | null; createdAt: string; active: boolean }
type Question = {
  id: string; enunciado: string; gabarito: string; bancaSlug: string | null
  source: 'OFFICIAL' | 'AI_GENERATED' | 'ADAPTED'; difficulty: string; anulada: boolean
  subject: Subject | null; createdAt: string
}

export default function AdminConteudoPage() {
  const [tab, setTab] = useState<Tab>('materiais')

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Conteúdo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Materiais, questões e importação de provas oficiais.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/conteudo/importar-questoes-lote"
            className="rounded-xl bg-purple-500 text-white px-3.5 py-2 text-sm font-semibold hover:bg-purple-600 inline-flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Importar provas em lote
          </Link>
          <Link
            href="/admin/conteudo/importar"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Importar 1 PDF
          </Link>
        </div>
      </div>

      <div className="card p-1 flex gap-1 w-fit">
        {[
          { key: 'materiais' as Tab, label: 'Materiais', icon: FileText },
          { key: 'questoes' as Tab, label: 'Questões', icon: Brain },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition',
              tab === key ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'materiais' && <MateriaisTab />}
      {tab === 'questoes' && <QuestoesTab />}
    </div>
  )
}

function MateriaisTab() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', subjectId: '' })
  const [subjects, setSubjects] = useState<Subject[]>([])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/content/materials')
      setMaterials(data.materials)
    } catch { toast.error('Erro ao carregar') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    // Carrega lista de matérias (subjects) — endpoint público courses retorna eles agrupados
    api.get('/courses?all=true').then(({ data }) => {
      // Como /courses retorna cursos não matérias, preciso de outro endpoint. Vou só pegar do primeiro curso
      // (TODO: criar /api/subjects ou usar prisma direto). Pra MVP, deixo input livre.
    }).catch(() => {})
  }, [])

  async function submit() {
    if (!form.title || !form.content) return toast.error('Preencha título e conteúdo')
    setCreating(true)
    try {
      await api.post('/admin/content/materials', form)
      toast.success('Material criado')
      setForm({ title: '', content: '', subjectId: '' })
      load()
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Erro') }
    finally { setCreating(false) }
  }

  async function remove(id: string) {
    if (!confirm('Apagar este material?')) return
    try {
      await api.delete(`/admin/content/materials/${id}`)
      toast.success('Apagado')
      load()
    } catch { toast.error('Erro') }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Form de criar */}
      <div className="card p-4 space-y-3 lg:col-span-1">
        <h2 className="font-bold text-sm">+ Novo material</h2>
        <input
          placeholder="Título (ex: Resumo Art. 5º CF)"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Subject ID (opcional)"
          value={form.subjectId}
          onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
        />
        <textarea
          placeholder="Conteúdo (texto, markdown, etc.)"
          value={form.content}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          rows={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={creating}
          className="w-full rounded-xl bg-brand-500 text-white py-2 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {creating ? 'Salvando…' : 'Salvar material'}
        </button>
      </div>

      {/* Lista */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : materials.length === 0 ? (
          <div className="card p-10 text-center text-sm text-muted-foreground">Nenhum material ainda.</div>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="card p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{m.title}</span>
                    <span className="badge-blue text-[10px]">{m.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.content?.slice(0, 200)}…</p>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {m.subject?.name ?? '— sem matéria —'} · {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button onClick={() => remove(m.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestoesTab() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ source: '', banca: '', ano: '', q: '' })
  const [editing, setEditing] = useState<Question | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filter.source) params.source = filter.source
      if (filter.banca) params.banca = filter.banca
      if (filter.ano) params.ano = filter.ano
      if (filter.q) params.q = filter.q
      const { data } = await api.get('/admin/content/questions', { params })
      setQuestions(data.questions)
      setStats(data.stats)
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function toggleAnulada(q: Question) {
    try {
      await api.patch(`/admin/content/questions/${q.id}`, { anulada: !q.anulada })
      toast.success(q.anulada ? 'Reativada' : 'Marcada como anulada')
      load()
    } catch { toast.error('Erro') }
  }

  return (
    <div className="space-y-3">
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Total" value={stats.total} color="text-brand-500" />
          <Stat label="Oficiais" value={stats.official} color="text-green-500" />
          <Stat label="IA-Geradas" value={stats.aiGenerated} color="text-purple-500" />
          <Stat label="Anuladas" value={stats.anuladas} color="text-red-500" />
        </div>
      )}

      <div className="card p-3 flex gap-2 flex-wrap">
        <select value={filter.source} onChange={(e) => setFilter((p) => ({ ...p, source: e.target.value }))} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
          <option value="">Todas origens</option>
          <option value="OFFICIAL">Oficiais</option>
          <option value="AI_GENERATED">IA-Geradas</option>
          <option value="ADAPTED">Adaptadas</option>
        </select>
        <input
          placeholder="Banca (cebraspe)"
          value={filter.banca}
          onChange={(e) => setFilter((p) => ({ ...p, banca: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-32"
        />
        <input
          placeholder="Ano"
          type="number"
          value={filter.ano}
          onChange={(e) => setFilter((p) => ({ ...p, ano: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-24"
        />
        <input
          placeholder="Busca enunciado..."
          value={filter.q}
          onChange={(e) => setFilter((p) => ({ ...p, q: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className={cn('card p-3', q.anulada && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    'badge text-[10px]',
                    q.source === 'OFFICIAL' ? 'badge-green' : q.source === 'AI_GENERATED' ? 'badge-purple' : 'badge-blue',
                  )}>{q.source}</span>
                  {q.bancaSlug && <span className="text-[10px] font-mono uppercase text-muted-foreground">{q.bancaSlug}</span>}
                  <span className="text-[10px] text-muted-foreground">· {q.subject?.name ?? '—'}</span>
                  {q.anulada && <span className="badge-red text-[10px]">ANULADA</span>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(q)}
                    className="text-[10px] px-2 py-1 rounded-md border border-border hover:bg-muted"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleAnulada(q)}
                    className="text-[10px] px-2 py-1 rounded-md border border-border hover:bg-muted"
                  >
                    {q.anulada ? 'Reativar' : 'Anular'}
                  </button>
                </div>
              </div>
              <p className="text-sm line-clamp-2">{q.enunciado}</p>
              <div className="text-[10px] text-muted-foreground mt-1">Gabarito: <strong>{q.gabarito}</strong></div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditQuestionModal
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function EditQuestionModal({ question, onClose, onSaved }: { question: Question; onClose: () => void; onSaved: () => void }) {
  const [enunciado, setEnunciado] = useState(question.enunciado)
  const [gabarito, setGabarito] = useState(question.gabarito)
  const [explicacao, setExplicacao] = useState((question as any).explicacao ?? '')
  const [alternativas, setAlternativas] = useState<Array<{ letra: string; texto: string }>>(
    Array.isArray((question as any).alternativas) ? (question as any).alternativas : []
  )
  const [saving, setSaving] = useState(false)

  function updateAlt(i: number, field: 'letra' | 'texto', value: string) {
    setAlternativas(alternativas.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
  }

  async function save() {
    setSaving(true)
    try {
      await api.patch(`/admin/content/questions/${question.id}`, {
        enunciado, gabarito, explicacao,
        alternativas,
      })
      toast.success('Questão atualizada')
      onSaved()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteQ() {
    if (!confirm('Apagar essa questão? (soft-delete — fica oculta mas histórico preservado)')) return
    setSaving(true)
    try {
      await api.delete(`/admin/content/questions/${question.id}`)
      toast.success('Questão removida')
      onSaved()
    } catch (e: any) {
      toast.error('Erro')
    } finally {
      setSaving(false)
    }
  }

  const isCE = alternativas.length === 0 || gabarito === 'C' || gabarito === 'E'

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Editar questão</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div>
          <label className="text-xs font-bold">Enunciado</label>
          <textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={5}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
        </div>
        {!isCE && alternativas.length > 0 && (
          <div>
            <label className="text-xs font-bold">Alternativas</label>
            <div className="space-y-1.5 mt-1">
              {alternativas.map((alt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={alt.letra} onChange={(e) => updateAlt(i, 'letra', e.target.value)}
                    className="w-12 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center font-bold" />
                  <input value={alt.texto} onChange={(e) => updateAlt(i, 'texto', e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-bold">Gabarito</label>
          {isCE ? (
            <select value={gabarito} onChange={(e) => setGabarito(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">
              <option value="C">C — Certo</option>
              <option value="E">E — Errado</option>
            </select>
          ) : (
            <input value={gabarito} onChange={(e) => setGabarito(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          )}
        </div>
        <div>
          <label className="text-xs font-bold">Explicação (opcional)</label>
          <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)} rows={4}
            placeholder="Fundamentação legal, base normativa, etc"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={saving}
            className="flex-1 rounded-xl bg-brand-500 text-white py-2 text-sm font-bold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </button>
          <button onClick={deleteQ} disabled={saving}
            className="rounded-xl border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-bold">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={cn('text-2xl font-black', color)}>{value.toLocaleString('pt-BR')}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}
