'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  BookOpen, FileText, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Loader2, AlertCircle, Sparkles, Clock, ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Material = {
  id: string
  title: string
  content: string
  updatedAt: string
  sourcesUsed: any
}
type Resumo = {
  id: string
  resumo: string
  pontosChave: any
}
type Data = {
  topic: {
    id: string
    name: string
    description: string | null
    order: number
    weight: number
    subject: { id: string; name: string; slug: string }
  }
  material: Material | null
  resumo: Resumo | null
  progresso: {
    completedAt: string | null
    masteryScore: number
    totalAttempts: number
  }
  proximoTopico: { id: string; name: string; order: number } | null
}

type Tab = 'completo' | 'resumo'

export default function MaterialTopicoPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('completo')
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get(`/me/materials/topic/${topicId}`)
      .then(({ data }) => {
        if (!alive) return
        setData(data)
        if (!data.material && data.resumo) setTab('resumo')
      })
      .catch(() => toast.error('Erro ao carregar material'))
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [topicId])

  async function marcarComoEstudado() {
    if (!data) return
    setMarking(true)
    try {
      const action = data.progresso.completedAt ? 'delete' : 'post'
      if (action === 'post') {
        await api.post(`/me/topics/${topicId}/complete`)
        setData({ ...data, progresso: { ...data.progresso, completedAt: new Date().toISOString() } })
        toast.success('Tópico marcado como estudado!')
      } else {
        await api.delete(`/me/topics/${topicId}/complete`)
        setData({ ...data, progresso: { ...data.progresso, completedAt: null } })
        toast.success('Marcação removida')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-xl font-black">Tópico não encontrado</h1>
        <button onClick={() => router.back()} className="btn-outline btn-md inline-flex">
          Voltar
        </button>
      </div>
    )
  }

  const { topic, material, resumo, progresso, proximoTopico } = data
  const estudado = !!progresso.completedAt
  const semConteudo = !material && !resumo

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-24">
      <button
        onClick={() => router.back()}
        className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" /> Voltar
      </button>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {topic.subject.name}
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">{topic.name}</h1>
        {topic.description && (
          <p className="text-sm text-muted-foreground">{topic.description}</p>
        )}
      </header>

      {semConteudo ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <h2 className="font-bold">Material em produção</h2>
          <p className="text-sm text-muted-foreground">
            Esse tópico ainda não tem material publicado. Nossa equipe está gerando — volte em
            breve.
          </p>
          <p className="text-xs text-muted-foreground">
            Enquanto isso, você pode estudar pelas questões e flashcards desse tópico.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-border">
            {material && (
              <button
                onClick={() => setTab('completo')}
                className={cn(
                  'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
                  tab === 'completo'
                    ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <BookOpen className="w-4 h-4 inline mr-1.5" />
                Conteúdo completo
              </button>
            )}
            {resumo && (
              <button
                onClick={() => setTab('resumo')}
                className={cn(
                  'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
                  tab === 'resumo'
                    ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className="w-4 h-4 inline mr-1.5" />
                Resumo
              </button>
            )}
          </div>

          <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            {tab === 'completo' && material && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{material.content}</ReactMarkdown>
            )}
            {tab === 'resumo' && resumo && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{resumo.resumo}</ReactMarkdown>
            )}
          </article>

          {tab === 'resumo' && resumo?.pontosChave && Array.isArray(resumo.pontosChave) && (
            <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-4">
              <p className="text-xs uppercase tracking-wide font-bold text-brand-700 dark:text-brand-300 mb-2">
                Pontos-chave para revisar
              </p>
              <ul className="space-y-1.5 text-sm">
                {(resumo.pontosChave as string[]).map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-500 font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aprofundar com NotebookLM */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-0.5">Quer ir mais fundo?</p>
              <p className="text-xs text-muted-foreground mb-2">
                Use o NotebookLM (gratuito do Google) com PDFs oficiais (edital, súmulas, lei seca) e converse com a IA citando fontes. Complemento do nosso material — não substitui.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://notebooklm.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir NotebookLM
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${topic.name} ${topic.subject.name} PDF site:planalto.gov.br OR site:stf.jus.br`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buscar fontes oficiais
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border pt-4 pb-4 -mx-4 px-4 flex items-center justify-between gap-3">
        <button
          onClick={marcarComoEstudado}
          disabled={marking}
          className={cn(
            'btn-md inline-flex items-center gap-2',
            estudado ? 'btn-outline' : 'btn-primary'
          )}
        >
          {marking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : estudado ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          {estudado ? 'Estudado' : 'Marcar como estudado'}
        </button>

        {proximoTopico ? (
          <Link
            href={`/dashboard/material/${proximoTopico.id}`}
            className="btn-outline btn-md inline-flex items-center gap-1.5"
          >
            Próximo tópico
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Último da matéria
          </div>
        )}
      </div>
    </div>
  )
}
