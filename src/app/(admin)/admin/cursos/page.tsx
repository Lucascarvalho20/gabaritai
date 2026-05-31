'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Users, Edit2, ToggleLeft, ToggleRight, Plus, Save, X, FileText, Trash2, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type EditalAtual = {
  id: string
  titulo: string
  ano: number
  isActive: boolean
  status: string
  banca: { slug: string; name: string } | null
} | null

type Course = {
  id: string
  slug: string
  name: string
  description: string | null
  area: string
  uf: string | null
  orgao: string | null
  cargo: string | null
  parentSlug: string | null
  active: boolean
  createdAt: string
  alunos: number
  editaisCount: number
  studyPlansCount: number
  editalAtual: EditalAtual
}

const AREA_LABEL: Record<string, string> = {
  POLICIAL: '🛡️ Policial',
  MILITAR: '🎖️ Militar',
  BOMBEIRO: '🚒 Bombeiro',
  GUARDA_MUNICIPAL: '🏛️ Guarda Municipal',
  OUTRO: '📋 Outro',
}

const AREAS = ['POLICIAL', 'MILITAR', 'BOMBEIRO', 'GUARDA_MUNICIPAL', 'OUTRO'] as const

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Course>>({})
  const [showNovoCurso, setShowNovoCurso] = useState(false)
  const [novoCurso, setNovoCurso] = useState({
    name: '', slug: '', area: 'POLICIAL', uf: '', orgao: '', cargo: '', parentSlug: '', description: '',
  })

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/courses')
      setCourses(data.courses ?? [])
    } catch (e: any) {
      toast.error('Erro ao carregar cursos')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function startEdit(c: Course) {
    setEditingId(c.id)
    setEditValues({
      name: c.name,
      slug: c.slug,
      area: c.area,
      uf: c.uf ?? '',
      orgao: c.orgao ?? '',
      cargo: c.cargo ?? '',
      parentSlug: c.parentSlug ?? '',
      description: c.description ?? '',
    })
  }

  async function saveEdit(id: string) {
    try {
      await api.patch(`/admin/courses/${id}`, editValues)
      toast.success('Curso atualizado')
      setEditingId(null)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar')
    }
  }

  async function toggleAtivo(c: Course) {
    try {
      await api.patch(`/admin/courses/${c.id}`, { active: !c.active })
      toast.success(c.active ? 'Curso desativado' : 'Curso ativado')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function deleteCourse(c: Course, force: boolean) {
    const confirmMsg = force
      ? `Deletar PERMANENTEMENTE "${c.name}"? Só funciona se não tiver matrículas/planos.`
      : `Desativar "${c.name}"? Aluno matriculado mantém acesso mas curso some dos planos.`
    if (!confirm(confirmMsg)) return
    try {
      await api.delete(`/admin/courses/${c.id}${force ? '?force=true' : ''}`)
      toast.success(force ? 'Curso deletado' : 'Curso desativado')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  async function createCourse() {
    if (!novoCurso.name.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    try {
      await api.post('/admin/courses', {
        ...novoCurso,
        uf: novoCurso.uf || undefined,
        orgao: novoCurso.orgao || undefined,
        cargo: novoCurso.cargo || undefined,
        parentSlug: novoCurso.parentSlug || undefined,
        description: novoCurso.description || undefined,
        slug: novoCurso.slug || undefined,
      })
      toast.success('Curso criado!')
      setShowNovoCurso(false)
      setNovoCurso({ name: '', slug: '', area: 'POLICIAL', uf: '', orgao: '', cargo: '', parentSlug: '', description: '' })
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar')
    }
  }

  const totalAlunos = courses.reduce((acc, c) => acc + c.alunos, 0)
  const totalAtivos = courses.filter(c => c.active).length
  const totalSemEdital = courses.filter(c => !c.editalAtual).length
  const cursosPorArea = AREAS.map(a => ({ area: a, count: courses.filter(c => c.area === a).length })).filter(x => x.count > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gerenciar Cursos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">CRUD completo de cursos · vinculação com editais · soft-delete</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setShowNovoCurso(true)}>
          <Plus className="w-3.5 h-3.5" /> Novo curso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cursos ativos', value: totalAtivos, icon: BookOpen, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Total de cursos', value: courses.length, icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Alunos matriculados', value: totalAlunos, icon: Users, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-900/20' },
          { label: 'Cursos sem edital', value: totalSemEdital, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
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

      {/* Cursos por área */}
      {cursosPorArea.map(({ area }) => {
        const catCourses = courses.filter(c => c.area === area)
        return (
          <div key={area} className="card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm">{AREA_LABEL[area]}</h2>
              <span className="text-xs text-muted-foreground">{catCourses.filter(c => c.active).length}/{catCourses.length} ativos</span>
            </div>
            <div className="divide-y divide-border">
              {catCourses.map(course => editingId === course.id ? (
                <div key={course.id} className="px-5 py-4 bg-yellow-50/40 dark:bg-yellow-900/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Nome*</label>
                      <input className="input" value={editValues.name ?? ''} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Slug (URL)</label>
                      <input className="input font-mono" value={editValues.slug ?? ''} onChange={e => setEditValues(v => ({ ...v, slug: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Cargo</label>
                      <input className="input" value={editValues.cargo ?? ''} onChange={e => setEditValues(v => ({ ...v, cargo: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Órgão</label>
                      <input className="input" value={editValues.orgao ?? ''} onChange={e => setEditValues(v => ({ ...v, orgao: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">UF</label>
                      <input className="input uppercase" maxLength={2} value={editValues.uf ?? ''} onChange={e => setEditValues(v => ({ ...v, uf: e.target.value.toUpperCase() }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Área</label>
                      <select className="input" value={editValues.area ?? 'POLICIAL'} onChange={e => setEditValues(v => ({ ...v, area: e.target.value }))}>
                        {AREAS.map(a => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Parent slug (agrupador)</label>
                      <input className="input font-mono" placeholder="ex: pf" value={editValues.parentSlug ?? ''} onChange={e => setEditValues(v => ({ ...v, parentSlug: e.target.value }))} />
                    </div>
                    <div className="col-span-full">
                      <label className="text-[10px] text-muted-foreground">Descrição</label>
                      <textarea className="input" rows={2} value={editValues.description ?? ''} onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-outline btn-sm">
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                    <button onClick={() => saveEdit(course.id)} className="btn-primary btn-sm">
                      <Save className="w-3.5 h-3.5" /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div key={course.id} className={cn('px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors', !course.active && 'opacity-50')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{course.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{course.slug}</span>
                      {course.uf && <span className="badge-blue text-[10px]">{course.uf}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {course.orgao && <span>{course.orgao}</span>}
                      {course.cargo && <span>· {course.cargo}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.alunos} aluno{course.alunos !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{course.editaisCount} edital{course.editaisCount !== 1 ? 'is' : ''}</span>
                    </div>
                    {course.editalAtual ? (
                      <Link
                        href={`/admin/editais/${course.editalAtual.id}`}
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-brand-500 hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        Edital {course.editalAtual.ano}: {course.editalAtual.titulo}
                        {course.editalAtual.banca && <span className="text-muted-foreground">· {course.editalAtual.banca.name}</span>}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <Link
                        href="/admin/editais/extrair"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-yellow-600 hover:underline font-semibold"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Sem edital — clique pra subir PDF
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(course)} className="btn-ghost btn-sm p-2" title="Editar dados">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleAtivo(course)}
                      className={cn('btn-ghost btn-sm p-2', course.active ? 'text-success-600' : 'text-muted-foreground')}
                      title={course.active ? 'Desativar' : 'Ativar'}
                    >
                      {course.active ? <ToggleRight className="w-4 h-4 text-success-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteCourse(course, course.alunos === 0 && course.editaisCount === 0)}
                      className="btn-ghost btn-sm p-2 text-danger-500"
                      title={course.alunos > 0 ? 'Desativar (tem alunos)' : 'Deletar permanente'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Modal novo curso */}
      {showNovoCurso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Novo Curso</h3>
              <button onClick={() => setShowNovoCurso(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-full">
                <label className="label text-xs">Nome do curso*</label>
                <input className="input" placeholder="Ex: PMGO — Soldado" value={novoCurso.name} onChange={e => setNovoCurso(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Slug (auto se vazio)</label>
                <input className="input font-mono" placeholder="pmgo-soldado" value={novoCurso.slug} onChange={e => setNovoCurso(p => ({ ...p, slug: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Área</label>
                <select className="input" value={novoCurso.area} onChange={e => setNovoCurso(p => ({ ...p, area: e.target.value }))}>
                  {AREAS.map(a => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Órgão</label>
                <input className="input" placeholder="Ex: Polícia Militar de GO" value={novoCurso.orgao} onChange={e => setNovoCurso(p => ({ ...p, orgao: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Cargo</label>
                <input className="input" placeholder="Ex: Soldado" value={novoCurso.cargo} onChange={e => setNovoCurso(p => ({ ...p, cargo: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">UF</label>
                <input className="input uppercase" maxLength={2} placeholder="GO" value={novoCurso.uf} onChange={e => setNovoCurso(p => ({ ...p, uf: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="label text-xs">Parent slug (agrupador)</label>
                <input className="input font-mono" placeholder="pmgo" value={novoCurso.parentSlug} onChange={e => setNovoCurso(p => ({ ...p, parentSlug: e.target.value }))} />
              </div>
              <div className="col-span-full">
                <label className="label text-xs">Descrição</label>
                <textarea className="input" rows={2} placeholder="Curta — aparece no checkout" value={novoCurso.description} onChange={e => setNovoCurso(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-xl">
              ℹ️ Após criar, vá em <strong>/admin/editais/extrair</strong> pra subir o PDF do edital — isso popula matérias, pesos, banca e formato.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowNovoCurso(false)} className="btn-outline btn-md flex-1">Cancelar</button>
              <button disabled={!novoCurso.name.trim()} onClick={createCourse} className="btn-primary btn-md flex-1">
                <Plus className="w-4 h-4" /> Criar Curso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
