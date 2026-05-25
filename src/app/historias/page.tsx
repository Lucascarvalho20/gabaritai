import { type Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Trophy, Camera, Award, FileCheck, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EmailCapture } from '@/components/EmailCapture'

export const metadata: Metadata = {
  title: 'Aprovados — quando tiver, vai ter foto, nome e print da nomeação',
  description: 'O Gabaritai é uma plataforma nova. Em vez de inventar depoimentos, preferimos contar com transparência: quando tivermos aprovados reais, eles entram aqui com nome completo, posição na prova e print da nomeação.',
  robots: { index: true, follow: true },
}

export default function HistoriasPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
            Começar grátis
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ChevronLeft className="w-3 h-3" /> Voltar
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-4">
            <Trophy className="w-3.5 h-3.5" /> Histórias de aprovados · em construção
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Sem aprovado, sem história.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A maioria das plataformas de concurso enche essa página de "Mateus L." e "Ana C." com
            sobrenome cortado, foto genérica e citação suspeita. A gente prefere honestidade: o Gabaritai
            é uma plataforma nova, e <strong className="text-foreground">você pode ser o primeiro</strong>.
          </p>
        </div>

        <div className="my-12 grid sm:grid-cols-3 gap-3">
          {[
            { icon: Camera, label: 'Foto real' },
            { icon: Award, label: 'Posição na prova' },
            { icon: FileCheck, label: 'Print da nomeação' },
          ].map((b) => {
            const Icon = b.icon
            return (
              <div key={b.label} className="card p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold">{b.label}</div>
              </div>
            )
          })}
        </div>

        <div className="card p-6 sm:p-8 bg-gradient-to-br from-brand-500/5 via-card to-emerald-500/5 border-brand-500/20 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Quando você passar, conta pra gente
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto leading-relaxed">
            Quem se cadastra agora entra no nosso programa de aprovado destaque: quando você for nomeado,
            a gente faz uma matéria com sua história aqui, te coloca na home do site e dá 1 ano de acesso
            premium grátis pra continuar revisando.
          </p>
          <div className="max-w-md mx-auto">
            <EmailCapture
              source="historias-aprovado-pioneiro"
              cta="Quero entrar"
              successMessage="Combinado. Quando passar, a gente fala."
              hint="Sem spam · só pra te avisar quando o programa abrir formalmente"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/metodo"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
          >
            Veja o método que vai te levar lá
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>
    </div>
  )
}
