import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Users, Clock, Award, Target, FileText, CheckCircle2, Sparkles, Download, Lock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export const revalidate = 600 // 10min

type Props = { params: { courseSlug: string } }

async function loadCourseWithEdital(slug: string) {
  const course = await prisma.course.findUnique({
    where: { slug },
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
    },
  })
  if (!course) return null
  return course
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await loadCourseWithEdital(params.courseSlug)
  if (!course) return { title: 'Edital não encontrado · Gabaritai' }
  const edital = course.editais[0]
  return {
    title: `Edital Verticalizado · ${course.name} · Gabaritai`,
    description: edital
      ? `Veja o edital verticalizado do ${course.name}. Banca ${edital.banca?.name}. ${edital.totalQuestoes} questões. ${edital.subjects.length} matérias com peso e assuntos.`
      : `Edital verticalizado do ${course.name}.`,
    openGraph: {
      title: `Edital Verticalizado · ${course.name}`,
      description: 'Veja matérias, pesos e assuntos cobrados. Gratuito.',
      type: 'article',
    },
  }
}

export default async function EditalPublicoPage({ params }: Props) {
  const course = await loadCourseWithEdital(params.courseSlug)
  if (!course) notFound()

  const edital = course.editais[0]
  if (!edital) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-black mb-2">Edital ainda não cadastrado</h1>
        <p className="text-muted-foreground text-sm mb-6">Esse curso ainda não tem edital verticalizado disponível.</p>
        <Link href="/cursos" className="btn-primary inline-flex">Ver outros cursos</Link>
      </div>
    )
  }

  const totalPeso = edital.subjects.reduce((s, m) => s + m.weight, 0)
  // Pega só os 3 primeiros tópicos de cada matéria pra preview (resto é "blur")
  const PREVIEW_TOPICOS = 3

  return (
    <div className="min-h-screen bg-background">
      {/* Header público */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-black text-base">Gabaritai</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-xs font-bold hover:underline">Entrar</Link>
            <Link href="/cadastro" className="btn-primary btn-sm text-xs">Criar conta grátis</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <Link href={`/cursos/${course.parentSlug ?? course.slug}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar pro {course.orgao ?? 'curso'}
        </Link>

        <div>
          <div className="badge badge-yellow text-[10px] mb-2 inline-flex">📌 EDITAL EM VIGOR</div>
          <h1 className="text-2xl sm:text-3xl font-black">{course.name}</h1>
          {course.cargo && <p className="text-base text-muted-foreground mt-1">{course.cargo}</p>}
          <p className="text-muted-foreground text-sm mt-2">
            Edital verticalizado: matérias cobradas, peso e assuntos. <strong>Gratuito.</strong>
          </p>
        </div>

        {/* Banner edital info */}
        <div className="card p-5 bg-gradient-to-br from-brand-500/5 to-purple-500/5 border-brand-500/20">
          <p className="text-xs font-bold mb-3">{edital.titulo}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Info icon={Award} label="Banca" value={edital.banca?.name ?? '—'} />
            <Info icon={Users} label="Vagas" value={edital.vagas ?? '—'} />
            <Info icon={Target} label="Questões" value={edital.totalQuestoes ?? '—'} />
            <Info icon={Clock} label="Duração" value={edital.duracaoMin ? `${edital.duracaoMin}min` : '—'} />
            {edital.dataProva && <Info icon={Calendar} label="Data prova" value={new Date(edital.dataProva).toLocaleDateString('pt-BR')} />}
            {edital.examFormat && <Info icon={FileText} label="Formato" value={edital.examFormat} />}
            {edital.hasRedacao && <Info icon={FileText} label="Redação" value="SIM" />}
            {edital.salario && <Info icon={Award} label="Salário" value={`R$ ${edital.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />}
          </div>
        </div>

        {/* CTA principal */}
        <div className="card p-5 border-brand-500/30 bg-gradient-to-r from-brand-500 to-purple-500 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-sm mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Estude com banco de questões + flashcards + IA Mentor
              </p>
              <p className="text-xs opacity-90">
                Crie conta grátis e tenha acesso ao banco de questões dessas {edital.subjects.length} matérias.
              </p>
            </div>
            <Link href="/cadastro" className="bg-white text-brand-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-100 transition shrink-0 inline-flex items-center gap-1">
              Começar grátis →
            </Link>
          </div>
        </div>

        {/* Matérias */}
        <div>
          <h2 className="text-sm font-bold mb-2">Matérias por peso ({edital.subjects.length})</h2>
          <div className="space-y-2">
            {edital.subjects.map((m, idx) => {
              const peso = Math.round((m.weight / totalPeso) * 100)
              const topicos = (m.programa ?? '').split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 0)
              const previewTopicos = topicos.slice(0, PREVIEW_TOPICOS)
              const hiddenCount = Math.max(0, topicos.length - PREVIEW_TOPICOS)

              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-sm">{idx + 1}. {m.subject.name}</h3>
                        <span className="badge badge-purple text-[10px]">peso {m.weight}</span>
                        <span className="text-[10px] text-muted-foreground">≈ {peso}% da prova</span>
                        <span className="text-[10px] text-muted-foreground">· {m.expectedQuestions} questões</span>
                      </div>
                    </div>
                  </div>

                  {previewTopicos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold mb-1.5">Assuntos cobrados:</h4>
                      <ul className="space-y-1 text-xs">
                        {previewTopicos.map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                      {hiddenCount > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          <span>+ {hiddenCount} tópicos. <Link href="/cadastro" className="font-bold text-brand-600 hover:underline">Crie conta grátis</Link> pra ver tudo + baixar PDF completo.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA final */}
        <div className="card p-6 text-center bg-gradient-to-br from-brand-500/10 to-purple-500/10 border-brand-500/30">
          <h3 className="font-black text-lg mb-2">Pronto pra começar a estudar?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Acesse banco de questões, flashcards SM-2, cronograma adaptativo e Mentor IA. <strong>7 dias grátis.</strong>
          </p>
          <Link href="/cadastro" className="btn-primary inline-flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Criar conta grátis
          </Link>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © Gabaritai · <Link href="/" className="hover:underline">gabaritai.com.br</Link>
        </div>
      </footer>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground"><Icon className="w-3 h-3" /> {label}</div>
      <div className="font-bold mt-0.5 text-foreground">{value}</div>
    </div>
  )
}
