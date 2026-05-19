'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Loader2, Sparkles, Plus, X, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Mapa = {
  id: string
  title: string
  createdAt: string
  subject: { id: string; slug: string; name: string } | null
}
type Subject = { id: string; slug: string; name: string }

export default function MapasMentaisPage() {
  const [mapas, setMapas] = useState<Mapa[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showGen, setShowGen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [topic, setTopic] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [{ data: m }, { data: c }] = await Promise.all([
        api.get('/mapas-mentais'),
        api.get('/courses'),
      ])
      setMapas(m.mapas)
      // Pega matérias do primeiro curso do aluno
      if (c.courses?.[0]) {
        const { data: cursoData } = await api.get(`/courses/${c.courses[0].slug}`)
        setSubjects(cursoData.subjects ?? [])
        setSubjectId(cursoData.subjects?.[0]?.id ?? '')
      }
    } catch (e: any) {
      toast.error('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function gerar() {
    if (!subjectId) return toast.error('Escolha uma matéria')
    setGenerating(true)
    try {
      const { data } = await api.post('/mapas-mentais', { subjectId, topic: topic || undefined })
      toast.success('Mapa gerado!')
      setShowGen(false)
      setTopic('')
      window.location.href = `/dashboard/mapas-mentais/${data.id}`
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao gerar')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" /> Mapas mentais
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            IA gera mapas visuais com hierarquia de conceitos. Estuda olhando, memoriza vendo.
          </p>
        </div>
        <button
          onClick={() => setShowGen(true)}
          className="rounded-xl bg-purple-500 text-white px-4 py-2 text-sm font-bold hover:bg-purple-600 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Gerar novo mapa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
      ) : mapas.length === 0 ? (
        <div className="card p-10 text-center">
          <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum mapa mental ainda. Gera o primeiro!</p>
          <button onClick={() => setShowGen(true)} className="rounded-xl bg-purple-500 text-white px-4 py-2 text-sm font-bold hover:bg-purple-600">
            Gerar meu primeiro mapa
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mapas.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/mapas-mentais/${m.id}`}
              className="card p-4 hover:border-purple-500/40 transition flex flex-col gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm line-clamp-2">{m.title}</h3>
              {m.subject && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <BookOpen className="w-3 h-3" /> {m.subject.name}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-auto">
                {new Date(m.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showGen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" /> Gerar mapa mental</h2>
              <button onClick={() => setShowGen(false)} className="p-1.5 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs font-semibold">Matéria</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Tema específico (opcional)</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ex: Direitos Fundamentais Art 5º"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Deixa vazio pra mapa geral da matéria</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 text-xs text-purple-700 dark:text-purple-200">
              IA gera estrutura hierárquica com cores e ícones em ~30s
            </div>
            <button
              onClick={gerar}
              disabled={generating || !subjectId}
              className="w-full rounded-xl bg-purple-500 text-white py-2.5 text-sm font-bold hover:bg-purple-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</> : <><Sparkles className="w-4 h-4" /> Gerar com IA</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
