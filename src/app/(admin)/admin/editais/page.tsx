'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FileText, Loader2, Sparkles, Star, Trash2, Bot, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Edital = {
  id: string
  numero: string | null
  ano: number
  titulo: string
  totalQuestoes: number | null
  duracaoMin: number | null
  hasRedacao: boolean
  wrongAnnulsRight: boolean
  examFormat: string | null
  isActive: boolean
  status: string
  dataProva: string | null
  vagas: number | null
  course: { id: string; name: string; slug: string; cargo: string | null; parentSlug: string | null }
  banca: { id: string; name: string; slug: string } | null
  subjectsCount: number
  createdAt: string
}

export default function AdminEditaisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <AdminEditaisInner />
    </Suspense>
  )
}

function AdminEditaisInner() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') ?? 'ativos') as 'ativos' | 'todos' | 'rascunhos'
  const [tab, setTab] = useState<'ativos' | 'todos' | 'rascunhos'>(initialTab)
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/editais')
      setEditais(data.editais)
    } catch {
      toast.error('Erro ao carregar editais')
    } finally {
      setLoading(false)
    }
  }

  async function runDetection() {
    setDetecting(true)
    try {
      const token = prompt('Cron token (do .env):') ?? 'gabaritai-dev-cron-token'
      const { data } = await api.get(`/cron/detect-new-editais`, { headers: { 'x-cron-token': token } })
      toast.success(`${data.draftsCreated} rascunhos criados`)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro na detecção')
    } finally {
      setDetecting(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = editais.filter((e) => {
    if (tab === 'ativos') return e.isActive
    if (tab === 'rascunhos') return !e.isActive && e.status === 'PREVISTO' && (e.titulo?.includes('rascunho') || e.subjectsCount === 0)
    return true
  })

  async function activate(id: string) {
    try {
      await api.post(`/admin/editais/${id}/activate`)
      toast.success('Edital marcado como ativo')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function remove(id: string) {
    if (!confirm('Tem certeza? Apaga o edital e as matérias vinculadas a ele.')) return
    try {
      await api.delete(`/admin/editais/${id}`)
      toast.success('Removido')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" /> Editais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fonte da verdade do sistema. Edital ativo define a banca + matérias + tempo de prova pra todo o curso.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runDetection}
            disabled={detecting}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50 inline-flex items-center gap-2"
            title="Roda o cron de detecção de editais novos manualmente"
          >
            {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} Detectar agora
          </button>
          <Link
            href="/admin/editais/manual"
            className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-600 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Cadastrar edital
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'ativos', label: 'Ativos', count: editais.filter((e) => e.isActive).length },
          { id: 'rascunhos', label: '🆕 Rascunhos IA', count: editais.filter((e) => !e.isActive && e.status === 'PREVISTO' && (e.titulo?.includes('rascunho') || e.subjectsCount === 0)).length },
          { id: 'todos', label: 'Todos', count: editais.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px',
              tab === t.id ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label} <span className="text-xs opacity-60 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {tab === 'rascunhos' ? 'Nenhum rascunho automático. Clica em "Detectar agora" pra rodar o cron.' :
             tab === 'ativos' ? 'Nenhum edital ativo. Ative um da aba "Todos" ou cadastre novo.' :
             'Nenhum edital cadastrado.'}
          </p>
          <Link href="/admin/editais/manual" className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-semibold inline-block">
            Cadastrar manualmente
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className={cn(
              'card p-4',
              e.isActive && 'ring-2 ring-yellow-500/40 bg-yellow-50/30 dark:bg-yellow-900/10',
            )}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {e.isActive && <span className="badge badge-yellow text-[10px] inline-flex items-center gap-1"><Star className="w-3 h-3" /> ATIVO</span>}
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">{e.status}</span>
                    {e.banca && <span className="badge badge-purple text-[10px]">{e.banca.name}</span>}
                  </div>
                  <h2 className="font-bold text-sm truncate">{e.titulo}</h2>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.course.name}{e.course.cargo ? ` · ${e.course.cargo}` : ''} · {e.ano}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    {e.totalQuestoes && <span>📝 {e.totalQuestoes}q</span>}
                    {e.duracaoMin && <span>⏱ {e.duracaoMin}min</span>}
                    {e.vagas && <span>👥 {e.vagas} vagas</span>}
                    {e.subjectsCount > 0 && <span>📚 {e.subjectsCount} matérias</span>}
                    {e.hasRedacao && <span className="text-purple-600">✍️ redação</span>}
                    {e.wrongAnnulsRight && <span className="text-red-600">❌ errada anula certa</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!e.isActive && (
                    <button
                      onClick={() => activate(e.id)}
                      className="rounded-lg bg-yellow-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-yellow-600 inline-flex items-center gap-1"
                    >
                      <Star className="w-3 h-3" /> Ativar
                    </button>
                  )}
                  <Link
                    href={`/admin/editais/${e.id}/conteudo`}
                    className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-brand-600 inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Curar conteúdo
                  </Link>
                  <Link
                    href={`/admin/editais/${e.id}`}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => remove(e.id)}
                    className="rounded-lg border border-red-300 text-red-600 px-2 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remover"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

