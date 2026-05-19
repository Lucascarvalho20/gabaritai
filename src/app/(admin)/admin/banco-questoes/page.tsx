'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Database, Upload, AlertTriangle, FileText, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Stats = {
  totals: { OFFICIAL: number; AI_GENERATED: number; ADAPTED: number }
  byBanca: Array<{ bancaSlug: string; source: string; count: number }>
  bySubject: Array<{ subjectId: string; subjectName: string; subjectSlug: string; source: string; count: number }>
  byYearBanca: Array<{ ano: number; bancaSlug: string; count: number }>
}

export default function BancoQuestoesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/content/questions-stats').then(({ data }) => setStats(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!stats) return <div className="text-muted-foreground p-8 text-center">Sem dados</div>

  const totalQ = stats.totals.OFFICIAL + stats.totals.AI_GENERATED + stats.totals.ADAPTED
  const matriz: Map<string, Map<number, number>> = new Map()
  for (const yb of stats.byYearBanca) {
    if (!matriz.has(yb.bancaSlug)) matriz.set(yb.bancaSlug, new Map())
    matriz.get(yb.bancaSlug)!.set(yb.ano, (matriz.get(yb.bancaSlug)!.get(yb.ano) ?? 0) + yb.count)
  }
  const bancas = Array.from(matriz.keys()).sort()
  const anos: number[] = []
  for (const b of matriz.values()) for (const y of b.keys()) if (!anos.includes(y)) anos.push(y)
  anos.sort()

  // Top buracos: matérias com 0 questões oficiais
  const bySubjectOfficial = new Map<string, number>()
  for (const s of stats.bySubject) {
    if (s.source === 'OFFICIAL') {
      bySubjectOfficial.set(s.subjectId, (bySubjectOfficial.get(s.subjectId) ?? 0) + s.count)
    }
  }
  const allSubjectIds = Array.from(new Set(stats.bySubject.map((s) => s.subjectId)))
  const buracos = allSubjectIds
    .map((id) => {
      const s = stats.bySubject.find((x) => x.subjectId === id)!
      return { ...s, officialCount: bySubjectOfficial.get(id) ?? 0 }
    })
    .filter((s) => s.officialCount === 0)

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-500" /> Banco de questões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cobertura atual do banco. Onde tá faltando, importe provas oficiais.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/conteudo/importar-pdf" className="rounded-xl bg-purple-500 text-white px-3 py-2 text-xs font-bold inline-flex items-center gap-1">
            <Upload className="w-3 h-3" /> Upload PDF
          </Link>
          <Link href="/admin/conteudo/importar-lote" className="rounded-xl border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-bold inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Importar lote
          </Link>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total no banco" value={totalQ.toLocaleString('pt-BR')} color="text-brand-500" />
        <StatBox label="Oficiais" value={stats.totals.OFFICIAL.toLocaleString('pt-BR')} color="text-green-500" />
        <StatBox label="IA-Geradas" value={stats.totals.AI_GENERATED.toLocaleString('pt-BR')} color="text-purple-500" />
        <StatBox label="Adaptadas" value={stats.totals.ADAPTED.toLocaleString('pt-BR')} color="text-blue-500" />
      </div>

      {/* Matriz Banca × Ano */}
      {bancas.length > 0 && (
        <div className="card p-4">
          <h2 className="font-bold text-sm mb-3">Cobertura por banca × ano (só OFICIAIS)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3">Banca</th>
                  {anos.map((a) => <th key={a} className="text-center px-1">{a}</th>)}
                  <th className="text-right pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {bancas.map((b) => {
                  const row = matriz.get(b)!
                  const total = Array.from(row.values()).reduce((s, v) => s + v, 0)
                  return (
                    <tr key={b} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-bold uppercase">{b}</td>
                      {anos.map((a) => {
                        const v = row.get(a) ?? 0
                        return (
                          <td key={a} className={cn('text-center px-1', v === 0 ? 'text-muted-foreground/40' : v > 50 ? 'text-green-600 font-bold' : 'text-foreground')}>
                            {v || '—'}
                          </td>
                        )
                      })}
                      <td className="text-right pl-2 font-bold">{total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buracos: matérias com 0 oficiais */}
      {buracos.length > 0 && (
        <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300">
          <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-4 h-4" /> Matérias sem questões oficiais ({buracos.length})
          </h2>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
            Estas matérias dependem 100% de IA. Importe provas oficiais quando possível pra economizar IA e melhorar qualidade.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-xs">
            {buracos.slice(0, 15).map((b) => (
              <div key={b.subjectId} className="p-2 rounded border border-yellow-300 bg-white dark:bg-card">
                <span className="font-bold">{b.subjectName}</span>
              </div>
            ))}
          </div>
          {buracos.length > 15 && (
            <div className="text-xs mt-2 text-yellow-700 dark:text-yellow-300">...e mais {buracos.length - 15}</div>
          )}
        </div>
      )}

      {/* Dicas */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-300">
        <h2 className="font-bold text-sm mb-2 text-blue-800 dark:text-blue-200">💡 Onde achar provas oficiais (PDFs grátis)</h2>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-5">
          <li><strong>Cebraspe</strong>: https://www.cebraspe.org.br/concursos/encerrado → busca o concurso → "Provas e gabaritos"</li>
          <li><strong>FGV Conhecimento</strong>: https://conhecimento.fgv.br/concursos/encerrados</li>
          <li><strong>FCC</strong>: https://www.concursosfcc.com.br/concursos/index.html</li>
          <li><strong>VUNESP</strong>: https://www.vunesp.com.br/concursos-encerrados</li>
          <li><strong>QConcursos (free)</strong>: https://www.qconcursos.com/questoes-de-concursos/provas</li>
        </ul>
        <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-2 italic">
          Baixa o PDF → usa "Upload PDF" → IA extrai 100+ questões em ~2 min com Gemini grátis.
        </p>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-black mt-1', color)}>{value}</div>
    </div>
  )
}
