import { type Metadata } from 'next'
import Link from 'next/link'
import {
  Brain, Timer, Repeat, Target, FileSearch, LineChart, ArrowRight, ChevronLeft,
  CheckCircle2, BookOpen,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EmailCapture } from '@/components/EmailCapture'

export const metadata: Metadata = {
  title: 'O método — como o Gabaritai faz você render mais por hora estudada',
  description: 'Repetição espaçada (SM-2), simulado no formato exato da banca, edital verticalizado e cronograma adaptativo. O método por trás da plataforma, explicado em 5 minutos.',
  keywords: ['método de estudo', 'repetição espaçada', 'SM-2', 'concurso público', 'edital verticalizado', 'simulado Cebraspe'],
}

const PILARES = [
  {
    icon: FileSearch,
    titulo: '1. O edital é fonte da verdade',
    paragraph:
      'A maioria dos cursos vende biblioteca: 5 mil aulas, 30 mil questões, e você se vira pra montar o caminho. Aqui é o contrário. A gente pega o edital ATIVO do seu cargo, extrai matéria, peso e assuntos cobrados, e usa isso como GPS. Tudo que você estuda está aprovado pelo edital. Tudo que sai do edital fica fora do plano.',
  },
  {
    icon: Target,
    titulo: '2. Peso do edital vira tempo de estudo',
    paragraph:
      'Direito Constitucional cai 25% das questões na PMDF? Então 25% das suas horas vão pra Direito Constitucional. Sem palpite. Sem "eu acho que tenho que estudar mais isso". O cronograma é matemático: peso da matéria × horas disponíveis = bloco de estudo da semana.',
  },
  {
    icon: Repeat,
    titulo: '3. Repetição espaçada (SuperMemo SM-2)',
    paragraph:
      'Você aprende algo hoje. Amanhã esquece 50%. Em 7 dias, 80%. Sem revisão programada, o concurseiro repete a matéria todo mês sem necessidade — e quem disse que sabe falha na prova. A gente usa o algoritmo SM-2 (a base do Anki, validada há 30 anos): cada conteúdo volta no momento exato em que você está prestes a esquecer.',
  },
  {
    icon: Timer,
    titulo: '4. Simulado no formato exato da banca',
    paragraph:
      'Cebraspe não é FGV. FGV não é VUNESP. Cada banca tem seu jeito: certo/errado com penalização, múltipla 5 alternativas, questão com 4 itens onde só 1 está certo. O simulado do Gabaritai imita 1:1 o formato da SUA banca — inclusive a regra de erro-anula-acerto quando aplicável. Você não chega na prova surpreso.',
  },
  {
    icon: Brain,
    titulo: '5. Mentor que conhece seu progresso',
    paragraph:
      'Não é chatbot genérico. O mentor sabe quais matérias você errou na última semana, qual seu ritmo, qual a data da sua prova. Quando você pergunta "o que estudar hoje?", a resposta é específica — não é "tenta isso e aquilo". É "hoje você precisa revisar Princípios Constitucionais por 40 minutos e fazer 15 questões de Direito Penal".',
  },
  {
    icon: LineChart,
    titulo: '6. Adaptação semanal automática',
    paragraph:
      'Você é mau em Português? O cronograma da próxima semana puxa mais Português. Acertou tudo de Constitucional no simulado? Constitucional vira revisão leve, e o tempo livre vai pro que falta. O sistema mede você a cada simulado e ajusta. Não tem rota fixa.',
  },
]

export default function MetodoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/cursos" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Concursos</Link>
            <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ChevronLeft className="w-3 h-3" /> Voltar pro início
        </Link>

        {/* Hero do /metodo */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/60 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Filosofia da plataforma · leitura de 5 minutos</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
            O método: como você rende mais por hora estudada
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Concurseiro não está sobrando tempo. Está sobrando conteúdo, e faltando direção. O Gabaritai
            foi feito em cima de uma ideia simples: <strong className="text-foreground">o edital é o mapa,
            o cronograma é a bússola, e o simulado é o ensaio</strong>. Tudo o resto é ruído.
          </p>
        </div>

        {/* Pilares numerados */}
        <div className="space-y-10">
          {PILARES.map((p, i) => {
            const Icon = p.icon
            return (
              <article key={i} className="grid sm:grid-cols-[60px_1fr] gap-4 sm:gap-6">
                <div className="flex sm:justify-end pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">{p.titulo}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{p.paragraph}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* Resumo do método */}
        <div className="mt-16 card p-6 sm:p-8 bg-gradient-to-br from-brand-500/5 via-card to-emerald-500/5 border-brand-500/20">
          <h2 className="text-xl font-bold tracking-tight mb-3">No frigir dos ovos</h2>
          <ul className="space-y-2 mb-5">
            {[
              'O edital decide o que você estuda — não a moda do mês.',
              'Peso da matéria decide quanto você estuda — não o seu palpite.',
              'A repetição espaçada decide quando você revisa — não a urgência de véspera.',
              'O simulado da banca decide se você está pronto — não a sua percepção otimista.',
              'Tudo isso se ajusta semanalmente, baseado no SEU desempenho.',
            ].map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Não é mágica. É método. E método se pratica todo dia, mesmo quando dá preguiça.
          </p>
        </div>

        {/* CTA com captura de email */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Quer começar com o pé direito?
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Deixa seu email e receba o <strong className="text-foreground">edital verticalizado em PDF</strong> do
            concurso que te interessa.
          </p>
          <div className="max-w-md mx-auto">
            <EmailCapture
              source="metodo-edital-pdf"
              cta="Receber edital"
              successMessage="Pronto! Chega em alguns minutos no seu email."
              hint="Sem spam · sem precisar criar conta"
            />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/planos"
              className="group inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all"
            >
              Começar 3 dias grátis
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/cursos"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold"
            >
              Ver concursos cobertos
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
