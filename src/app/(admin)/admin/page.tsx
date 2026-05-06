'use client'

import { useState } from 'react'
import {
  Users, Brain, CheckCircle2, Crown, Lock, Unlock,
  Eye, X, BookOpen, Zap, Target, Database, BarChart3,
  AlertTriangle, Settings
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { DEMO_USERS, CURSOS_DISPONIVEIS, getCourseLabel } from '@/lib/demo-users'
import { CURSOS_DATA } from '@/lib/curso-data'
import { getOverrides, setOverride } from '@/lib/admin-store'
import toast from 'react-hot-toast'

const PLAN_COLOR: Record<string, string> = {
  LIFETIME: 'badge-yellow', PREMIUM: 'badge-blue', BASIC: 'badge-purple', FREE: 'bg-muted text-muted-foreground',
}
const PLAN_LABEL: Record<string, string> = {
  LIFETIME: '♾️ Vitalício', PREMIUM: '⭐ Premium', BASIC: '📘 Básico', FREE: '🆓 Grátis',
}
const COLORS = ['#2563eb', '#9333ea', '#16a34a', '#f59e0b', '#e11d48', '#0891b2', '#7c3aed']

// Calcula estatísticas de conteúdo por curso
function getConteudoStats() {
  return CURSOS_DISPONIVEIS.map((c, i) => {
    const cd = CURSOS_DATA[c.id]
    const materias = cd?.materias.length ?? 0
    const questoesPorMateria = 50 // banco base estimado (IA gera infinitas)
    const flashcardsPorMateria = 30
    const simulados = 3 // mini x3 + 1 real por semana
    return {
      id: c.id,
      label: c.label.split(' — ')[0].replace('Polícia ', 'PC ').replace('Banco do Brasil', 'BB').replace('Caixa Econômica', 'CEF').replace('Concurso Nacional', 'CNU'),
      fullLabel: c.label,
      icon: c.icon,
      materias,
      questoes: materias * questoesPorMateria,
      flashcards: materias * flashcardsPorMateria,
      simulados,
      banca: cd?.banca ?? '—',
      fill: COLORS[i % COLORS.length],
      alunos: DEMO_USERS.filter(u => u.role === 'STUDENT' && (u.courses === 'all' || (u.courses as string[]).includes(c.id))).length,
    }
  })
}

function planDistribution() {
  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  return [
    { name: 'Premium', value: students.filter(u => u.plan === 'PREMIUM').length, fill: '#2563eb' },
    { name: 'Vitalício', value: students.filter(u => u.plan === 'LIFETIME').length, fill: '#f59e0b' },
    { name: 'Básico', value: students.filter(u => u.plan === 'BASIC').length, fill: '#9333ea' },
    { name: 'Grátis', value: students.filter(u => u.plan === 'FREE').length, fill: '#94a3b8' },
  ].filter(d => d.value > 0)
}

export default function AdminPage() {
  const students = DEMO_USERS.filter(u => u.role === 'STUDENT')
  const [overrides, setOverridesState] = useState<Record<string, any>>(() => getOverrides())
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'usuarios' | 'conteudo'>('overview')

  const conteudo = getConteudoStats()
  const totalQuestoes = conteudo.reduce((a, c) => a + c.questoes, 0)
  const totalFlashcards = conteudo.reduce((a, c) => a + c.flashcards, 0)
  const totalMaterias = conteudo.reduce((a, c) => a + c.materias, 0)
  const planData = planDistribution()

  function effectivePlan(u: typeof DEMO_USERS[0]) { return overrides[u.id]?.plan ?? u.plan }
  function isActive(u: typeof DEMO_USERS[0]) { return overrides[u.id]?.active !== false }

  function handleGiveLifetime(u: typeof DEMO_USERS[0]) {
    setOverride(u.id, { plan: 'LIFETIME', active: true })
    setOverridesState(getOverrides())
    toast.success(`✅ Vitalício concedido para ${u.name.split(' — ')[1] ?? u.name.split(' ')[0]}!`)
  }
  function handleToggleActive(u: typeof DEMO_USERS[0]) {
    const active = !isActive(u)
    setOverride(u.id, { active })
    setOverridesState(getOverrides())
    toast.success(active ? 'Usuário reativado!' : 'Usuário suspenso!')
  }

  const SECTIONS = [
    { id: 'overview' as const, label: 'Visão Geral', icon: BarChart3 },
    { id: 'usuarios' as const, label: 'Beta Testers', icon: Users },
    { id: 'conteudo' as const, label: 'Banco de Conteúdo', icon: Database },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1 text-sm">Controle total da plataforma GabaritAI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard" className="btn-outline btn-sm">👁️ Ver como aluno</Link>
          <Link href="/admin/usuarios" className="btn-primary btn-sm">👥 Gerenciar usuários</Link>
        </div>
      </div>

      {/* Nav interna */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSection === s.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── VISÃO GERAL ─── */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* KPIs plataforma */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Beta testers', value: students.length, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
              { label: 'Cursos disponíveis', value: CURSOS_DISPONIVEIS.length, icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Questões no banco', value: `${totalQuestoes.toLocaleString('pt-BR')}+`, icon: Target, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
              { label: 'Flashcards no banco', value: `${totalFlashcards.toLocaleString('pt-BR')}+`, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
              { label: 'Matérias mapeadas', value: totalMaterias, icon: Brain, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Nota sobre geração IA */}
          <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-foreground">Conteúdo infinito via IA. </span>
                <span className="text-muted-foreground">
                  Os números acima são o banco base — a IA (Groq LLaMA 3.3 70B) gera questões, flashcards e simulados novos a cada sessão.
                  Em produção com banco de dados, todos os itens gerados serão salvos e o banco cresce continuamente.
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Alunos por curso */}
            <div className="card p-5">
              <h2 className="font-bold text-foreground mb-4 text-sm">Alunos por curso (beta testers)</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conteudo.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} formatter={(v: number) => [v, 'Alunos']} />
                    <Bar dataKey="alunos" radius={[0, 6, 6, 0]}>
                      {conteudo.slice(0, 8).map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição de planos */}
            <div className="card p-5">
              <h2 className="font-bold text-foreground mb-4 text-sm">Planos dos beta testers</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Links rápidos admin */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/admin/usuarios', icon: Users, label: 'Gerenciar usuários', desc: 'Planos, suspensões, vitalício', color: 'text-brand-500' },
              { href: '/admin/cursos', icon: BookOpen, label: 'Gerenciar cursos', desc: 'Preços, ativar/desativar', color: 'text-purple-500' },
              { href: '/admin/planos', icon: Crown, label: 'Planos e preços', desc: 'Trial, Basic, Premium, Vitalício', color: 'text-yellow-500' },
              { href: '/admin/conteudo', icon: Settings, label: 'Conteúdo do site', desc: 'Hero, depoimentos, estatísticas', color: 'text-success-600' },
            ].map(({ href, icon: Icon, label, desc, color }) => (
              <Link key={href} href={href} className="card p-4 hover:border-brand-400 transition-all">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <div className="font-semibold text-sm text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── BETA TESTERS ─── */}
      {activeSection === 'usuarios' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { l: 'Total', v: students.length, c: 'text-foreground' },
              { l: 'Vitalícios', v: students.filter(u => effectivePlan(u) === 'LIFETIME').length, c: 'text-yellow-500' },
              { l: 'Premium', v: students.filter(u => effectivePlan(u) === 'PREMIUM').length, c: 'text-brand-500' },
              { l: 'Básico', v: students.filter(u => effectivePlan(u) === 'BASIC').length, c: 'text-purple-500' },
              { l: 'Suspensos', v: students.filter(u => !isActive(u)).length, c: 'text-danger-500' },
            ].map(s => (
              <div key={s.l} className="card p-3 text-center">
                <div className={`text-xl font-black ${s.c}`}>{s.v}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Usuário', 'E-mail / Senha', 'Concurso', 'Cursos', 'Plano', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map(u => {
                    const plan = effectivePlan(u)
                    const active = isActive(u)
                    return (
                      <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!active ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="font-medium text-foreground text-xs">{u.name.split(' — ')[1] ?? u.name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                          <div className="text-xs font-mono text-foreground/60 mt-0.5">{u.password}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{u.concursoAlvo}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {u.courses === 'all' ? 'Todos' : `${(u.courses as string[]).length} curso(s)`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`badge text-xs ${PLAN_COLOR[plan]}`}>{PLAN_LABEL[plan]}</span>
                        </td>
                        <td className="py-3 px-4">
                          {active ? <span className="badge-green text-xs">● Ativo</span> : <span className="badge-red text-xs">● Suspenso</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedUser(u)} title="Detalhes" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleGiveLifetime(u)} title="Dar vitalício" className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-muted-foreground hover:text-yellow-500 transition-colors">
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleToggleActive(u)} title={active ? 'Suspender' : 'Reativar'} className={`p-1.5 rounded-lg transition-colors ${active ? 'hover:bg-danger-50 text-muted-foreground hover:text-danger-500' : 'hover:bg-success-50 text-muted-foreground hover:text-success-600'}`}>
                              {active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── BANCO DE CONTEÚDO ─── */}
      {activeSection === 'conteudo' && (
        <div className="space-y-4">
          <div className="card p-4 border-success-200 dark:border-success-800/30 bg-success-50/50 dark:bg-success-900/10">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-foreground">Geração IA infinita. </span>
                <span className="text-muted-foreground">
                  A plataforma usa IA (Groq/LLaMA) para gerar conteúdo específico de cada curso. Os números abaixo representam o banco base
                  estruturado por matéria. Em produção com banco de dados (Supabase), cada questão gerada é salva e o banco cresce automaticamente.
                </span>
              </div>
            </div>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Cursos estruturados', value: CURSOS_DISPONIVEIS.length, icon: BookOpen, color: 'text-brand-500' },
              { label: 'Matérias mapeadas', value: totalMaterias, icon: Brain, color: 'text-purple-500' },
              { label: 'Questões no banco', value: `${totalQuestoes.toLocaleString()}+`, icon: Target, color: 'text-success-600' },
              { label: 'Flashcards no banco', value: `${totalFlashcards.toLocaleString()}+`, icon: Zap, color: 'text-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4 text-center">
                <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Tabela por curso */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm">Conteúdo por curso</h2>
              <span className="text-xs text-muted-foreground">Banco base + IA infinita</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Curso', 'Banca', 'Matérias', 'Questões base', 'Flashcards base', 'Simulados/semana', 'Alunos'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {conteudo.map(c => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CURSOS_DISPONIVEIS.find(cd => cd.id === c.id)?.icon}</span>
                          <div>
                            <div className="text-xs font-medium text-foreground">{c.fullLabel}</div>
                            <Link href={`/dashboard/curso/${c.id}`} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">Ver curso →</Link>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{c.banca}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-foreground">{c.materias}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-success-600">{c.questoes.toLocaleString()}+</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-yellow-500">{c.flashcards.toLocaleString()}+</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-purple-500">3 mini + 1 real</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold ${c.alunos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {c.alunos} {c.alunos === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={2} className="py-3 px-4 text-xs font-bold text-foreground">TOTAL</td>
                    <td className="py-3 px-4 text-xs font-black text-foreground">{totalMaterias}</td>
                    <td className="py-3 px-4 text-xs font-black text-success-600">{totalQuestoes.toLocaleString()}+</td>
                    <td className="py-3 px-4 text-xs font-black text-yellow-500">{totalFlashcards.toLocaleString()}+</td>
                    <td className="py-3 px-4 text-xs font-black text-purple-500">{CURSOS_DISPONIVEIS.length * 4}/semana</td>
                    <td className="py-3 px-4 text-xs font-black text-foreground">{students.length}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card p-4 border-warning-200 dark:border-warning-800/30 bg-warning-50/50 dark:bg-warning-900/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Próximo passo crítico: </span>
                Para os dados dos alunos serem reais e persistentes (progresso, histórico de questões, notas dos simulados),
                é necessário integrar um banco de dados. Recomendado: <strong>Supabase</strong> (gratuito até 500MB).
                Custo: ~2 dias de desenvolvimento.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do usuário */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="card w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="font-black text-foreground">{selectedUser.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-0 mb-5">
              {[
                ['Senha (demo)', selectedUser.password],
                ['Plano atual', PLAN_LABEL[overrides[selectedUser.id]?.plan ?? selectedUser.plan]],
                ['Concurso alvo', selectedUser.concursoAlvo],
                ['Nível', selectedUser.nivel],
                ['Horas/dia', `${selectedUser.horasDia}h por dia`],
                ['Beta Tester', selectedUser.isBetaTester ? `✅ Sim — código: ${selectedUser.betaAccessCode}` : 'Não'],
                ['Cursos', selectedUser.courses === 'all' ? 'Todos os cursos' : (selectedUser.courses as string[]).map(c => getCourseLabel(c)).join(', ')],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-2 border-b border-border last:border-0 gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">{l}</span>
                  <span className="text-sm font-medium text-foreground text-right">{v}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-sm text-muted-foreground mb-1">Meta pessoal</div>
                <p className="text-sm bg-muted/50 p-3 rounded-xl italic text-foreground">"{selectedUser.meta}"</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { handleGiveLifetime(selectedUser); setSelectedUser(null) }} className="btn-primary btn-md">
                <Crown className="w-4 h-4" /> Dar vitalício
              </button>
              <button onClick={() => { handleToggleActive(selectedUser); setSelectedUser(null) }}
                className={isActive(selectedUser) ? 'btn-danger btn-md' : 'btn-outline btn-md'}>
                {isActive(selectedUser) ? <><Lock className="w-4 h-4" /> Suspender</> : <><Unlock className="w-4 h-4" /> Reativar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
