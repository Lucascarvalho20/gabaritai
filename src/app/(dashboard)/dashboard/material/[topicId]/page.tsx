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
        /* H1 esconde (já temos no header da página) */
        .material-prose h1 { display: none; }

        /* H2 — banner colorido estilo apostila */
        .material-prose h2 {
          font-size: 1.15rem;
          font-weight: 800;
          color: white;
          background: linear-gradient(90deg, rgb(30 64 175) 0%, rgb(37 99 235) 100%);
          padding: 0.5rem 0.875rem;
          margin: 1.75rem 0 0.875rem;
          border-radius: 0.375rem;
          letter-spacing: 0.01em;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.18);
        }
        :is(.dark) .material-prose h2 {
          background: linear-gradient(90deg, rgb(30 58 138) 0%, rgb(59 130 246) 100%);
        }
        .material-prose-resumo h2 {
          background: linear-gradient(90deg, rgb(22 101 52) 0%, rgb(34 197 94) 100%) !important;
          box-shadow: 0 2px 6px rgba(34, 197, 94, 0.18);
        }

        /* H3 — borda esquerda colorida */
        .material-prose h3 {
          font-size: 1.02rem;
          font-weight: 800;
          color: rgb(30 58 138);
          margin: 1.25rem 0 0.5rem;
          padding-left: 0.75rem;
          border-left: 4px solid rgb(37 99 235);
          line-height: 1.3;
        }
        :is(.dark) .material-prose h3 {
          color: rgb(147 197 253);
          border-left-color: rgb(96 165 250);
        }
        .material-prose-resumo h3 {
          color: rgb(22 101 52);
          border-left-color: rgb(34 197 94);
        }
        :is(.dark) .material-prose-resumo h3 { color: rgb(134 239 172); }

        /* H4 — uppercase pequeno (subseção) */
        .material-prose h4 {
          font-size: 0.85rem;
          font-weight: 800;
          color: rgb(71 85 105);
          margin: 1rem 0 0.3rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        :is(.dark) .material-prose h4 { color: rgb(148 163 184); }

        /* TEXTO base */
        .material-prose p {
          line-height: 1.75;
          margin: 0.65rem 0;
          color: rgb(30 41 59);
        }
        :is(.dark) .material-prose p { color: rgb(203 213 225); }

        /* STRONG — highlight amarelo translúcido (estilo marca-texto) */
        .material-prose strong {
          color: rgb(15 23 42);
          font-weight: 700;
          background: linear-gradient(180deg, transparent 55%, rgb(254 240 138) 55%);
          padding: 0 2px;
        }
        :is(.dark) .material-prose strong {
          color: rgb(254 240 138);
          background: linear-gradient(180deg, transparent 55%, rgba(254, 240, 138, 0.18) 55%);
        }

        /* LISTAS */
        .material-prose ul, .material-prose ol {
          margin: 0.6rem 0;
          padding-left: 1.6rem;
        }
        .material-prose li {
          margin: 0.35rem 0;
          line-height: 1.65;
          color: rgb(30 41 59);
        }
        :is(.dark) .material-prose li { color: rgb(203 213 225); }
        .material-prose ul li::marker {
          color: rgb(37 99 235);
          font-weight: 800;
        }
        .material-prose ol li::marker {
          color: rgb(37 99 235);
          font-weight: 800;
        }
        :is(.dark) .material-prose ul li::marker,
        :is(.dark) .material-prose ol li::marker { color: rgb(96 165 250); }

        /* BLOCKQUOTE — citação de lei/súmula com badge */
        .material-prose blockquote {
          position: relative;
          margin: 1rem 0;
          padding: 0.85rem 1rem 0.85rem 2.4rem;
          background: linear-gradient(135deg, rgb(255 251 235) 0%, rgb(254 252 232) 100%);
          border-left: 5px solid rgb(245 158 11);
          color: rgb(120 53 15);
          font-style: italic;
          border-radius: 0 0.5rem 0.5rem 0;
          font-size: 0.92rem;
        }
        .material-prose blockquote::before {
          content: '⚖️';
          position: absolute;
          left: 0.7rem;
          top: 0.85rem;
          font-style: normal;
          font-size: 1.1rem;
        }
        :is(.dark) .material-prose blockquote {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%);
          color: rgb(252 211 77);
        }
        .material-prose blockquote p { margin: 0.25rem 0; }

        /* CÓDIGO INLINE — destaque para Art XX, leis, etc. */
        .material-prose code {
          background: rgb(238 233 254);
          color: rgb(91 33 182);
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          font-family: 'SF Mono', Menlo, monospace;
          font-weight: 600;
        }
        :is(.dark) .material-prose code {
          background: rgba(139, 92, 246, 0.15);
          color: rgb(196 181 253);
        }

        /* TABELAS — estilo apostila */
        .material-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.88rem;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .material-prose thead {
          background: linear-gradient(90deg, rgb(30 58 138), rgb(37 99 235));
        }
        :is(.dark) .material-prose thead {
          background: linear-gradient(90deg, rgb(30 64 175), rgb(59 130 246));
        }
        .material-prose-resumo thead {
          background: linear-gradient(90deg, rgb(22 101 52), rgb(34 197 94));
        }
        .material-prose th {
          color: white !important;
          padding: 0.55rem 0.8rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.02em;
        }
        .material-prose td {
          border: 1px solid rgb(226 232 240);
          padding: 0.5rem 0.8rem;
          vertical-align: top;
          background: white;
        }
        :is(.dark) .material-prose td {
          background: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: rgb(203 213 225);
        }
        .material-prose tr:nth-child(even) td { background: rgb(248 250 252); }
        :is(.dark) .material-prose tr:nth-child(even) td {
          background: rgba(30, 41, 59, 0.6);
        }

        /* HR — separador elegante */
        .material-prose hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgb(203 213 225), transparent);
          margin: 1.5rem 0;
        }
        :is(.dark) .material-prose hr {
          background: linear-gradient(90deg, transparent, rgb(51 65 85), transparent);
        }

        /* CONTAINER do resumo — fundo verde suave */
        .material-prose-resumo {
          background: linear-gradient(135deg, rgb(240 253 244) 0%, rgb(255 255 255) 100%) !important;
          border-color: rgb(187 247 208) !important;
        }
        :is(.dark) .material-prose-resumo {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%) !important;
          border-color: rgba(34, 197, 94, 0.2) !important;
        }
      `}</style>
    </div>
  )
}
