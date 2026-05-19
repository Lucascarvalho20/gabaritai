'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, BookOpen, Calendar, Award, MapPin, Brain, Target, Zap, CheckCircle2, ChevronRight, Trophy } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

type Course = { id: string; slug: string; name: string; cargo: string | null; uf: string | null; orgao: string | null; description: string | null }
type Subject = { id: string; slug: string; name: string; weight: number }
type Edital = { id: string; titulo: string; ano: number; isActive: boolean; vagas: number | null; banca: { name: string; slug: string } | null }

type Group = {
  parentSlug: string
  orgao: string | null
  area: string
  uf: string | null
  label: string
  cargos: Course[]
}

export default function ConcursoDetalhePage() {
  const params = useParams<{ parentSlug: string }>()
  const [group, setGroup] = useState<Group | null>(null)
  const [activeCargo, setActiveCargo] = useState<Course | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses?all=true')
      .then((r) => r.json())
      .then((data) => {
        const g = (data.groups ?? []).find((x: Group) => x.parentSlug === params.parentSlug)
        if (!g) return
        setGroup(g)
        setActiveCargo(g.cargos[0])
      })
      .finally(() => setLoading(false))
  }, [params.parentSlug])

  useEffect(() => {
    if (!activeCargo) return
    fetch(`/api/courses/${activeCargo.slug}`)
      .then((r) => r.json())
      .then((data) => {
        setSubjects(data.subjects ?? [])
        setEditais(data.activeEditais ?? data.editais ?? [])
      })
  }, [activeCargo])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Concurso não encontrado.</p>
        <Link href="/cursos" className="text-brand-500 font-semibold text-sm">← Voltar pros cursos</Link>
      </div>
    )
  }

  const editalAtivo = editais.find((e) => e.isActive) ?? editais[0]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Entrar</Link>
            <Link href="/planos" className="text-sm font-bold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Link href="/cursos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Voltar pros cursos
        </Link>

        {/* Hero do concurso */}
        <div className="card p-6 sm:p-8 bg-gradient-to-br from-brand-500/5 to-purple-500/5 border-brand-500/20">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">{group.label}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {group.orgao && <span>{group.orgao}</span>}
                {group.uf && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {group.uf}</span>}
                <span>· {group.cargos.length} cargo{group.cargos.length > 1 ? 's' : ''}</span>
              </div>
            </div>
            {editalAtivo && (
              <div className="px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-xs">
                <div className="font-bold text-green-700 dark:text-green-300 inline-flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Edital {editalAtivo.ano}</div>
                {editalAtivo.banca && <div className="text-green-600 dark:text-green-400 mt-0.5">Banca: {editalAtivo.banca.name}</div>}
                {editalAtivo.vagas && <div className="text-green-600 dark:text-green-400">{editalAtivo.vagas} vagas</div>}
              </div>
            )}
          </div>
        </div>

        {/* Seleção de cargo */}
        {group.cargos.length > 1 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold mb-2">Escolha o cargo</h2>
            <div className="flex flex-wrap gap-2">
              {group.cargos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCargo(c)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-bold transition border-2',
                    activeCargo?.id === c.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                      : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {c.cargo ?? c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Matérias */}
        {subjects.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-black mb-3">📚 Matérias cobradas ({subjects.length})</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {subjects.map((s) => (
                <div key={s.id} className="card p-3 flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    peso {s.weight}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Pesos extraídos do edital. Nosso algoritmo distribui as horas de estudo proporcionalmente.
            </p>
          </div>
        )}

        {/* O que tem incluso */}
        <div className="mt-8">
          <h2 className="text-xl font-black mb-3">✨ O que você tem nesse curso</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Calendar, title: 'Cronograma adaptativo', desc: 'Distribui matérias por peso do edital. Se ajusta semanalmente.' },
              { icon: Brain, title: 'Mentor IA exclusivo', desc: 'Conhece seu edital, seu progresso e te orienta 24/7.' },
              { icon: Target, title: '3 simulados por semana', desc: 'Mini terça e quinta · simulado real domingo (cronometrado).' },
              { icon: Zap, title: 'Flashcards SRS', desc: 'Repetição espaçada baseada em ciência (SuperMemo).' },
              { icon: Trophy, title: 'Correção redação IA', desc: 'Manda redação → IA dá nota e feedback em segundos.' },
              { icon: Award, title: 'Detecção edital novo', desc: 'Quando muda, seu cronograma atualiza automático.' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="card p-4">
                  <Icon className="w-5 h-5 text-brand-500 mb-2" />
                  <div className="font-bold text-sm">{b.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 card p-6 sm:p-8 text-center bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-transparent border-brand-500/30">
          <h3 className="text-2xl sm:text-3xl font-black">
            Pronto pra começar {activeCargo?.cargo ?? 'este curso'}?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            3 dias grátis. Sem cartão. Cancela quando quiser.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/checkout/trial?curso=${activeCargo?.slug}`}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/25"
            >
              Começar grátis <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/planos"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted text-sm font-bold"
            >
              Ver todos os planos
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
