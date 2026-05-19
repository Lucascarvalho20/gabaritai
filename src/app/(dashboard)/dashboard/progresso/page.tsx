'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2, Trophy, Target, Zap, Clock, CheckCircle2, XCircle, MinusCircle, BarChart3, FileText, Bot } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'

type Progresso = {
  overview: { totalAttempts: number; correctAttempts: number; accuracy: number; totalFlashcards: number; flashcardsAReviewHoje: number; totalHoras: number; totalSimulados: number; mediaNotaSimulados: number }
  byOrigin: Record<'OFFICIAL' | 'AI_GENERATED' | 'ADAPTED', { total: number; correct: number }>
  series14d: Array<{ day: string; label: string; total: number; correct: number }>
  masteries: Array<{ subjectId: string; subjectName: string; courseName: string; courseSlug: string; masteryScore: number; totalAttempts: number; correctAttempts: number; horasEstudadas: number }>
  exams: Array<{ id: string; title: string; type: string; score: number; acertos: number; erros: number; brancos: number; total: number; finishedAt: string; bancaSlug: string | null }>
  flashcardStats: { total: number; faceis: number; ok: number; dificeis: number; aReviewHoje: number }
  cursos: Array<{ id: string; slug: string; name: string; cargo: string | null }>
}

export default function ProgressoPage() {
  const [data, setData] = useState<Progresso | null>(null)
  const [loading, setLoading] = useState(true)
  const [courseSlug, setCourseSlug] = useState<string>('')

  useEffect(() => {
    const url = courseSlug ? `/me/progresso?courseSlug=${courseSlug}` : '/me/progresso'
    api.get(url).then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [courseSlug])

  if (loading || !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  const o = data.overview

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-500" /> Meu progresso
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">Dados reais e atualizados do seu desempenho.</p>
        </div>
        {data.cursos.length > 1 && (
          <select value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            <option value="">Todos os cursos</option>
            {data.cursos.map((c) => (<option key={c.slug} value={c.slug}>{c.name}{c.cargo ? ` · ${c.cargo}` : ''}</option>))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Target} label="Questões respondidas" value={o.totalAttempts} sub={`${o.correctAttempts} corretas`} color="text-blue-500" />
        <Stat icon={CheckCircle2} label="Taxa de acerto" value={`${o.accuracy}%`} sub={o.totalAttempts > 0 ? 'média geral' : 'sem dados'} color="text-green-500" />
        <Stat icon={Zap} label="Flashcards" value={o.totalFlashcards} sub={`${o.flashcardsAReviewHoje} hoje`} color="text-yellow-500" />
        <Stat icon={Trophy} label="Simulados feitos" value={o.totalSimulados} sub={`média: ${o.mediaNotaSimulados}/10`} color="text-purple-500" />
        <Stat icon={Clock} label="Horas estudadas" value={`${o.totalHoras}h`} sub="acumulado" color="text-orange-500" />
        <Stat icon={FileText} label="Questões oficiais" value={data.byOrigin.OFFICIAL.total} sub={`${data.byOrigin.OFFICIAL.correct} corretas`} color="text-emerald-500" />
        <Stat icon={Bot} label="Questões IA" value={data.byOrigin.AI_GENERATED.total} sub={`${data.byOrigin.AI_GENERATED.correct} corretas`} color="text-pink-500" />
        <Stat icon={BarChart3} label="% oficiais" value={`${Math.round((data.byOrigin.OFFICIAL.total / Math.max(1, o.totalAttempts)) * 100)}%`} sub="do total" color="text-brand-500" />
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-sm mb-3">Atividade últimos 14 dias</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.series14d}>
            <defs>
              <linearGradient id="totGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="corGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Area type="monotone" dataKey="total" stroke="rgb(99 102 241)" fillOpacity={1} fill="url(#totGrad)" name="Total" />
            <Area type="monotone" dataKey="correct" stroke="rgb(34 197 94)" fillOpacity={1} fill="url(#corGrad)" name="Corretas" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.masteries.length > 0 && (
        <div className="card p-4">
          <h2 className="font-bold text-sm mb-3">Desempenho por matéria</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, data.masteries.length * 32)}>
            <BarChart data={data.masteries} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} className="text-xs" />
              <YAxis type="category" dataKey="subjectName" className="text-xs" width={150} />
              <Tooltip />
              <Bar dataKey="masteryScore" fill="rgb(99 102 241)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.flashcardStats.total > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card p-4">
            <h2 className="font-bold text-sm mb-3">Flashcards · SRS</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <FcBox icon={CheckCircle2} label="Fáceis" value={data.flashcardStats.faceis} color="text-green-500 bg-green-50 dark:bg-green-900/20" />
              <FcBox icon={MinusCircle} label="Ok" value={data.flashcardStats.ok} color="text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" />
              <FcBox icon={XCircle} label="Difíceis" value={data.flashcardStats.dificeis} color="text-red-500 bg-red-50 dark:bg-red-900/20" />
            </div>
            <div className="mt-3 text-xs text-center">
              <strong>{data.flashcardStats.aReviewHoje}</strong> pra revisar hoje
            </div>
          </div>
          <div className="card p-4">
            <h2 className="font-bold text-sm mb-3">Origem das questões</h2>
            <div className="space-y-2 text-xs">
              {Object.entries(data.byOrigin).map(([k, v]) => {
                const pct = o.totalAttempts > 0 ? (v.total / o.totalAttempts) * 100 : 0
                return (
                  <div key={k}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{k === 'OFFICIAL' ? '📄 Oficiais' : k === 'AI_GENERATED' ? '🤖 IA' : '🔄 Adaptadas'}</span>
                      <span className="text-muted-foreground">{v.total}q · {v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0}% acerto</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn(
                        'h-full transition-all',
                        k === 'OFFICIAL' ? 'bg-green-500' : k === 'AI_GENERATED' ? 'bg-pink-500' : 'bg-purple-500',
                      )} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {data.exams.length > 0 && (
        <div className="card p-4">
          <h2 className="font-bold text-sm mb-3">Histórico de simulados (últimos 20)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Simulado</th>
                  <th>Tipo</th>
                  <th>Banca</th>
                  <th>Nota</th>
                  <th>✓/✗/—</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.exams.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2 truncate max-w-xs">{e.title}</td>
                    <td><span className={cn('badge text-[9px]', e.type === 'REAL' ? 'badge-red' : 'badge-blue')}>{e.type}</span></td>
                    <td className="font-mono uppercase text-[10px]">{e.bancaSlug ?? '—'}</td>
                    <td className="font-bold">{e.score}/10</td>
                    <td>{e.acertos}/{e.erros}/{e.brancos}</td>
                    <td className="text-muted-foreground">{new Date(e.finishedAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub: string; color: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-4 h-4', color)} />
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate">{label}</span>
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function FcBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className={cn('p-2 rounded-lg', color)}>
      <Icon className="w-4 h-4 mx-auto mb-1" />
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px]">{label}</div>
    </div>
  )
}
