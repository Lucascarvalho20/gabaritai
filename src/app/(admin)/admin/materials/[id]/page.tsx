'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  ChevronLeft, Loader2, Save, Eye, Pencil, CheckCircle2, AlertCircle, Trash2, Download,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Material = {
  id: string
  title: string
  content: string | null
  status: string
  origin: string | null
  topicId: string | null
  subjectId: string | null
  active: boolean
  updatedAt: string
  subject: { id: string; name: string; slug: string } | null
  topic: { id: string; name: string; order: number } | null
  resumo: { id: string; resumo: string; pontosChave: any } | null
}

export default function AdminMaterialEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'edit' | 'preview' | 'resumo'>('edit')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [resumo, setResumo] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get(`/admin/content/materials/${id}`)
      .then(({ data }) => {
        setMaterial(data)
        setTitle(data.title ?? '')
        setContent(data.content ?? '')
        setResumo(data.resumo?.resumo ?? '')
        setStatus(data.status ?? 'DRAFT')
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  async function salvar() {
    setSaving(true)
    try {
      await api.patch(`/admin/content/materials/${id}`, { title, content, status, resumo })
      toast.success('Salvo')
      setMaterial((m) => (m ? { ...m, title, content, status, resumo: { id: m.resumo?.id ?? '', resumo, pontosChave: m.resumo?.pontosChave ?? null } } : m))
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deletar() {
    if (!confirm('Deletar este material? Não pode desfazer.')) return
    try {
      await api.delete(`/admin/content/materials/${id}`)
      toast.success('Deletado')
      router.push('/admin/materials')
    } catch {
      toast.error('Erro ao deletar')
    }
  }

  async function publicar() {
    setStatus('PUBLISHED')
    setSaving(true)
    try {
      await api.patch(`/admin/content/materials/${id}`, { title, content, status: 'PUBLISHED', resumo })
      toast.success('Publicado!')
      setMaterial((m) => (m ? { ...m, title, content, status: 'PUBLISHED' } : m))
    } catch {
      toast.error('Erro ao publicar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!material) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-xl font-black">Material não encontrado</h1>
        <Link href="/admin/materials" className="btn-outline btn-md inline-flex">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/admin/materials"
          className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Voltar pra lista
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={salvar}
            disabled={saving}
            className="btn-outline btn-md inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar rascunho
          </button>
          {status !== 'PUBLISHED' && (
            <button
              onClick={publicar}
              disabled={saving}
              className="btn-primary btn-md inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Publicar
            </button>
          )}
          {material.topic?.id && (
            <a
              href={`/dashboard/material/${material.topic.id}/imprimir`}
              target="_blank"
              rel="noopener"
              className="btn-outline btn-md inline-flex items-center gap-1.5"
              title="Visualiza e exporta o PDF do material"
            >
              <Download className="w-4 h-4" />
              PDF
            </a>
          )}
          <button
            onClick={deletar}
            className="btn-outline btn-md inline-flex items-center gap-1.5 text-danger-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <header className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-black bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="Título do material"
        />
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-wide',
              status === 'PUBLISHED'
                ? 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300'
                : status === 'DRAFT'
                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {status}
          </span>
          {material.subject && (
            <span className="text-muted-foreground">{material.subject.name}</span>
          )}
          {material.origin && (
            <span className="text-muted-foreground/60 uppercase tracking-wide">
              · {material.origin}
            </span>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setTab('edit')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
            tab === 'edit'
              ? 'border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Pencil className="w-4 h-4 inline mr-1.5" />
          Editar (Markdown)
        </button>
        <button
          onClick={() => setTab('resumo')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
            tab === 'resumo'
              ? 'border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Resumo
        </button>
        <button
          onClick={() => setTab('preview')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
            tab === 'preview'
              ? 'border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="w-4 h-4 inline mr-1.5" />
          Preview
        </button>
      </div>

      {tab === 'edit' && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[600px] font-mono text-sm bg-muted/30 border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="# Tópico

Conteúdo em Markdown..."
        />
      )}
      {tab === 'resumo' && (
        <textarea
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          className="w-full min-h-[400px] font-mono text-sm bg-muted/30 border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="Resumo enxuto em Markdown (bullets, ~300-600 palavras)..."
        />
      )}
      {tab === 'preview' && (
        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*sem conteúdo*'}</ReactMarkdown>
          {resumo && (
            <>
              <hr />
              <h2>Resumo</h2>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{resumo}</ReactMarkdown>
            </>
          )}
        </article>
      )}
    </div>
  )
}
