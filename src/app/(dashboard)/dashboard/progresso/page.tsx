'use client'

import { TrendingUp, Target, Clock, Flame, BookOpen, Zap, Award } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

const performanceData = [
  { semana: 'S1', acerto: 55 }, { semana: 'S2', acerto: 61 }, { semana: 'S3', acerto: 58 },
  { semana: 'S4', acerto: 67 }, { semana: 'S5', acerto: 72 }, { semana: 'S6', acerto: 78 },
]

const materias = [
  { subject: 'Dir. Const.', A: 82 },
  { subject: 'Dir. Penal', A: 65 },
  { subject: 'Dir. Admin.', A: 71 },
  { subject: 'Matemática', A: 48 },
  { subject: 'Português', A: 74 },
  { subject: 'Conhec. Pol.', A: 38 },
]

const EDITAL = [
  { materia: 'Direito Constitucional', topicos: 12, concluidos: 10, acerto: 82 },
  { materia: 'Direito Penal', topicos: 10, concluidos: 7, acerto: 65 },
  { materia: 'Direito Administrativo', topicos: 8, concluidos: 6, acerto: 71 },
  { materia: 'Conhecimentos Policiais', topicos: 6, concluidos: 2, acerto: 38 },
  { materia: 'Matemática e Lógica', topicos: 7, concluidos: 3, acerto: 48 },
  { materia: 'Língua Portuguesa', topicos: 5, concluidos: 4, acerto: 74 },
]

export default function ProgressoPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Meu Progresso</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Análise completa do seu desempenho</p>
      </div>

      {/* Stats resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sequência', value: '12 dias', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Total estudado', value: '84h', icon: Clock, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Questões feitas', value: '1.847', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Flashcards revisados', value: '432', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-xl font-black text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolução da taxa de acerto */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Evolução da taxa de acerto</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Acerto']} />
                <Area type="monotone" dataKey="acerto" stroke="#2563eb" strokeWidth={2.5} fill="url(#progGrad)" dot={{ fill: '#2563eb', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar por matéria */}
        <div className="card p-5">
          <h2 className="font-bold text-foreground mb-4">Desempenho por matéria</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={materias}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Acerto" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Edital verticalizado */}
      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-1">Edital verticalizado — PMDF</h2>
        <p className="text-xs text-muted-foreground mb-4">Clique em uma matéria para ver os tópicos detalhados</p>
        <div className="space-y-4">
          {EDITAL.map(e => (
            <div key={e.materia}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{e.materia}</span>
                  <span className="text-xs text-muted-foreground">{e.concluidos}/{e.topicos} tópicos</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${e.acerto >= 75 ? 'text-success-600' : e.acerto >= 60 ? 'text-warning-500' : 'text-danger-500'}`}>{e.acerto}% acerto</span>
                  <span className="text-xs text-muted-foreground">{Math.round((e.concluidos / e.topicos) * 100)}% do edital</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${e.acerto >= 75 ? 'bg-success-500' : e.acerto >= 60 ? 'bg-warning-500' : 'bg-danger-500'}`}
                  style={{ width: `${(e.concluidos / e.topicos) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
