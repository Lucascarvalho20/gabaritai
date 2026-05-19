'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Loader2, TrendingUp, BookOpen, Wrench, Trophy, Brain, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Insights = {
  period: string
  paymentsByPlan: Array<{ planSlug: string; courseSlug: string | null; sales: number; revenue: number }>
  cursosMaisEstudados: Array<{ slug: string; name: string; cargo: string | null; sessions: number; minutes: number }>
  materiasMaisEstudadas: Array<{ name: string; slug: string; sessions: number; minutes: number }>
  topicosMaisEstudados: Array<{ name: string; subjectName: string; sessions: number }>
  ferramentasUsadas: Array<{ feature: string; count: number }>
  topAlunos: Array<{ name: string; course: string; sessions: number }>
  cacheStats: { totalEntries: number; byKind: Array<{ kind: string; entries: number; totalHits: number; avgHitsPerEntry: number }> }
  topConsumidoresIA: Array<{ name: string; email: string; totalRequests: number }>
}

const FEATURE_LABEL: Record<string, string> = {
  questao_oficial: '📄 Questões oficiais',
  questao_ia: '🤖 Questões IA',
  flashcard: '⚡ Flashcards',
  simulado_real: '🎯 Simulado real',
  simulado_mini: '🎯 Mini-simulado',
  mentor: '🧠 Mentor IA',
  resumo: '📚 Resumos',
  mapa_mental: '🗺 Mapas mentais',
  redacao: '✍️ Redação',
  sessao: '📖 Sessão do cronograma',
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/insights').then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  if (!data) return <div className="text-center text-muted-foreground py-20">Erro ao carregar</div>

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-500" /> Insights do negócio
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{data.period}</p>
      </div>

      {/* Vendas por plano */}
      <Section title="💰 Cursos mais vendidos" icon={TrendingUp}>
        {data.paymentsByPlan.length === 0 ? <Empty msg="Nenhuma venda ainda" /> : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2">Plano</th><th>Curso</th><th>Vendas</th><th>Receita</th>
            </tr></thead>
            <tbody>
              {data.paymentsByPlan.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 font-bold">{p.planSlug}</td>
                  <td>{p.courseSlug ?? '—'}</td>
                  <td>{p.sales}</td>
                  <td>R$ {p.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Cursos + matérias mais estudados (grid 2 colunas) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="🎓 Cursos mais estudados (30d)" icon={BookOpen}>
          {data.cursosMaisEstudados.length === 0 ? <Empty msg="Sem dados ainda" /> : (
            <ul className="space-y-1.5 text-xs">
              {data.cursosMaisEstudados.map((c, i) => (
                <li key={i} className="flex justify-between p-2 rounded border border-border">
                  <span className="truncate">{c.name}{c.cargo ? ` · ${c.cargo}` : ''}</span>
                  <span className="font-mono">{c.sessions} sessões · {Math.round(c.minutes / 60)}h</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="📚 Matérias mais estudadas (30d)" icon={BookOpen}>
          {data.materiasMaisEstudadas.length === 0 ? <Empty msg="Sem dados ainda" /> : (
            <ul className="space-y-1.5 text-xs">
              {data.materiasMaisEstudadas.map((m, i) => (
                <li key={i} className="flex justify-between p-2 rounded border border-border">
                  <span className="truncate">{m.name}</span>
                  <span className="font-mono">{m.sessions} sessões</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Tópicos */}
      <Section title="🎯 Tópicos mais estudados (30d)" icon={BookOpen}>
        {data.topicosMaisEstudados.length === 0 ? <Empty msg="Sem dados — popule Topics primeiro" /> : (
          <ul className="space-y-1.5 text-xs">
            {data.topicosMaisEstudados.map((t, i) => (
              <li key={i} className="flex justify-between p-2 rounded border border-border">
                <span className="truncate">{t.subjectName} → <strong>{t.name}</strong></span>
                <span className="font-mono">{t.sessions} sessões</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Ferramentas */}
      <Section title="🔧 Ferramentas mais usadas (7d)" icon={Wrench}>
        {data.ferramentasUsadas.length === 0 ? <Empty msg="Sem dados ainda" /> : (
          <div className="space-y-2">
            {data.ferramentasUsadas.map((f, i) => {
              const max = data.ferramentasUsadas[0].count
              const pct = (f.count / max) * 100
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold">{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                    <span className="text-muted-foreground">{f.count} usos</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Top alunos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="🏆 Top alunos (mais sessões concluídas)" icon={Trophy}>
          {data.topAlunos.length === 0 ? <Empty msg="Sem dados ainda" /> : (
            <ul className="space-y-1.5 text-xs">
              {data.topAlunos.map((a, i) => (
                <li key={i} className="flex justify-between p-2 rounded border border-border">
                  <span className="truncate">
                    <span className="font-bold mr-2">#{i + 1}</span>
                    {a.name}
                    <span className="text-muted-foreground ml-1">· {a.course}</span>
                  </span>
                  <span className="font-mono">{a.sessions} sessões</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="🤖 Top consumidores de IA (30d)" icon={Brain}>
          {data.topConsumidoresIA.length === 0 ? <Empty msg="Sem dados ainda" /> : (
            <ul className="space-y-1.5 text-xs">
              {data.topConsumidoresIA.map((u, i) => (
                <li key={i} className="flex justify-between p-2 rounded border border-border">
                  <span className="truncate">{u.name}</span>
                  <span className={cn('font-mono', u.totalRequests > 100 && 'text-red-500')}>
                    {u.totalRequests} req
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Cache stats */}
      <Section title="💾 Cache de IA (reuso entre alunos)" icon={Brain}>
        <div className="text-xs text-muted-foreground mb-2">
          <strong>{data.cacheStats.totalEntries}</strong> entradas no cache. Cada hit = economia de IA.
        </div>
        {data.cacheStats.byKind.length === 0 ? <Empty msg="Cache vazio" /> : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2">Tipo</th><th>Entradas</th><th>Hits</th><th>Avg/entrada</th>
            </tr></thead>
            <tbody>
              {data.cacheStats.byKind.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 font-bold">{c.kind}</td>
                  <td>{c.entries}</td>
                  <td className="text-green-600 font-bold">{c.totalHits}</td>
                  <td>{c.avgHitsPerEntry}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><Icon className="w-4 h-4 text-brand-500" /> {title}</h2>
      {children}
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-xs text-muted-foreground italic py-3 text-center">{msg}</p>
}
