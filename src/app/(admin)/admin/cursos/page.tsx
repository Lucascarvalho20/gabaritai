'use client'

import { useState } from 'react'
import { CURSOS_DISPONIVEIS, DEMO_USERS } from '@/lib/demo-users'
import { BookOpen, Users, DollarSign, Edit2, ToggleLeft, ToggleRight, Plus, TrendingUp, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CourseData {
  id: string
  label: string
  categoria: string
  icon: string
  ativo: boolean
  precoMensal: number
  precoAnual: number
  alunos: number
  taxaAcertoMedia: number
}

function countAlunos(courseId: string): number {
  return DEMO_USERS.filter(u =>
    u.role === 'STUDENT' && (u.courses === 'all' || (u.courses as string[]).includes(courseId))
  ).length
}

const initialCourses: CourseData[] = CURSOS_DISPONIVEIS.map(c => ({
  ...c,
  ativo: true,
  precoMensal: c.categoria === 'policial' ? 89 : c.categoria === 'banco' ? 69 : c.categoria === 'militar' ? 89 : 79,
  precoAnual: c.categoria === 'policial' ? 790 : c.categoria === 'banco' ? 590 : c.categoria === 'militar' ? 790 : 690,
  alunos: countAlunos(c.id),
  taxaAcertoMedia: Math.floor(Math.random() * 20) + 60,
}))

const CATEGORIA_LABEL: Record<string, string> = {
  policial: '🛡️ Carreiras Policiais',
  militar: '🚒 Carreiras Militares',
  banco: '🏦 Bancos Públicos',
  judiciario: '⚖️ Poder Judiciário',
  federal: '🇧🇷 Federal (CNU)',
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<CourseData[]>(initialCourses)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ mensal: string; anual: string }>({ mensal: '', anual: '' })
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showNovoCurso, setShowNovoCurso] = useState(false)
  const [novoCurso, setNovoCurso] = useState({ label: '', categoria: 'policial', icon: '📋', precoMensal: '79', precoAnual: '690' })

  const categorias = [...new Set(courses.map(c => c.categoria))]
  const totalAlunos = courses.reduce((acc, c) => acc + c.alunos, 0)
  const totalAtivos = courses.filter(c => c.ativo).length
  const receitaMensal = courses.filter(c => c.ativo).reduce((acc, c) => acc + c.alunos * c.precoMensal, 0)

  function startEdit(c: CourseData) {
    setEditingId(c.id)
    setEditValues({ mensal: String(c.precoMensal), anual: String(c.precoAnual) })
  }

  function saveEdit(id: string) {
    setCourses(prev => prev.map(c => c.id === id ? {
      ...c,
      precoMensal: Number(editValues.mensal) || c.precoMensal,
      precoAnual: Number(editValues.anual) || c.precoAnual,
    } : c))
    setEditingId(null)
    setSavedId(id)
    setTimeout(() => setSavedId(null), 2000)
  }

  function toggleAtivo(id: string) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gerenciar Cursos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Controle preços, disponibilidade e visualize alunos por curso</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setShowNovoCurso(true)}>
          <Plus className="w-3.5 h-3.5" /> Novo curso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cursos ativos', value: totalAtivos, icon: BookOpen, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Total de alunos', value: totalAlunos, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Receita estimada/mês', value: `R$ ${receitaMensal.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
          { label: 'Total de cursos', value: courses.length, icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
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

      {/* Cursos por categoria */}
      {categorias.map(cat => {
        const catCourses = courses.filter(c => c.categoria === cat)
        return (
          <div key={cat} className="card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm">{CATEGORIA_LABEL[cat]}</h2>
              <span className="text-xs text-muted-foreground">{catCourses.filter(c => c.ativo).length}/{catCourses.length} ativos</span>
            </div>
            <div className="divide-y divide-border">
              {catCourses.map(course => (
                <div key={course.id} className={cn('px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors', !course.ativo && 'opacity-50')}>
                  {/* Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{course.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm">{course.label}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.alunos} alunos</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{course.taxaAcertoMedia}% acerto médio</span>
                      </div>
                    </div>
                  </div>

                  {/* Preços */}
                  {editingId === course.id ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Mensal (R$)</div>
                        <input
                          className="input py-1 w-24 text-sm"
                          value={editValues.mensal}
                          onChange={e => setEditValues(v => ({ ...v, mensal: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Anual (R$)</div>
                        <input
                          className="input py-1 w-24 text-sm"
                          value={editValues.anual}
                          onChange={e => setEditValues(v => ({ ...v, anual: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-1 mt-4">
                        <button onClick={() => saveEdit(course.id)} className="btn-primary btn-sm p-2">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm p-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">R$ {course.precoMensal}</div>
                        <div className="text-xs text-muted-foreground">mensal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">R$ {course.precoAnual}</div>
                        <div className="text-xs text-muted-foreground">anual</div>
                      </div>
                      {savedId === course.id && (
                        <span className="badge-green text-xs">✓ Salvo</span>
                      )}
                      <button onClick={() => startEdit(course)} className="btn-ghost btn-sm p-2">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Toggle ativo */}
                  <button
                    onClick={() => toggleAtivo(course.id)}
                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', course.ativo ? 'text-success-600' : 'text-muted-foreground')}
                  >
                    {course.ativo
                      ? <ToggleRight className="w-5 h-5 text-success-500" />
                      : <ToggleLeft className="w-5 h-5" />
                    }
                    {course.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {showNovoCurso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Novo Curso</h3>
              <button onClick={() => setShowNovoCurso(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Nome do curso</label>
                <input className="input" placeholder="Ex: PCDF — Delegado" value={novoCurso.label} onChange={e => setNovoCurso(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Categoria</label>
                  <select className="input" value={novoCurso.categoria} onChange={e => setNovoCurso(p => ({ ...p, categoria: e.target.value }))}>
                    <option value="policial">Policial</option>
                    <option value="militar">Militar</option>
                    <option value="banco">Banco</option>
                    <option value="judiciario">Judiciário</option>
                    <option value="federal">Federal</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Ícone (emoji)</label>
                  <input className="input" placeholder="🚔" value={novoCurso.icon} onChange={e => setNovoCurso(p => ({ ...p, icon: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Preço mensal (R$)</label>
                  <input className="input" type="number" value={novoCurso.precoMensal} onChange={e => setNovoCurso(p => ({ ...p, precoMensal: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs">Preço anual (R$)</label>
                  <input className="input" type="number" value={novoCurso.precoAnual} onChange={e => setNovoCurso(p => ({ ...p, precoAnual: e.target.value }))} />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-xl">
              ℹ️ Após criar, o curso aparecerá na lista. Questões e flashcards serão gerados pela IA com base no nome do concurso.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowNovoCurso(false)} className="btn-outline btn-md flex-1">Cancelar</button>
              <button
                disabled={!novoCurso.label.trim()}
                onClick={() => {
                  const newId = novoCurso.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
                  const newCourse: CourseData = {
                    id: newId, label: novoCurso.label, categoria: novoCurso.categoria,
                    icon: novoCurso.icon || '📋', ativo: true,
                    precoMensal: parseInt(novoCurso.precoMensal) || 79,
                    precoAnual: parseInt(novoCurso.precoAnual) || 690,
                    alunos: 0, taxaAcertoMedia: 0,
                  }
                  setCourses(prev => [...prev, newCourse])
                  setShowNovoCurso(false)
                  setNovoCurso({ label: '', categoria: 'policial', icon: '📋', precoMensal: '79', precoAnual: '690' })
                }}
                className="btn-primary btn-md flex-1"
              >
                <Plus className="w-4 h-4" /> Criar Curso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
