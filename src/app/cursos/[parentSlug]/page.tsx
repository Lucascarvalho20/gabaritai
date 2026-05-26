import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, MapPin, BookOpen, Calendar, Brain, Target, Zap, Trophy,
  Award, ChevronRight, CheckCircle2,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/ui/logo'
import { CountdownToProva } from '@/components/CountdownToProva'
import { EditalHighlight } from '@/components/EditalHighlight'
import { cn } from '@/lib/utils'

export const revalidate = 300 // 5min — revalida automaticamente em background

type Props = {
  params: { parentSlug: string }
  searchParams: { cargo?: string }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function loadGroup(parentSlug: string) {
  // Busca todos os cursos com esse parentSlug (ex: parentSlug='pf' pega
  // PF-Agente, PF-Escrivão, PF-Delegado, etc.) OU um curso cujo próprio
  // slug é parentSlug (caso concurso de 1 cargo único).
  const cursos = await prisma.course.findMany({
    where: {
      active: true,
      OR: [{ parentSlug }, { slug: parentSlug }],
    },
    orderBy: [{ cargo: 'asc' }, { name: 'asc' }],
    include: {
      editais: {
        where: { isActive: true },
        include: {
          banca: { select: { name: true, slug: true } },
          subjects: {
            include: { subject: { select: { name: true, slug: true } } },
            orderBy: { order: 'asc' },
          },
        },
        take: 1,
      },
      courseSubjects: {
        include: { subject: { select: { name: true, slug: true } } },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (cursos.length === 0) return null
  return {
    parentSlug,
    label: cursos[0].orgao ?? cursos[0].name.split('—')[0].trim(),
    orgao: cursos[0].orgao,
    uf: cursos[0].uf,
    area: cursos[0].area,
    cargos: cursos,
  }
}

// ── SEO metadata por concurso ─────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const group = await loadGroup(params.parentSlug)
  if (!group) return { title: 'Concurso não encontrado' }

  const cargoAtivo =
    group.cargos.find((c) => c.slug === searchParams.cargo) ?? group.cargos[0]
  const edital = cargoAtivo.editais[0]

  const cargoNome = cargoAtivo.cargo ?? cargoAtivo.name
  const ufStr = group.uf ? ` (${group.uf})` : ''
  const ano = edital?.ano ?? new Date().getFullYear()
  const orgao = group.orgao ?? group.label

  const title = `${orgao} ${cargoNome} ${ano}${ufStr} — Edital, matérias e plano de estudos`
  const descParts: string[] = []
  if (edital?.vagas) descParts.push(`${edital.vagas} vagas`)
  if (edital?.salario) {
    descParts.push(`salário ${edital.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`)
  }
  if (edital?.banca?.name) descParts.push(`banca ${edital.banca.name}`)
  if (edital?.totalQuestoes) descParts.push(`${edital.totalQuestoes} questões`)
  if (edital?.hasRedacao) descParts.push('com redação')

  const descMid = descParts.length > 0 ? `${descParts.join(' · ')}. ` : ''
  const description =
    `Concurso ${orgao} ${cargoNome} ${ano}: ${descMid}Veja edital verticalizado, matérias com peso, cronograma de estudo e simule a prova no formato real. Plataforma de mentoria pra concurseiros sérios.`

  return {
    title,
    description,
    keywords: [
      `concurso ${orgao}`,
      `${orgao} ${cargoNome}`,
      `edital ${orgao} ${ano}`,
      `${orgao} matérias`,
      `${orgao} simulado`,
      'concurso público',
      cargoNome.toLowerCase(),
      edital?.banca?.name ?? 'Cebraspe',
    ],
    openGraph: {
      title: `${orgao} ${cargoNome} ${ano}`,
      description,
      type: 'website',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${orgao} ${cargoNome} ${ano}`,
      description,
    },
    alternates: {
      canonical: `/cursos/${params.parentSlug}${searchParams.cargo ? `?cargo=${searchParams.cargo}` : ''}`,
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ConcursoPage({ params, searchParams }: Props) {
  const group = await loadGroup(params.parentSlug)
  if (!group) notFound()

  const cargoAtivo =
    group.cargos.find((c) => c.slug === searchParams.cargo) ?? group.cargos[0]
  const edital = cargoAtivo.editais[0]

  // Matérias: do edital ativo (com peso específico) OU fallback pro courseSubjects
  const materias =
    edital?.subjects && edital.subjects.length > 0
      ? edital.subjects.map((es) => ({
          name: es.subject.name,
          slug: es.subject.slug,
          weight: es.weight,
          expectedQuestions: es.expectedQuestions,
        }))
      : cargoAtivo.courseSubjects.map((cs) => ({
          name: cs.subject.name,
          slug: cs.subject.slug,
          weight: cs.weight,
          expectedQuestions: null,
        }))

  const cargoNome = cargoAtivo.cargo ?? cargoAtivo.name

  // ── JSON-LD structured data (schema.org Course) ────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${group.label} ${cargoNome}${edital?.ano ? ` ${edital.ano}` : ''}`,
    description: cargoAtivo.description ?? `Plano de estudos completo para o concurso ${group.label} ${cargoNome}.`,
    provider: {
      '@type': 'Organization',
      name: 'Gabaritai',
      url: 'https://gabaritai-red.vercel.app',
    },
    educationalLevel: cargoAtivo.area,
    courseMode: 'online',
    ...(edital?.dataProva && { startDate: edital.dataProva.toISOString() }),
    ...(materias.length > 0 && {
      syllabusSections: materias.map((m, i) => ({
        '@type': 'Syllabus',
        name: m.name,
        position: i + 1,
      })),
    }),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD pro Google entender o conteúdo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Entrar</Link>
            <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        <Link href="/cursos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Todos os concursos
        </Link>

        {/* ── Hero + countdown ──────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {group.label} {cargoNome}
                {edital?.ano && <span className="text-muted-foreground"> · {edital.ano}</span>}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {group.orgao && group.orgao !== group.label && <span>{group.orgao}</span>}
                {group.uf && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {group.uf}</span>}
                <span>· {group.cargos.length} cargo{group.cargos.length > 1 ? 's' : ''} cobertos</span>
              </div>
            </div>
            {edital?.dataProva && (
              <CountdownToProva date={edital.dataProva} />
            )}
          </div>

          {/* Edital highlight */}
          {edital && <EditalHighlight edital={edital} />}
        </section>

        {/* ── Seletor de cargo (links pra ?cargo=slug — SSR friendly) ──── */}
        {group.cargos.length > 1 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Outros cargos do mesmo concurso</h2>
            <div className="flex flex-wrap gap-2">
              {group.cargos.map((c) => {
                const isActive = c.id === cargoAtivo.id
                return (
                  <Link
                    key={c.id}
                    href={`/cursos/${params.parentSlug}?cargo=${c.slug}`}
                    scroll={false}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-semibold transition-colors border',
                      isActive
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                        : 'border-border bg-card hover:bg-muted text-foreground',
                    )}
                  >
                    {c.cargo ?? c.name}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Matérias com peso ─────────────────────────────────────────── */}
        {materias.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                Matérias e peso no edital
              </h2>
              <span className="text-xs text-muted-foreground">{materias.length} matérias</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {materias
                .sort((a, b) => b.weight - a.weight)
                .map((s) => {
                  // Calcula peso relativo pra barra
                  const max = Math.max(...materias.map((m) => m.weight))
                  const pct = max > 0 ? (s.weight / max) * 100 : 0
                  return (
                    <div key={s.slug} className="card p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sm">{s.name}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          {s.expectedQuestions ? `${s.expectedQuestions} q` : `peso ${s.weight}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              Pesos extraídos do último edital. Nosso cronograma distribui suas horas de estudo proporcionalmente —
              quem cai mais, você estuda mais.
            </p>
          </section>
        )}

        {/* ── O que está incluso ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            O que você tem nesse curso
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Calendar, title: 'Cronograma adaptativo', desc: 'Distribui matérias por peso do edital. Se ajusta semanalmente ao seu desempenho.' },
              { icon: Brain, title: 'Mentor 24h', desc: 'Conhece seu edital, seu progresso e te orienta como um professor particular.' },
              { icon: Target, title: '3 simulados por semana', desc: 'Mini terça e quinta · simulado real domingo, cronometrado no formato da banca.' },
              { icon: Zap, title: 'Flashcards SRS', desc: 'Repetição espaçada baseada em ciência (SuperMemo SM-2).' },
              { icon: Award, title: 'Correção de redação', desc: 'Manda sua redação e recebe nota global + por critério em segundos.' },
              { icon: CheckCircle2, title: 'Detecção de edital novo', desc: 'Quando muda, seu cronograma atualiza automático — sem começar do zero.' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="card p-4 hover:border-brand-500/40 transition-colors">
                  <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400 mb-2" />
                  <div className="font-semibold text-sm">{b.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="card p-6 sm:p-10 text-center bg-gradient-to-br from-brand-500/8 via-card to-emerald-500/5 border-brand-500/30">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comece sua preparação pro {group.label} {cargoNome}
          </h3>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            7 dias grátis. Sem cartão. Cronograma montado em 5 minutos no formato exato do edital.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/checkout/trial?curso=${cargoAtivo.slug}`}
              className="group inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 transition-all"
            >
              Começar grátis
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/planos"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold transition-colors"
            >
              Ver todos os planos
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
