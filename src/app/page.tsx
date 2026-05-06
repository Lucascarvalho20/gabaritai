'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Brain, Target, Zap, Shield, TrendingUp, Clock, BookOpen,
  Star, ChevronRight, CheckCircle2, Award, BarChart3,
  Sparkles, ArrowRight, Play, Menu, X, Sun, Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Logo } from '@/components/ui/logo'

const CONCURSOS = [
  'PMDF', 'Polícia Federal', 'Polícia Civil-DF', 'Banco do Brasil',
  'Caixa Econômica', 'TJDFT', 'Polícia Legislativa', 'CNU', 'PRF'
]

const PLANOS = [
  {
    name: 'Básico',
    price: 'R$ 59',
    period: '/mês',
    description: 'Ideal para começar',
    color: 'from-slate-500 to-slate-600',
    features: [
      '1 concurso à sua escolha',
      'Cronograma inteligente',
      'Banco de questões (ilimitado)',
      'Flashcards com IA',
      'Simulados semanais',
      'Dashboard de progresso',
    ],
    cta: 'Começar agora',
    popular: false,
  },
  {
    name: 'Premium',
    price: 'R$ 97',
    period: '/mês',
    description: 'O mais escolhido',
    color: 'from-brand-600 to-purple-600',
    features: [
      'Concursos ilimitados',
      'Mentor IA avançado (24/7)',
      'Simulados adaptativos',
      'Análise preditiva de aprovação',
      'Flashcards + repetição espaçada',
      'Relatórios detalhados',
      'Comunidade exclusiva',
      'Suporte prioritário',
    ],
    cta: 'Começar premium',
    popular: true,
  },
  {
    name: 'Vitalício',
    price: 'R$ 897',
    period: 'único',
    description: 'Acesso para sempre',
    color: 'from-yellow-500 to-orange-500',
    features: [
      'Tudo do Premium',
      'Acesso vitalício',
      'Todas as atualizações',
      'IA com memória permanente',
      'Mentorias individuais',
      'Acesso a novos concursos',
    ],
    cta: 'Garantir vitalício',
    popular: false,
  },
]

