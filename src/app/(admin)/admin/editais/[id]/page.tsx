'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Save, Loader2, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Edital = {
  id: string
  courseId: string
  titulo: string
  numero: string | null
  ano: number
  vagas: number | null
  salario: number | null
  escolaridade: string | null
  totalQuestoes: number | null
  duracaoMin: number | null
  hasRedacao: boolean
  wrongAnnulsRight: boolean
  examFormat: string | null
  dataAbertura: string | null
  dataInscricaoIni: string | null
  dataInscricaoFim: string | null
  dataProva: string | null
  taxaInscricao: number | null
  isActive: boolean
  status: string
  pdfUrl: string | null
  course: { name: string; cargo: string | null; orgao: string | null }
  banca: { name: string } | null
  subjects: Array<{ id: string; weight: number; expectedQuestions: number | null; subject: { name: string } }>
}

export default function EditEditalPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Edital>>({})

  useEffect(() => {
    api.get(`/admin/editais/${params.id}`)
      .then(({ data }) => {
        setEdital(data)
        setForm({
          titulo: data.titulo,
          numero: data.numero,
          ano: data.ano,
          vagas: data.vagas,
          salario: data.salario,
          escolaridade: data.escolaridade,
          totalQuestoes: data.totalQuestoes,
          duracaoMin: data.duracaoMin,
          hasRedacao: data.hasRedacao,
          wrongAnnulsRight: data.wrongAnnulsRight,
          examFormat: data.examFormat,
          dataAbertura: data.dataAbertura,
          dataInscricaoFim: data.dataInscricaoFim,
          dataProva: data.dataProva,
          pdfUrl: data.pdfUrl,
        })
      })
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar edital'))
      .finally(() => setLoading(false))
  }, [params.id])

  function setField<K extends keyof Edital>(k: K, v: Edital[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function toDateInput(v: string | null | undefined): string {
    if (!v) return ''
    try { return new Date(v).toISOString().slice(0, 10) } catch { return '' }
  }

  async function save() {
    setSaving(true)
    try {
      const payload: any = { ...form }
      // Converte datas vazias pra null e strings ISO
      const dateFields = ['dataAbertura', 'dataInscricaoIni', 'dataInscricaoFim', 'dataProva']
      for (const f of dateFields) {
        if (payload[f] === '') payload[f] = null
      }
      // Números
      for (const f of ['vagas', 'salario', 'totalQuestoes', 'duracaoMin', 'ano', 'taxaInscricao']) {
        if (payload[f] === '' || payload[f] === null) continue
        if (typeof payload[f] === 'string') payload[f] = Number(payload[f]) || null
      }
      await api.patch(`/admin/editais/${params.id}`, payload)
      toast.success('Edital atualizado')
      router.push('/admin/editais')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!edital) {
    return <div className="max-w-3xl mx-auto card p-6 text-center">Edital não encontrado</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/editais')}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" /> Editar edital
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {edital.course.name}{edital.course.cargo ? ` · ${edital.course.cargo}` : ''}
            {edital.banca?.name ? ` · ${edital.banca.name}` : ''}
            {edital.isActive && <span className="ml-2 text-xs text-emerald-600 font-bold">● ATIVO</span>}
          </p>
        </div>
      </div>

      {/* Aviso sobre alterar matérias */}
      <div className="card p-4 border-yellow-200 dark:border-yellow-800/40 bg-yellow-50/40 dark:bg-yellow-900/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground mb-1">Alterar matérias e tópicos?</p>
            <p className="text-muted-foreground text-xs">
              Esta tela edita só os <strong>dados gerais</strong> (vagas, salário, datas, etc).
              Pra alterar matérias/tópicos do edital, use o cadastro manual — ele detecta o edital ativo
              e mostra exatamente o que vai mudar antes de aplicar (não perde progresso dos alunos).
            </p>
            <Link href="/admin/editais/manual"
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold">
              <RefreshCw className="w-3 h-3" /> Atualizar matérias/tópicos
            </Link>
          </div>
        </div>
      </div>

      {/* Metadados */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-sm">Dados do edital</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Título">
            <input className="input" value={form.titulo ?? ''} onChange={(e) => setField('titulo', e.target.value)} />
          </Field>
          <Field label="Número">
            <input className="input" value={form.numero ?? ''} onChange={(e) => setField('numero', e.target.value)} placeholder="ex: 001/2026" />
          </Field>
          <Field label="Ano">
            <input className="input" type="number" value={form.ano ?? ''} onChange={(e) => setField('ano', Number(e.target.value) as any)} />
          </Field>
          <Field label="Vagas">
            <input className="input" type="number" value={form.vagas ?? ''} onChange={(e) => setField('vagas', Number(e.target.value) as any)} />
          </Field>
          <Field label="Salário inicial (R$)">
            <input className="input" type="number" step="0.01" value={form.salario ?? ''} onChange={(e) => setField('salario', Number(e.target.value) as any)} />
          </Field>
          <Field label="Escolaridade">
            <input className="input" value={form.escolaridade ?? ''} onChange={(e) => setField('escolaridade', e.target.value)} placeholder="ex: Nível médio" />
          </Field>
          <Field label="Total de questões">
            <input className="input" type="number" value={form.totalQuestoes ?? ''} onChange={(e) => setField('totalQuestoes', Number(e.target.value) as any)} />
          </Field>
          <Field label="Duração (minutos)">
            <input className="input" type="number" value={form.duracaoMin ?? ''} onChange={(e) => setField('duracaoMin', Number(e.target.value) as any)} />
          </Field>
          <Field label="Formato da prova">
            <select className="input" value={form.examFormat ?? ''} onChange={(e) => setField('examFormat', e.target.value as any)}>
              <option value="">— não definido —</option>
              <option value="CE">Certo/Errado</option>
              <option value="ME_5">Múltipla escolha (5)</option>
              <option value="ME_4">Múltipla escolha (4)</option>
              <option value="MISTA">Mista</option>
            </select>
          </Field>
          <Field label="Tem redação?">
            <select className="input" value={form.hasRedacao ? '1' : '0'} onChange={(e) => setField('hasRedacao', e.target.value === '1')}>
              <option value="0">Não</option>
              <option value="1">Sim</option>
            </select>
          </Field>
          <Field label="Errada anula certa?">
            <select className="input" value={form.wrongAnnulsRight ? '1' : '0'} onChange={(e) => setField('wrongAnnulsRight', e.target.value === '1')}>
              <option value="0">Não</option>
              <option value="1">Sim</option>
            </select>
          </Field>
          <Field label="PDF (URL)">
            <input className="input" value={form.pdfUrl ?? ''} onChange={(e) => setField('pdfUrl', e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Data de abertura">
            <input className="input" type="date" value={toDateInput(form.dataAbertura as string)} onChange={(e) => setField('dataAbertura', e.target.value as any)} />
          </Field>
          <Field label="Inscrições até">
            <input className="input" type="date" value={toDateInput(form.dataInscricaoFim as string)} onChange={(e) => setField('dataInscricaoFim', e.target.value as any)} />
          </Field>
          <Field label="Data da prova">
            <input className="input" type="date" value={toDateInput(form.dataProva as string)} onChange={(e) => setField('dataProva', e.target.value as any)} />
          </Field>
        </div>
      </div>

      {/* Matérias do edital (read-only) */}
      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3">Matérias ({edital.subjects.length})</h2>
        <div className="space-y-1.5 text-sm">
          {edital.subjects.map((es) => (
            <div key={es.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <span className="font-medium">{es.subject.name}</span>
              <span className="text-xs text-muted-foreground">
                peso {es.weight}{es.expectedQuestions ? ` · ~${es.expectedQuestions} questões` : ''}
              </span>
            </div>
          ))}
          {edital.subjects.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhuma matéria cadastrada</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => router.push('/admin/editais')} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
          Cancelar
        </button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</span>
      {children}
    </label>
  )
}
