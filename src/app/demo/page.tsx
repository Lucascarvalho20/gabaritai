import { type Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ArrowRight, Eye } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EmailCapture } from '@/components/EmailCapture'
import { DemoExplorer } from './DemoExplorer'

export const metadata: Metadata = {
  title: 'Demo interativo — veja o Gabaritai funcionando sem criar conta',
  description: 'Cronograma, simulado cronometrado, flashcards com repetição espaçada, mentor e edital verticalizado. Clique em qualquer um e teste antes de assinar.',
  keywords: ['demo concurso', 'experimentar plataforma', 'gabaritai demo', 'cronograma de estudo demo'],
  openGraph: {
    title: 'Veja o Gabaritai funcionando — sem criar conta',
    description: 'Demo interativo do cronograma, simulado, flashcards e mentor. 100% sem login.',
  },
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/metodo" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Método</Link>
            <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Voltar
        </Link>

        {/* Hero do demo */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/60 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-4">
            <Eye className="w-3.5 h-3.5" />
            <span>Demo interativo · sem cadastro · sem cartão</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
            Clica, mexe, sente o produto.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Concurseiro experiente desconfia de tudo. Por isso a gente preferiu te deixar entrar na plataforma
            <strong className="text-foreground"> sem precisar de email ou cartão</strong>. Escolhe abaixo o que
            quer ver, mexe à vontade. Depois decide.
          </p>
        </section>

        {/* O explorer interativo (5 abas) */}
        <DemoExplorer />

        {/* Convite pra trial completo */}
        <section className="card p-6 sm:p-10 bg-gradient-to-br from-brand-500/8 via-card to-emerald-500/5 border-brand-500/20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Curtiu? Liga seu cronograma de verdade.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-5">
            Aqui você viu mocks. No trial, o cronograma se monta com o edital REAL do seu cargo, simulados
            saem no formato da sua banca e o mentor conhece o seu progresso.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/planos"
              className="group inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5"
            >
              Começar 3 dias grátis
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/metodo"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold transition-colors"
            >
              Ver o método primeiro
            </Link>
          </div>
        </section>

        {/* Captura de email pra quem não está pronto pra trial */}
        <section className="card p-6 sm:p-8 max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold tracking-tight">Ainda não está pronto?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Deixa seu email e te mando o edital verticalizado do concurso que te interessa.
            </p>
          </div>
          <EmailCapture
            source="demo-edital-pdf"
            cta="Receber edital"
            hint="Sem spam · cancela quando quiser"
          />
        </section>
      </main>
    </div>
  )
}
