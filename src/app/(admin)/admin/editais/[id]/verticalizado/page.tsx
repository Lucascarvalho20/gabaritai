'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Save, Loader2, Sparkles, Trash2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

type Verticalizado = {
  cacheKey: string
  content: string | null
  modelUsed: string | null
  createdAt: string | null
  lastUsedAt: string | null
  hitCount: number
  course: { name: string; cargo: string | null; orgao: string | null }
  banca: string | null
}

export default function EditarVerticalizadoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<Verticalizado | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    api.get(`/admin/editais/${params.id}/verticalizado`)
      .then(({ data }) => {
        setData(data)
        setContent(data.content ?? '')
      })
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [params.id])

  async function save() {
    if (content.trim().length < 50) {
      toast.error('Análise precisa ter pelo menos 50 caracteres')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/editais/${params.id}/verticalizado`, { content })
      toast.success('Análise salva! Já está visível pros alunos.')
      // Reload pra mostrar data atualizada
      const { data: fresh } = await api.get(`/admin/editais/${params.id}/verticalizado`)
      setData(fresh)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deletar() {
    if (!confirm('Apagar a análise atual? Próximo aluno que abrir vai disparar regeneração via IA.')) return
    setSaving(true)
    try {
      await api.delete(`/admin/editais/${params.id}/verticalizado`)
      toast.success('Análise apagada. Próxima request vai regenerar via IA.')
      setContent('')
      const { data: fresh } = await api.get(`/admin/editais/${params.id}/verticalizado`)
      setData(fresh)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Falha ao apagar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!data) {
    return <div className="max-w-3xl mx-auto card p-6 text-center">Edital não encontrado</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/admin/editais/${params.id}`)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-500" /> Análise estratégica
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data.course.name}{data.course.cargo ? ` · ${data.course.cargo}` : ''}
            {data.banca ? ` · ${data.banca}` : ''}
          </p>
        </div>
        {data.content && (
          <button onClick={deletar} disabled={saving}
            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Apagar e regerar
          </button>
        )}
      </div>

      {/* Metadados do cache */}
      {data.content && (
        <div className="card p-3 text-xs flex flex-wrap items-center gap-4">
          <span className="text-muted-foreground">Modelo: <strong className="text-foreground">{data.modelUsed ?? '—'}</strong></span>
          {data.createdAt && <span className="text-muted-foreground">Criado: <strong className="text-foreground">{new Date(data.createdAt).toLocaleString('pt-BR')}</strong></span>}
          <span className="text-muted-foreground">Visualizações: <strong className="text-foreground">{data.hitCount}</strong></span>
        </div>
      )}

      {!data.content && (
        <div className="card p-4 border-yellow-200 dark:border-yellow-800/40 bg-yellow-50/40 dark:bg-yellow-900/10 text-sm">
          <p className="font-semibold mb-1">Nenhuma análise gerada ainda.</p>
          <p className="text-muted-foreground text-xs">
            A IA gera automaticamente quando um aluno abre essa página pela primeira vez ou recebe o
            lead magnet por email. Você pode escrever uma agora pra começar com qualidade garantida.
          </p>
        </div>
      )}

      {/* Editor + Preview */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-border bg-muted/30">
          <button onClick={() => setTab('edit')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${tab === 'edit' ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <FileText className="w-3 h-3 inline mr-1" /> Editar
          </button>
          <button onClick={() => setTab('preview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${tab === 'preview' ? 'border-brand-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Sparkles className="w-3 h-3 inline mr-1" /> Pré-visualizar
          </button>
        </div>
        {tab === 'edit' ? (
          <div className="p-4">
            <textarea
              className="w-full min-h-96 px-4 py-3 rounded-lg border border-border bg-background font-mono text-xs"
              placeholder="Escreva a análise estratégica em Markdown. Sugestão de estrutura:&#10;&#10;## 🎯 Por onde começar&#10;...&#10;&#10;## 🔥 O que essa banca ama cobrar&#10;...&#10;&#10;## ⚡ 3 erros que derrubam candidato"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-muted-foreground">
                {content.length.toLocaleString('pt-BR')} caracteres · Markdown suportado (## títulos, **negrito**, listas)
              </span>
              <button onClick={save} disabled={saving || content.trim().length < 50}
                className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 min-h-96">
            {content.trim() ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nada pra pré-visualizar. Escreva algo na aba "Editar".</p>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        💡 <strong>Como funciona:</strong> Essa análise aparece pro aluno em <code>/dashboard/edital-verticalizado/{params.id}</code>
        e no email do lead magnet quando alguém pede edital do {data.course.name}. Quando o edital muda, você pode apagar (botão acima) pra
        forçar a IA regerar.
      </div>
    </div>
  )
}
