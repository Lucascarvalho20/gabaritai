'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '@/lib/api'

type Material = { id: string; title: string; content: string }
type Resumo = { id: string; resumo: string }
type Data = {
  topic: {
    id: string
    name: string
    subject: { name: string }
  }
  material: Material | null
  resumo: Resumo | null
}

/**
 * Página de impressão do material — visual estilo "apostila profissional".
 * Auto-trigga window.print() após o markdown renderizar.
 *
 * Query: ?modo=completo|resumo|ambos (default: ambos)
 */
export default function MaterialImprimirPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const searchParams = useSearchParams()
  const modo = searchParams.get('modo') ?? 'ambos'
  const [data, setData] = useState<Data | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .get(`/me/materials/topic/${topicId}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
  }, [topicId])

  // Aguarda DOM montar com o markdown renderizado antes de imprimir
  useEffect(() => {
    if (!data) return
    const timer = setTimeout(() => {
      setReady(true)
      // Mais 600ms pro layout estabilizar (imagens, fonts), depois imprime
      setTimeout(() => window.print(), 600)
    }, 800)
    return () => clearTimeout(timer)
  }, [data])

  if (!data)
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Preparando para impressão…
      </div>
    )

  const { topic, material, resumo } = data
  const showCompleto = (modo === 'completo' || modo === 'ambos') && material
  const showResumo = (modo === 'resumo' || modo === 'ambos') && resumo
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm 12mm 16mm 12mm;
        }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { background: white; color: #1e293b; }
      `}</style>

      <div className="apostila">
        {/* CAPA / HEADER */}
        <header className="apostila-cover">
          <div className="apostila-cover-bar" />
          <div className="apostila-cover-inner">
            <p className="apostila-brand">GabaritAI · Material de Estudo</p>
            <p className="apostila-subject">{topic.subject.name}</p>
            <h1 className="apostila-title">{topic.name}</h1>
            <div className="apostila-meta">
              <span>Gerado em {hoje}</span>
              <span>·</span>
              <span>gabaritai.com.br</span>
            </div>
          </div>
        </header>

        {showCompleto && (
          <section className="apostila-section">
            <div className="apostila-section-header apostila-section-header-blue">
              <span className="apostila-section-icon">📘</span>
              <span>Conteúdo completo</span>
            </div>
            <article className="apostila-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {material!.content}
              </ReactMarkdown>
            </article>
          </section>
        )}

        {showResumo && showCompleto && <div className="page-break" />}

        {showResumo && (
          <section className="apostila-section">
            <div className="apostila-section-header apostila-section-header-green">
              <span className="apostila-section-icon">📋</span>
              <span>Resumo rápido — Revisão pré-prova</span>
            </div>
            <article className="apostila-prose apostila-prose-resumo">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {resumo!.resumo}
              </ReactMarkdown>
            </article>
          </section>
        )}

        <footer className="apostila-footer">
          <div className="apostila-footer-bar" />
          <p>
            <strong>GabaritAI</strong> — Mentoria de estudos para concursos públicos<br />
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              gabaritai.com.br · Material gerado e revisado para sua aprovação
            </span>
          </p>
        </footer>
      </div>

      <style jsx global>{`
        /* ─────────────────────────────────────────────────────────────────
           APOSTILA — Estilo profissional GabaritAI
           ───────────────────────────────────────────────────────────────── */
        .apostila {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          color: #1e293b;
          background: white;
          line-height: 1.6;
        }

        /* CAPA */
        .apostila-cover {
          position: relative;
          padding: 40px 0 28px;
          margin-bottom: 24px;
        }
        .apostila-cover-bar {
          position: absolute;
          top: 0;
          left: -20px;
          right: -20px;
          height: 8px;
          background: linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
          border-radius: 0 0 4px 4px;
        }
        .apostila-cover-inner { padding-top: 6px; }
        .apostila-brand {
          font-size: 10pt;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2563eb;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .apostila-subject {
          font-size: 13pt;
          color: #475569;
          font-weight: 600;
          margin: 0 0 4px;
          letter-spacing: 0.02em;
        }
        .apostila-title {
          font-size: 24pt;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0 14px;
          line-height: 1.15;
          letter-spacing: -0.015em;
        }
        .apostila-meta {
          font-size: 9pt;
          color: #64748b;
          display: flex;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }

        /* SEÇÃO HEADER */
        .apostila-section {
          margin: 20px 0;
        }
        .apostila-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          font-size: 12pt;
          font-weight: 700;
          color: white;
          border-radius: 6px 6px 0 0;
          margin-bottom: 0;
          page-break-after: avoid;
        }
        .apostila-section-header-blue {
          background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);
        }
        .apostila-section-header-green {
          background: linear-gradient(90deg, #14532d 0%, #16a34a 100%);
        }
        .apostila-section-icon { font-size: 14pt; }

        /* PROSE — CORPO DO MATERIAL */
        .apostila-prose {
          font-size: 11pt;
          line-height: 1.65;
          color: #1e293b;
          padding: 18px 16px 4px;
          border: 1px solid #cbd5e1;
          border-top: none;
          border-radius: 0 0 6px 6px;
          background: #fafafa;
        }
        .apostila-prose-resumo { background: #f0fdf4; border-color: #bbf7d0; }

        /* HEADERS dentro do prose */
        .apostila-prose h1 {
          display: none; /* Já temos o título na capa */
        }
        .apostila-prose h2 {
          font-size: 14pt;
          font-weight: 800;
          color: white;
          background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
          padding: 7px 14px;
          margin: 22pt 0 12pt;
          border-radius: 4px;
          page-break-after: avoid;
          letter-spacing: 0.01em;
        }
        .apostila-prose-resumo h2 {
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
        }
        .apostila-prose h3 {
          font-size: 11.5pt;
          font-weight: 800;
          color: #1e40af;
          margin: 16pt 0 6pt;
          padding-left: 10px;
          border-left: 4px solid #2563eb;
          page-break-after: avoid;
        }
        .apostila-prose-resumo h3 {
          color: #166534;
          border-left-color: #16a34a;
        }
        .apostila-prose h4 {
          font-size: 10pt;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 14pt 0 4pt;
        }

        /* TEXTO */
        .apostila-prose p { margin: 8pt 0; text-align: justify; }
        .apostila-prose strong {
          color: #0f172a;
          font-weight: 700;
          background: linear-gradient(180deg, transparent 55%, #fde68a 55%);
          padding: 0 2px;
        }
        .apostila-prose em { color: #475569; font-style: italic; }

        /* LISTAS */
        .apostila-prose ul, .apostila-prose ol {
          margin: 6pt 0 6pt 4pt;
          padding-left: 22pt;
        }
        .apostila-prose li { margin: 4pt 0; line-height: 1.55; }
        .apostila-prose ul li::marker { color: #2563eb; font-weight: 700; }
        .apostila-prose ol li::marker { color: #2563eb; font-weight: 700; }

        /* CITAÇÃO (blockquote) — Lei ou Súmula em destaque */
        .apostila-prose blockquote {
          margin: 12pt 0;
          padding: 10pt 14pt;
          background: #fffbeb;
          border-left: 5px solid #f59e0b;
          color: #78350f;
          font-style: italic;
          border-radius: 0 6px 6px 0;
          page-break-inside: avoid;
          font-size: 10.5pt;
          position: relative;
        }
        .apostila-prose blockquote::before {
          content: '⚖️';
          position: absolute;
          top: 8pt;
          right: 10pt;
          font-style: normal;
          font-size: 14pt;
          opacity: 0.5;
        }
        .apostila-prose blockquote p { margin: 3pt 0; }

        /* CÓDIGO INLINE */
        .apostila-prose code {
          background: #ede9fe;
          color: #6d28d9;
          padding: 1pt 5pt;
          border-radius: 3pt;
          font-size: 9.5pt;
          font-family: 'SF Mono', Menlo, monospace;
          font-weight: 600;
        }

        /* TABELAS */
        .apostila-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
          font-size: 10pt;
          page-break-inside: avoid;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .apostila-prose thead { background: linear-gradient(90deg, #1e3a8a, #2563eb); }
        .apostila-prose-resumo thead { background: linear-gradient(90deg, #14532d, #16a34a); }
        .apostila-prose th {
          color: white;
          padding: 6pt 9pt;
          text-align: left;
          font-weight: 700;
          font-size: 10pt;
        }
        .apostila-prose td {
          border: 1px solid #e2e8f0;
          padding: 5pt 9pt;
          vertical-align: top;
          background: white;
        }
        .apostila-prose tr:nth-child(even) td { background: #f8fafc; }

        /* HR — separador entre subseções */
        .apostila-prose hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
          margin: 18pt 0;
        }

        /* RODAPÉ */
        .apostila-footer {
          margin-top: 30px;
          padding: 14px 0 20px;
          text-align: center;
          font-size: 9pt;
          color: #475569;
          position: relative;
        }
        .apostila-footer-bar {
          height: 2px;
          background: linear-gradient(90deg, transparent, #2563eb, transparent);
          margin: 0 -20px 14px;
        }
        .apostila-footer p { margin: 0; }

        /* ── REGRAS DE QUEBRA DE PÁGINA ── */
        @media print {
          .apostila-prose h2,
          .apostila-prose h3,
          .apostila-prose h4 { page-break-after: avoid; }
          .apostila-prose blockquote,
          .apostila-prose table { page-break-inside: avoid; }
          .apostila-section-header { page-break-after: avoid; }
        }
      `}</style>
    </>
  )
}
