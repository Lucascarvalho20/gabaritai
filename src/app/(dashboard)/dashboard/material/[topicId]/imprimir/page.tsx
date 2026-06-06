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
  // ID do material pra anti-cópia (rastreabilidade)
  const matId = (material?.id ?? resumo?.id ?? topicId).slice(0, 8).toUpperCase()

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
        {/* MARCA D'ÁGUA DIAGONAL (anti-cópia) */}
        <div className="apostila-watermark" aria-hidden="true">
          <span>GABARITAI · {matId}</span>
        </div>

        {/* CAPA MINIMALISTA */}
        <header className="apostila-cover">
          <div className="apostila-cover-inner">
            <div className="apostila-cover-row">
              <div className="apostila-logo">
                <span className="apostila-logo-letter">G</span>
                <span className="apostila-logo-text">GabaritAI</span>
              </div>
              <div className="apostila-meta">
                <span>{hoje}</span>
                <span className="apostila-meta-dot">·</span>
                <span>ID {matId}</span>
              </div>
            </div>
            <p className="apostila-subject">{topic.subject.name}</p>
            <h1 className="apostila-title">{topic.name}</h1>
            <div className="apostila-cover-divider" />
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
          <div className="apostila-footer-grid">
            <div className="apostila-footer-left">
              <div className="apostila-logo apostila-logo-sm">
                <span className="apostila-logo-letter">G</span>
                <span className="apostila-logo-text">GabaritAI</span>
              </div>
              <p className="apostila-footer-tag">
                Mentoria inteligente · concursos públicos
              </p>
            </div>
            <div className="apostila-footer-right">
              <p>gabaritai.com.br</p>
              <p className="apostila-footer-id">Documento {matId}</p>
              <p className="apostila-footer-warn">
                Material de uso pessoal · proibida a redistribuição
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        /* ─────────────────────────────────────────────────────────────────
           APOSTILA MINIMALISTA — GabaritAI 2026
           Inspirações: Notion docs, Stripe Atlas guides, Linear changelog
           ───────────────────────────────────────────────────────────────── */
        .apostila {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 20px;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          color: #18181b;
          background: white;
          line-height: 1.65;
        }

        /* ── MARCA D'ÁGUA DIAGONAL (anti-cópia) ── */
        .apostila-watermark {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .apostila-watermark span {
          font-family: 'Inter', sans-serif;
          font-size: 110pt;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.04);
          letter-spacing: 0.05em;
          transform: rotate(-32deg);
          white-space: nowrap;
          user-select: none;
        }
        .apostila > * { position: relative; z-index: 1; }

        /* ── CAPA MINIMALISTA ── */
        .apostila-cover {
          padding: 36px 0 24px;
          margin-bottom: 18px;
        }
        .apostila-cover-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .apostila-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .apostila-logo-letter {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          font-weight: 900;
          font-size: 13pt;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          letter-spacing: -0.02em;
        }
        .apostila-logo-text {
          font-weight: 800;
          font-size: 13pt;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .apostila-logo-sm .apostila-logo-letter { width: 22px; height: 22px; font-size: 10pt; }
        .apostila-logo-sm .apostila-logo-text { font-size: 10pt; }

        .apostila-meta {
          font-size: 9pt;
          color: #71717a;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .apostila-meta-dot { margin: 0 6px; opacity: 0.4; }

        .apostila-subject {
          font-size: 9pt;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #2563eb;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .apostila-title {
          font-size: 26pt;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 22px;
          line-height: 1.1;
          letter-spacing: -0.025em;
        }
        .apostila-cover-divider {
          height: 1px;
          background: #e4e4e7;
          margin: 0 -4px;
        }

        /* ── SEÇÃO ── */
        .apostila-section { margin: 20px 0 28px; }
        .apostila-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9pt;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          padding: 10px 0;
          border-bottom: 2px solid #2563eb;
          margin-bottom: 16px;
          page-break-after: avoid;
        }
        .apostila-section-header-green {
          color: #16a34a;
          border-bottom-color: #16a34a;
        }
        .apostila-section-icon { font-size: 12pt; }

        /* ── PROSE / CORPO DO MATERIAL ── */
        .apostila-prose {
          font-size: 11pt;
          line-height: 1.7;
          color: #18181b;
        }
        .apostila-prose h1 { display: none; }

        .apostila-prose h2 {
          font-size: 13pt;
          font-weight: 800;
          color: #0f172a;
          margin: 22pt 0 8pt;
          padding-bottom: 4pt;
          border-bottom: 1px solid #e4e4e7;
          letter-spacing: -0.01em;
          page-break-after: avoid;
        }
        .apostila-prose-resumo h2 {
          color: #15803d;
          border-bottom-color: #bbf7d0;
        }

        .apostila-prose h3 {
          font-size: 11pt;
          font-weight: 700;
          color: #27272a;
          margin: 14pt 0 4pt;
          page-break-after: avoid;
        }

        .apostila-prose h4 {
          font-size: 8.5pt;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 12pt 0 3pt;
        }

        /* texto */
        .apostila-prose p { margin: 7pt 0; }
        .apostila-prose strong {
          color: #0f172a;
          font-weight: 700;
          background: linear-gradient(180deg, transparent 60%, rgba(250, 204, 21, 0.4) 60%);
          padding: 0 1px;
        }
        .apostila-prose em { color: #52525b; font-style: italic; }

        /* listas */
        .apostila-prose ul, .apostila-prose ol {
          margin: 5pt 0;
          padding-left: 18pt;
        }
        .apostila-prose li {
          margin: 3pt 0;
          line-height: 1.6;
        }
        .apostila-prose ul li::marker { color: #2563eb; }
        .apostila-prose ol li::marker { color: #2563eb; font-weight: 600; }

        /* blockquote — lei/súmula */
        .apostila-prose blockquote {
          margin: 10pt 0;
          padding: 8pt 14pt;
          background: #fafafa;
          border-left: 3px solid #2563eb;
          color: #3f3f46;
          font-size: 10pt;
          page-break-inside: avoid;
        }
        .apostila-prose blockquote p { margin: 3pt 0; }

        /* code inline — Art XX, leis */
        .apostila-prose code {
          background: #f4f4f5;
          color: #1e40af;
          padding: 1pt 5pt;
          border-radius: 3pt;
          font-size: 9.5pt;
          font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
          font-weight: 600;
        }

        /* tabelas — limpas */
        .apostila-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 10pt 0;
          font-size: 9.5pt;
          page-break-inside: avoid;
        }
        .apostila-prose th {
          background: #fafafa;
          color: #18181b;
          padding: 6pt 9pt;
          text-align: left;
          font-weight: 700;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #18181b;
        }
        .apostila-prose td {
          border-bottom: 1px solid #e4e4e7;
          padding: 5pt 9pt;
          vertical-align: top;
        }
        .apostila-prose tr:last-child td { border-bottom: 1.5px solid #18181b; }

        /* hr */
        .apostila-prose hr {
          border: none;
          border-top: 1px dashed #d4d4d8;
          margin: 16pt 0;
        }

        /* ── RODAPÉ MINIMALISTA ── */
        .apostila-footer {
          margin-top: 36px;
          padding-top: 16px;
          border-top: 1px solid #e4e4e7;
        }
        .apostila-footer-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .apostila-footer-left { flex: 1; }
        .apostila-footer-right {
          text-align: right;
          font-size: 8.5pt;
          color: #71717a;
        }
        .apostila-footer-right p { margin: 0; }
        .apostila-footer-tag {
          font-size: 8.5pt;
          color: #71717a;
          margin: 4px 0 0;
        }
        .apostila-footer-id {
          font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
          font-size: 8pt !important;
          color: #a1a1aa !important;
          letter-spacing: 0.05em;
        }
        .apostila-footer-warn {
          font-size: 7.5pt !important;
          color: #a1a1aa !important;
          margin-top: 4px !important;
          font-style: italic;
        }

        /* ── PRINT RULES ── */
        @media print {
          .apostila-watermark { position: fixed !important; }
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
