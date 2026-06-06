'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '@/lib/api'

type Material = {
  id: string
  title: string
  content: string
}
type Resumo = {
  id: string
  resumo: string
}
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
 * Página de impressão do material. Auto-trigga window.print().
 * Aluno escolhe "Salvar como PDF" no diálogo do navegador.
 *
 * Query params:
 *   ?modo=completo  → imprime só o conteúdo
 *   ?modo=resumo    → imprime só o resumo
 *   (default)       → imprime ambos
 */
export default function MaterialImprimirPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const searchParams = useSearchParams()
  const modo = searchParams.get('modo') ?? 'ambos'
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    api
      .get(`/me/materials/topic/${topicId}`)
      .then(({ data }) => {
        setData(data)
        setTimeout(() => window.print(), 800)
      })
      .catch(() => {})
  }, [topicId])

  if (!data) return <div className="p-8 text-center text-sm text-gray-500">Preparando para impressão…</div>

  const { topic, material, resumo } = data
  const showCompleto = (modo === 'completo' || modo === 'ambos') && material
  const showResumo = (modo === 'resumo' || modo === 'ambos') && resumo
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 18mm 14mm 20mm 14mm;
        }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          a { color: #1d4ed8; text-decoration: none; }
          a[href]:after { content: none !important; }
        }
        body { background: white; color: #111; }
      `}</style>

      <div className="material-print max-w-[800px] mx-auto px-6 py-6" style={{ color: '#111', background: '#fff', fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {/* HEADER */}
        <header style={{ borderBottom: '3px solid #2563eb', paddingBottom: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563eb', fontWeight: 700, margin: 0 }}>
                GabaritAI · Material de estudo
              </p>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: '#0f172a' }}>
                {topic.name}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#475569' }}>
                {topic.subject.name}
              </p>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right' }}>
              Gerado em {hoje}<br />
              gabaritai.com.br
            </div>
          </div>
        </header>

        {showCompleto && (
          <section>
            <h2 style={{ fontSize: 16, color: '#2563eb', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, marginBottom: 12 }}>
              ▸ Conteúdo completo
            </h2>
            <article className="prose-print">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{material!.content}</ReactMarkdown>
            </article>
          </section>
        )}

        {showResumo && showCompleto && <div className="page-break" />}

        {showResumo && (
          <section>
            <h2 style={{ fontSize: 16, color: '#10b981', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, marginBottom: 12 }}>
              ▸ Resumo rápido
            </h2>
            <article className="prose-print">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{resumo!.resumo}</ReactMarkdown>
            </article>
          </section>
        )}

        <footer style={{ marginTop: 30, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 10, color: '#64748b', textAlign: 'center' }}>
          GabaritAI — Mentoria de estudos para concursos públicos · gabaritai.com.br
        </footer>
      </div>

      <style jsx global>{`
        .prose-print { font-size: 12.5pt; line-height: 1.55; color: #1e293b; }
        .prose-print h1 { font-size: 18pt; color: #0f172a; margin: 16pt 0 8pt; font-weight: 800; }
        .prose-print h2 { font-size: 14pt; color: #1e3a8a; margin: 14pt 0 6pt; font-weight: 700; border-left: 4px solid #2563eb; padding-left: 10px; }
        .prose-print h3 { font-size: 12pt; color: #0f172a; margin: 10pt 0 4pt; font-weight: 700; }
        .prose-print p { margin: 6pt 0; }
        .prose-print ul, .prose-print ol { margin: 6pt 0; padding-left: 22pt; }
        .prose-print li { margin: 3pt 0; }
        .prose-print blockquote {
          margin: 10pt 0;
          padding: 8pt 12pt;
          border-left: 4px solid #f59e0b;
          background: #fffbeb;
          color: #78350f;
          font-style: italic;
          page-break-inside: avoid;
        }
        .prose-print code {
          background: #f1f5f9;
          padding: 1pt 4pt;
          border-radius: 3pt;
          font-size: 10.5pt;
          font-family: 'SF Mono', Menlo, monospace;
        }
        .prose-print table {
          width: 100%;
          border-collapse: collapse;
          margin: 8pt 0;
          font-size: 10.5pt;
          page-break-inside: avoid;
        }
        .prose-print th {
          background: #2563eb;
          color: white;
          padding: 6pt 8pt;
          text-align: left;
          font-weight: 700;
        }
        .prose-print td {
          border: 1px solid #cbd5e1;
          padding: 5pt 8pt;
        }
        .prose-print tr:nth-child(even) td { background: #f8fafc; }
        .prose-print strong { color: #0f172a; font-weight: 700; }
        .prose-print hr { border: none; border-top: 1px dashed #cbd5e1; margin: 16pt 0; }
        @media print {
          .prose-print h1, .prose-print h2, .prose-print h3 { page-break-after: avoid; }
          .prose-print blockquote, .prose-print table { page-break-inside: avoid; }
        }
      `}</style>
    </>
  )
}