const RECURSOS = [
  {
    icon: Brain,
    title: 'Mentor IA Adaptativo',
    desc: 'A IA aprende seu ritmo, identifica pontos fracos e cria um plano único para você. Como ter um professor particular disponível 24h.',
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-900/20',
  },
  {
    icon: Target,
    title: 'Banco de Questões Inteligente',
    desc: 'Questões inéditas geradas no estilo da sua banca, com explicações detalhadas e embasamento legal e jurisprudencial.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: Zap,
    title: 'Flashcards com Repetição Espaçada',
    desc: 'Sistema Anki-like gerado automaticamente pela IA com base nos seus erros. Memorize mais em menos tempo.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    icon: BarChart3,
    title: 'Simulados Adaptativos',
    desc: 'Simulados semanais no estilo da sua banca, focando nos seus pontos fracos. Relatório completo após cada simulado.',
    color: 'text-success-600',
    bg: 'bg-success-50 dark:bg-success-600/10',
  },
  {
    icon: Clock,
    title: 'Cronograma Inteligente',
    desc: 'A IA calcula a viabilidade de fechar o edital no prazo e ajusta o cronograma dinamicamente conforme seu progresso.',
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-900/20',
  },
  {
    icon: TrendingUp,
    title: 'Análise de Desempenho',
    desc: 'Dashboard completo com gráficos de evolução, taxa de acerto por matéria e projeção de aprovação em tempo real.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
]

const DEPOIMENTOS = [
  {
    name: 'Lucas M.',
    cargo: '✅ Aprovado — PMDF 2024',
    texto: 'Fiz 3 concursos antes sem passar. No quarto, usei o GabaritAI. Diferença? A IA sabia que eu travava em questões de Constitucional sob pressão. Me fez treinar exatamente isso. Passei.',
    stars: 5,
    avatar: 'LM',
    concurso: 'PMDF',
  },
  {
    name: 'Fernanda C.',
    cargo: '✅ Aprovada — Banco do Brasil 2024',
    texto: 'Estudei 6 meses numa plataforma de vídeo e não passei. Mudei pro GabaritAI, estudei 3 meses só com questões e flashcards adaptativos. O cronograma foi cirúrgico. Resultado: aprovada.',
    stars: 5,
    avatar: 'FC',
    concurso: 'BB',
  },
  {
    name: 'Rafael O.',
    cargo: '✅ Top 10 — PF 2023',
    texto: 'Não tem professor aqui. Tem algo melhor: uma IA que te conhece melhor do que você mesmo. Ela sabia que eu erraria questões de atenção difusa numa sexta depois das 21h. Virei meu horário.',
    stars: 5,
    avatar: 'RO',
    concurso: 'PF',
  },
]

const STATS = [
  { value: '17', label: 'Cursos disponíveis' },
  { value: '94%', label: 'Taxa de satisfação' },
  { value: '180+', label: 'Concursos cobertos' },
  { value: '2.5M+', label: 'Questões resolvidas' },
]

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl hover:bg-muted transition-colors"
      aria-label="Alternar tema"
    >
      {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [concursoIdx, setConcursoIdx] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setConcursoIdx(i => (i + 1) % CONCURSOS.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border' : ''}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            {[['#recursos', 'Recursos'], ['#como-funciona', 'Como funciona'], ['#planos', 'Planos'], ['#depoimentos', 'Depoimentos']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/registro" className="btn-primary btn-md hidden sm:flex">
              Começar grátis
            </Link>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="md:hidden bg-background border-b border-border px-4 py-4 flex flex-col gap-3 animate-slide-up">
            {[['#recursos', 'Recursos'], ['#como-funciona', 'Como funciona'], ['#planos', 'Planos'], ['#depoimentos', 'Depoimentos']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">{label}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Link href="/login" className="btn-outline btn-md flex-1">Entrar</Link>
              <Link href="/registro" className="btn-primary btn-md flex-1">Começar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-brand-200 dark:border-brand-800">
            <Sparkles className="w-4 h-4" />
            Novo jeito de estudar para concursos — sem videoaula, sem enrolação
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight mb-6 text-balance">
            Sua IA de estudos para{' '}
            <span className="gradient-text dark:gradient-text-dark">
              {CONCURSOS[concursoIdx]}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            Sem professor, sem vídeo de 3 horas. A IA analisa o edital, monta seu plano, identifica o que você está errando e ajusta tudo em tempo real.
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-10">
            É como ter um preparador particular disponível 24h — por menos de R$&nbsp;3 por dia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/registro" className="btn-primary btn-xl group">
              Começar grátis agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#como-funciona" className="btn-outline btn-xl group">
              <Play className="w-5 h-5" />
              Ver como funciona
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {['Sem cartão de crédito', '7 dias grátis', 'Cancele quando quiser'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div className="card overflow-hidden shadow-2xl">
            <div className="bg-dark-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                {['bg-red-500','bg-yellow-500','bg-green-500'].map((c,i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${c}`} />
                ))}
              </div>
              <div className="flex-1 bg-dark-600 rounded-md h-5 mx-4 text-xs text-gray-400 flex items-center px-3">
                gabaritai.com.br/dashboard
              </div>
            </div>
            <div className="bg-gradient-to-br from-dark-900 to-dark-800 p-6 min-h-48 grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-3">
                <div className="text-white font-semibold text-sm">Bom dia, João! Hora de estudar 🎯</div>
                <div className="bg-dark-600/60 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Hoje no cronograma</div>
                  <div className="text-white text-sm font-medium">Direito Constitucional — Art. 5º</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 flex-1 bg-dark-400 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full" />
                    </div>
                    <span className="text-xs text-gray-400">67%</span>
                  </div>
                </div>
                <div className="bg-brand-900/40 rounded-xl p-3 border border-brand-700/30">
                  <div className="text-xs text-brand-300 mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Mentor IA
                  </div>
                  <div className="text-white text-xs">Você errou 3 questões sobre inviolabilidade domiciliar hoje. Vou adicionar 5 flashcards focados nisso para amanhã! 💡</div>
                </div>
              </div>
              <div className="space-y-3">
                {[['Taxa de acerto', '78%', 'text-success-400'], ['Sequência', '12 dias', 'text-yellow-400'], ['Questões hoje', '47/50', 'text-brand-400']].map(([label, val, color]) => (
                  <div key={label} className="bg-dark-600/60 rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold ${color}`}>{val}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-4 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl sm:text-4xl font-black gradient-text dark:gradient-text-dark mb-1">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* POR QUE FUNCIONA SEM PROFESSOR */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="badge-red mb-4">A verdade que ninguém te conta</div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-4">
              Professor não passa você. <br className="hidden sm:block" />
              <span className="gradient-text dark:gradient-text-dark">Consistência passa.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Concurseiros que passam em menos tempo não assistiram mais videoaulas. Eles estudaram de forma mais inteligente — sabendo o que revisar, quando revisar e por quê.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                tipo: '❌ Método antigo',
                cor: 'border-danger-200 dark:border-danger-800/40 bg-danger-50/30 dark:bg-danger-900/10',
                itens: [
                  'Assiste 4h de vídeo e esquece no dia seguinte',
                  'Não sabe qual matéria priorizar',
                  'Faz questões sem analisar os erros',
                  'Cronograma que abandona na semana 2',
                  'Estuda tudo igual, passando pouco tempo no ponto fraco',
                ],
              },
              {
                tipo: '✅ Método GabaritAI',
                cor: 'border-success-200 dark:border-success-800/40 bg-success-50/30 dark:bg-success-900/10',
                itens: [
                  'Flashcards e questões ativas que fixam na memória',
                  'IA rankeia as matérias pelo peso no edital E no seu desempenho',
                  'Cada erro vira um flashcard personalizado automático',
                  'Cronograma que se ajusta quando você falta um dia',
                  'Revisão espaçada: você toca só onde realmente precisa',
                ],
              },
            ].map(({ tipo, cor, itens }) => (
              <div key={tipo} className={`card p-6 border-2 ${cor}`}>
                <p className="font-bold text-foreground mb-4">{tipo}</p>
                <ul className="space-y-2.5">
                  {itens.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 shrink-0">{tipo.startsWith('❌') ? '—' : '→'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge-blue mb-4">Funcionalidades</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-4">
              Tudo que você precisa para ser aprovado
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa que vai além do simples banco de questões. É um sistema inteligente que evolui com você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RECURSOS.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card-hover p-6 group">
                <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge-purple mb-4">Método</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-4">
              Como o GabaritAI funciona?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em menos de 5 minutos você já tem um plano de estudos personalizado e está estudando.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '01', icon: BookOpen, color: 'bg-brand-500',
                title: 'Informe seu concurso e rotina',
                desc: 'Conta pra nós qual concurso você quer passar, quantas horas por dia pode estudar e qual é a data da prova. Simples assim.',
              },
              {
                step: '02', icon: Brain, color: 'bg-purple-500',
                title: 'A IA analisa e cria seu plano',
                desc: 'Nossa IA interpreta o edital, mapeia todas as matérias e cria um cronograma personalizado, calculando se é viável fechar o edital no prazo.',
              },
              {
                step: '03', icon: Target, color: 'bg-success-600',
                title: 'Estude, a IA aprende com você',
                desc: 'A cada questão respondida e flashcard revisado, a IA ajusta o plano em tempo real, priorizando seus pontos fracos.',
              },
              {
                step: '04', icon: Award, color: 'bg-yellow-500',
                title: 'Chegue à prova preparado',
                desc: 'Simulados no estilo da sua banca, relatórios de desempenho e análise preditiva te mostram exatamente onde você está.',
              },
            ].map(({ step, icon: Icon, color, title, desc }) => (
              <div key={step} className="card p-6 flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-muted-foreground mb-1">PASSO {step}</div>
                  <h3 className="font-bold text-lg text-foreground mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONCURSOS */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="badge-green mb-4">Concursos cobertos</div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-8">
            Carreiras policiais, bancos e muito mais
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['PMDF', 'Polícia Federal', 'Polícia Civil-DF', 'PRF', 'Polícia Legislativa', 'Banco do Brasil', 'Caixa Econômica Federal', 'TJDFT', 'CNU', 'PCDF', 'CBMDF', 'DEPEN', 'STJ', 'STF'].map(c => (
              <span key={c} className="badge-blue py-2 px-4 text-sm font-medium">{c}</span>
            ))}
            <span className="badge py-2 px-4 text-sm font-medium bg-muted text-muted-foreground">+170 outros</span>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge-yellow mb-4">Planos</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-4">
              Invista na sua aprovação
            </h2>
            <p className="text-lg text-muted-foreground">
              Comece grátis por 7 dias. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANOS.map(({ name, price, period, description, color, features, cta, popular }) => (
              <div key={name} className={`relative card p-6 flex flex-col ${popular ? 'ring-2 ring-brand-500' : ''}`}>
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-600 text-white px-4 py-1">
                    Mais popular
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-sm text-muted-foreground mb-1">{description}</div>
                <div className="font-black text-foreground mb-1">
                  <span className="text-3xl">{price}</span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                <div className="text-xl font-bold text-foreground mb-4">{name}</div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/registro"
                  className={`${popular ? 'btn-primary' : 'btn-outline'} btn-md w-full justify-center`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge-blue mb-4">Depoimentos</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-4">
              Quem usou, aprovou
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {DEPOIMENTOS.map(({ name, cargo, texto, stars, avatar }) => (
              <div key={name} className="card p-6">
                <div className="flex mb-3">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{name}</div>
                    <div className="text-xs text-success-600 dark:text-success-400 font-medium">{cargo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card p-10 bg-gradient-to-br from-brand-600 to-purple-600 border-0 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Sua aprovação começa hoje
              </h2>
              <p className="text-white/80 mb-8 text-lg max-w-xl mx-auto">
                Plataforma de mentoria IA para concursos públicos do DF e Brasil. Comece grátis por 7 dias, sem cartão de crédito.
              </p>
              <Link href="/registro" className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-bold btn-xl rounded-2xl transition-colors">
                Criar conta grátis
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo className="mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mentoria inteligente para concursos públicos com IA adaptativa.
              </p>
            </div>
            {[
              { title: 'Plataforma', links: ['Recursos', 'Como funciona', 'Planos', 'Blog'] },
              { title: 'Concursos', links: ['PMDF', 'Polícia Federal', 'Banco do Brasil', 'TJDFT'] },
              { title: 'Empresa', links: ['Sobre nós', 'Termos de uso', 'Privacidade', 'Contato'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-sm text-foreground mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2024 GabaritAI. Todos os direitos reservados.</p>
            <p className="text-xs text-muted-foreground">Desenvolvido com ❤️ para concurseiros brasileiros</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
