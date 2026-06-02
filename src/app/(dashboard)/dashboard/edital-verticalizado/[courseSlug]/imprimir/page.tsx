'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'

type Edital = {
  id: string
  ano: number
  titulo: string
  banca: string | null
  bancaSlug: string | null
  dataProva: string | null
  totalQuestoes: number | null
  duracaoMin: number | null
  vagas: number | null
  examFormat: string | null
  hasRedacao: boolean
  isActive: boolean
}

type Materia = {
  subjectId: string
  subjectSlug: string
  subjectName: string
  weight: number
  expectedQuestions: number
  programaTopicos: string[]
}

export default function EditalVerticalizadoImprimirPage() {
  const params = useParams<{ courseSlug: string }>()
  const [data, setData] = useState<{
    course: { slug: string; name: string; cargo: string | null; orgao: string | null }
    edital: Edital | null
    materias: Materia[]
    analiseEstrategica?: string | null
  } | null>(null)

  useEffect(() => {
    api.get(`/edital-verticalizado/${params.courseSlug}`)
      .then(({ data }) => {
        setData(data)
        setTimeout(() => window.print(), 600)
      })
      .catch(() => {})
  }, [params.courseSlug])

  if (!data) return null
  const totalPeso = data.materias.reduce((s, m) => s + m.weight, 0)

  return (
    <div className="print-root">
      <style jsx global>{`
        @media print {
          body { background: white; color: black; }
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; max-width: 100% !important; }
          .materia-block { break-inside: avoid; }
        }
        .print-root {
          padding: 32px;
          max-width: 820px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #111;
          background: white;
        }
        .print-root h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
        .print-root h2 { font-size: 16px; font-weight: 700; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
        .print-root h3 { font-size: 14px; font-weight: 700; margin: 12px 0 6px; }
        .print-root p, .print-root li { font-size: 12px; line-height: 1.5; margin: 4px 0; }
        .print-root .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; }
        .print-root .meta-item { font-size: 11px; }
        .print-root .meta-label { color: #6b7280; text-transform: uppercase; font-weight: 700; font-size: 9px; letter-spacing: 0.5px; }
        .print-root .meta-value { font-weight: 700; margin-top: 2px; font-size: 12px; }
        .print-root .materia-block { padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 8px 0; }
        .print-root .materia-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .print-root .materia-name { font-weight: 700; font-size: 14px; }
        .print-root .materia-stats { font-size: 10px; color: #6b7280; }
        .print-root .programa-list { margin-top: 6px; padding-left: 16px; }
        .print-root .programa-list li { font-size: 11px; }
        .print-root .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <button onClick={() => window.print()} style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          🖨️ Imprimir / Salvar como PDF
        </button>
      </div>

      <h1>Edital Verticalizado · {data.course.name}{data.course.cargo ? ` — ${data.course.cargo}` : ''}</h1>
      <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>
        Gerado em {new Date().toLocaleDateString('pt-BR')} pelo Gabaritai · gabaritai.com.br
      </p>

      {data.edital && (
        <>
          <h2>Informações do Edital</h2>
          <p style={{ fontWeight: 700, fontSize: 13 }}>{data.edital.titulo}</p>
          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-label">Banca</div>
              <div className="meta-value">{data.edital.banca ?? '—'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Ano</div>
              <div className="meta-value">{data.edital.ano}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Vagas</div>
              <div className="meta-value">{data.edital.vagas ?? '—'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Total Questões</div>
              <div className="meta-value">{data.edital.totalQuestoes ?? '—'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Duração</div>
              <div className="meta-value">{data.edital.duracaoMin ? `${data.edital.duracaoMin} min` : '—'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Formato</div>
              <div className="meta-value">{data.edital.examFormat ?? '—'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Redação</div>
              <div className="meta-value">{data.edital.hasRedacao ? 'Sim' : 'Não'}</div>
            </div>
            {data.edital.dataProva && (
              <div className="meta-item">
                <div className="meta-label">Data Prova</div>
                <div className="meta-value">{new Date(data.edital.dataProva).toLocaleDateString('pt-BR')}</div>
              </div>
            )}
          </div>
        </>
      )}

      <h2>Matérias por Peso ({data.materias.length})</h2>
      {data.materias.map((m, idx) => {
        const peso = Math.round((m.weight / totalPeso) * 100)
        return (
          <div key={m.subjectId} className="materia-block">
            <div className="materia-head">
              <div>
                <span className="materia-name">{idx + 1}. {m.subjectName}</span>
              </div>
              <div className="materia-stats">
                Peso {m.weight} · ≈ {peso}% da prova · {m.expectedQuestions} questões esperadas
              </div>
            </div>
            {m.programaTopicos.length > 0 && (
              <>
                <h3 style={{ margin: '6px 0 4px' }}>Assuntos cobrados:</h3>
                <ul className="programa-list">
                  {m.programaTopicos.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )
      })}

      {data.analiseEstrategica && (
        <>
          <h2>Análise Estratégica</h2>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6 }}>{data.analiseEstrategica}</div>
        </>
      )}

      <div className="footer">
        Gabaritai · gabaritai.com.br · Sua plataforma de preparação para concursos
      </div>
    </div>
  )
}
