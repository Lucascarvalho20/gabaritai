'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  BookOpen, FileText, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Loader2, AlertCircle, Sparkles, Clock, ExternalLink, Download, Printer,
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

      <header className="rounded-xl bg-gradient-to-br from-brand-50 via-card to-brand-50/30 dark:from-brand-900/20 dark:via-card dark:to-brand-900/10 border border-brand-100 dark:border-brand-900/30 p-5 md:p-6 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400 font-bold">
              {topic.subject.name}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight mt-1">
              {topic.name}
            </h1>
            {topic.description && (
              <p className="text-sm text-muted-foreground mt-2">{topic.description}</p>
            )}
          </div>
          {(material || resumo) && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <a
                href={`/dashboard/material/${topicId}/imprimir`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-card border border-border hover:border-brand-300 dark:hover:border-brand-700 text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF
              </a>
            </div>
          )}
        </div>
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
          <div className="flex items-center gap-1 border-b border-border bg-muted/20 rounded-t-lg px-1 pt-1">
            {material && (
              <button
                onClick={() => setTab('completo')}
                className={cn(
                  'px-4 py-2.5 text-sm font-bold rounded-t-md transition-all',
                  tab === 'completo'
                    ? 'bg-card text-brand-700 dark:text-brand-300 shadow-sm border border-border border-b-card -mb-px'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
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
                  'px-4 py-2.5 text-sm font-bold rounded-t-md transition-all',
                  tab === 'resumo'
                    ? 'bg-card text-success-700 dark:text-success-300 shadow-sm border border-border border-b-card -mb-px'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                )}
              >
                <FileText className="w-4 h-4 inline mr-1.5" />
                Resumo rápido
              </button>
            )}
            <div className="flex-1" />
            <a
              href={`/dashboard/material/${topicId}/imprimir?modo=${tab}`}
              target="_blank"
              rel="noopener"
              title={`Baixar PDF do ${tab === 'completo' ? 'conteúdo completo' : 'resumo'}`}
              className="px-3 py-1.5 mr-1 text-[11px] font-bold text-muted-foreground hover:text-brand-600 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF
            </a>
          </div>

          <article className={cn(
            'rounded-b-lg border border-t-0 border-border bg-card p-5 md:p-8',
            'material-prose prose prose-sm md:prose-base dark:prose-invert max-w-none',
            tab === 'completo' && 'material-prose-completo',
            tab === 'resumo' && 'material-prose-resumo',
          )}>
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

      <style jsx global>{`
        .material-prose h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: rgb(15 23 42);
          margin: 1.5rem 0 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid rgb(37 99 235);
          letter-spacing: -0.01em;
        }
        :is(.dark) .material-prose h1 { color: rgb(241 245 249); border-bottom-color: rgb(96 165 250); }

        .material-prose h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: rgb(30 58 138);
          margin: 1.75rem 0 0.6rem;
          padding-left: 0.75rem;
          border-left: 4px solid rgb(37 99 235);
          line-height: 1.3;
        }
        :is(.dark) .material-prose h2 { color: rgb(147 197 253); border-left-color: rgb(96 165 250); }

        .material-prose h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: rgb(15 23 42);
          margin: 1.2rem 0 0.4rem;
        }
        :is(.dark) .material-prose h3 { color: rgb(226 232 240); }

        .material-prose h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: rgb(51 65 85);
          margin: 1rem 0 0.3rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        :is(.dark) .material-prose h4 { color: rgb(203 213 225); }

        .material-prose p { line-height: 1.75; margin: 0.6rem 0; }

        .material-prose ul, .material-prose ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        .material-prose li { margin: 0.3rem 0; line-height: 1.65; }
        .material-prose ul li::marker { color: rgb(37 99 235); }
        :is(.dark) .material-prose ul li::marker { color: rgb(96 165 250); }

        .material-prose strong {
          color: rgb(15 23 42);
          font-weight: 700;
          background: linear-gradient(180deg, transparent 60%, rgb(254 240 138) 60%);
          padding: 0 1px;
        }
        :is(.dark) .material-prose strong {
          color: rgb(254 240 138);
          background: linear-gradient(180deg, transparent 60%, rgba(254, 240, 138, 0.15) 60%);
        }

        .material-prose blockquote {
          margin: 1rem 0;
          padding: 0.75rem 1rem;
          border-left: 4px solid rgb(245 158 11);
          background: rgb(255 251 235);
          color: rgb(120 53 15);
          font-style: italic;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        :is(.dark) .material-prose blockquote {
          background: rgba(245, 158, 11, 0.08);
          color: rgb(252 211 77);
        }

        .material-prose code {
          background: rgb(241 245 249);
          color: rgb(220 38 38);
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'SF Mono', Menlo, monospace;
        }
        :is(.dark) .material-prose code { background: rgb(30 41 59); color: rgb(252 165 165); }

        .material-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.9rem;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .material-prose th {
          background: rgb(37 99 235);
          color: white;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .material-prose td {
          border: 1px solid rgb(226 232 240);
          padding: 0.5rem 0.75rem;
          vertical-align: top;
        }
        :is(.dark) .material-prose td { border-color: rgb(51 65 85); }
        .material-prose tr:nth-child(even) td { background: rgb(248 250 252); }
        :is(.dark) .material-prose tr:nth-child(even) td { background: rgba(30, 41, 59, 0.4); }

        .material-prose hr {
          border: none;
          border-top: 2px dashed rgb(203 213 225);
          margin: 2rem 0;
        }
        :is(.dark) .material-prose hr { border-top-color: rgb(51 65 85); }

        /* RESUMO: visual mais compacto e destacado */
        .material-prose-resumo {
          background: linear-gradient(135deg, rgb(240 253 244) 0%, rgb(255 255 255) 100%);
          border-color: rgb(187 247 208) !important;
        }
        :is(.dark) .material-prose-resumo {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%);
          border-color: rgba(34, 197, 94, 0.2) !important;
        }
        .material-prose-resumo h2 {
          color: rgb(22 101 52) !important;
          border-left-color: rgb(34 197 94) !important;
        }
        :is(.dark) .material-prose-resumo h2 {
          color: rgb(134 239 172) !important;
          border-left-color: rgb(74 222 128) !important;
        }
        .material-prose-resumo h3 {
          color: rgb(22 101 52);
        }
        :is(.dark) .material-prose-resumo h3 { color: rgb(167 243 208); }
      `}</style>
    </div>
  )
}
