'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen, Target, Zap, Shield, Clock, FileText, ArrowRight,
  CheckCircle2, Award, BarChart3, Menu, X, Sun, Moon, Star, Eye,
  TrendingUp, Calendar, GraduationCap, Trophy, Lock, ChevronDown,
  NotebookPen, ListChecks, Sparkles, Layers,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'
import { Reveal, StaggerGroup, StaggerItem, fadeInUp } from '@/lib/motion-helpers'
import { EmailCapture } from '@/components/EmailCapture'
import { TimeBudgetCalculator } from '@/components/TimeBudgetCalculator'
import { ComparisonSection } from '@/components/ComparisonSection'
import { RemindersSection } from '@/components/RemindersSection'

// ─── DADOS ────────────────────────────────────────────────────────────────────

const DIFERENCIAIS = [
  {
    icon: BookOpen,
    title: 'Mentor que conhece seu edital',
    desc: 'Não é chatbot genérico. O mentor lê o edital exato do seu concurso, sabe seus pontos fracos pelo histórico e te orienta como um professor particular.',
    badge: 'Exclusivo',
  },
  {
    icon: Calendar,
    title: 'Cronograma que se adapta',
    desc: 'Outras plataformas vendem PDF com plano fixo. Aqui o cronograma se ajusta sozinho a cada semana, baseado no seu desempenho e nas matérias que ainda não dominou.',
    badge: 'Exclusivo',
  },
  {
    icon: Target,
    title: 'Simulado real cronometrado',
    desc: 'Toda semana, 1 simulado completo no formato exato da banca (Cebraspe certo/errado ou múltipla escolha), com cronômetro real e PDF pra imprimir.',
    badge: 'Diferencial',
  },
  {
    icon: FileText,
    title: 'Edital novo, sem atraso',
    desc: 'Quando sai edital atualizado, o sistema percebe e atualiza matérias, peso e banca do seu cronograma. Outras plataformas demoram semanas pra ajustar.',
    badge: 'Exclusivo',
  },
  {
    icon: TrendingUp,
    title: 'Repetição espaçada (SRS)',
    desc: 'Flashcards baseados em ciência do aprendizado (SuperMemo SM-2). Você revê os conteúdos no momento exato pra fixar na memória de longo prazo.',
    badge: 'Diferencial',
  },
  {
    icon: NotebookPen,
    title: 'Correção criteriosa de redação',
    desc: 'Envia sua redação e recebe correção em segundos com nota global e por critério (coesão, gramática, argumentação) e sugestão de reescrita. Treino infinito.',
    badge: 'Exclusivo',
  },
  {
    icon: Layers,
    title: 'Edital verticalizado',
    desc: 'Veja matéria por matéria do último edital: peso, assuntos mais cobrados e seu acerto em cada. Sabe exatamente onde focar.',
    badge: 'Exclusivo',
  },
  {
    icon: Trophy,
    title: 'Ranking semanal por cargo',
    desc: 'Compare sua nota com outros candidatos do mesmo concurso no simulado de domingo. Motivação extra pra estudar.',
    badge: 'Diferencial',
  },
]

const COMO_FUNCIONA = [
  {
    step: '01',
    title: 'Escolhe o concurso e cargo',
    desc: 'PF Agente, PMDF Soldado, PCDF Escrivão e outros 50+ cursos divididos por cargo específico.',
    icon: GraduationCap,
  },
  {
    step: '02',
    title: 'Recebe um plano sob medida',
    desc: 'Algoritmo distribui matérias por peso do edital, intercala estudo + revisão + questões, considera suas horas/dia e a data da prova.',
    icon: Calendar,
  },
  {
    step: '03',
    title: 'Estuda, simula, evolui',
    desc: 'Mini-simulados terça e quinta, simulado real domingo, mentor 24h, flashcards no momento certo. A cada semana você fica mais perto.',
    icon: Target,
  },
]

const CONCURSOS_DISPONIVEIS = [
  { sigla: 'PF', nome: 'Polícia Federal', cargos: ['Agente', 'Escrivão', 'Delegado', 'Papiloscopista', 'Perito'] },
  { sigla: 'PRF', nome: 'Polícia Rodoviária Federal', cargos: ['Policial Rodoviário'] },
  { sigla: 'PMDF', nome: 'PM-DF', cargos: ['Soldado', 'Oficial'] },
  { sigla: 'PMGO', nome: 'PM-GO', cargos: ['Soldado', 'Oficial'] },
  { sigla: 'PMMG', nome: 'PM-MG', cargos: ['Soldado', 'Oficial'] },
  { sigla: 'PMSC', nome: 'PM-SC', cargos: ['Soldado', 'Oficial'] },
  { sigla: 'PCDF', nome: 'Polícia Civil-DF', cargos: ['Agente', 'Escrivão', 'Delegado', 'Perito'] },
  { sigla: 'PCGO', nome: 'Polícia Civil-GO', cargos: ['Agente', 'Escrivão', 'Delegado', 'Perito'] },
  { sigla: 'PCMG', nome: 'Polícia Civil-MG', cargos: ['Investigador', 'Escrivão', 'Delegado'] },
  { sigla: 'CBMDF', nome: 'Bombeiros DF', cargos: ['Soldado', 'Oficial'] },
  { sigla: 'PPMG', nome: 'Polícia Penal', cargos: ['Agente'] },
  { sigla: 'GCM', nome: 'Guarda Civil', cargos: ['GCM Goiânia', 'GCM SP'] },
]

const BANCAS = ['Cebraspe', 'FGV', 'FCC', 'VUNESP', 'IDECAN', 'Quadrix', 'IBFC', 'AOCP', 'IADES']

// Lista de "pilares de confiança" — substituem testemunhal fabricado.
// Quando tivermos aprovados reais, este array vira `APROVADOS`
// (nome completo, foto, posição na prova, screenshot da nomeação).
const PILARES = [
  {
    icon: 'method',
    titulo: 'Método antes de hype',
    desc: 'Sem promessa fácil. O sistema é construído sobre repetição espaçada (SuperMemo SM-2), simulado no formato exato da banca e curadoria humana de cada matéria.',
  },
  {
    icon: 'transparency',
    titulo: 'Transparência total',
    desc: '7 dias de garantia incondicional. Sem fidelidade. Pague no Pix com 5% de desconto. Cancela em 2 cliques, sem ligação pra reter.',
  },
  {
    icon: 'guarantee',
    titulo: 'Conteúdo sempre atualizado',
    desc: 'Quando sai edital novo, seu cronograma atualiza automaticamente. Você nunca estuda matéria que foi removida nem perde matéria que entrou.',
  },
]

const FAQS = [
  {
    q: 'Como o Gabaritai é diferente do Gran Cursos, Estratégia e outros?',
    a: 'Eles vendem AULAS. Aqui você tem MENTORIA. O sistema conhece seu edital, sabe seus pontos fracos e te guia. Cronograma adaptativo, correção criteriosa de redação, simulados no formato exato da banca. É como ter um professor particular 24h + um plano de estudo que se ajusta a você.',
  },
  {
    q: 'Quanto tempo até eu ver resultado?',
    a: 'Nos primeiros 7 dias você já tem cronograma montado, dashboard de progresso e simulados. Em 30 dias dá pra medir evolução em pontos específicos (matéria por matéria). Quem estuda 3h/dia consistente costuma estar pronto pra prova em 4-6 meses.',
  },
  {
    q: 'Funciona pra qualquer banca?',
    a: 'Sim. O sistema usa o edital ATIVO como fonte da verdade. Se a banca é Cebraspe, simulados vêm em formato certo/errado com regra de errada-anula-certa. Se é FGV/FCC/VUNESP, vem em múltipla escolha. Tudo no estilo da banca.',
  },
  {
    q: 'O que acontece se sair edital novo?',
    a: 'O sistema detecta automaticamente e atualiza seu cronograma com novas matérias e pesos. Você é avisado e não precisa começar do zero — o progresso anterior é preservado.',
  },
  {
    q: 'E se eu não conseguir passar?',
    a: 'Garantia incondicional de 7 dias: se não gostar nos primeiros 7 dias, devolvemos 100% sem perguntar. Depois disso, continue estudando — temos casos de aprovados depois de 18 meses de uso.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. Site responsivo + PWA instalável (vira app no celular). Tudo funciona: cronograma, mentor, flashcards, simulados.',
  },
]

// ─── COMPONENTES ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition"
      aria-label="Trocar tema"
    >
      {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-card/85 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <Link href="/demo" className="text-muted-foreground hover:text-foreground transition-colors">Demo</Link>
          <Link href="/metodo" className="text-muted-foreground hover:text-foreground transition-colors">Método</Link>
          <Link href="/cursos" className="text-muted-foreground hover:text-foreground transition-colors">Concursos</Link>
          <Link href="/planos" className="text-muted-foreground hover:text-foreground transition-colors">Planos</Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-xl hover:bg-muted transition-colors">
            Entrar
          </Link>
          <Link
            href="/planos"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-all hover:shadow-md hover:shadow-brand-500/25"
          >
            Começar agora <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-xl hover:bg-muted" aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-border bg-card"
        >
          <nav className="px-4 py-3 flex flex-col gap-1 text-sm">
            <Link href="/demo" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Demo</Link>
            <Link href="/metodo" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Método</Link>
            <Link href="/cursos" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Concursos</Link>
            <Link href="/planos" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Planos</Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Blog</Link>
            <div className="border-t border-border my-2" />
            <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 font-semibold">Entrar</Link>
            <Link href="/planos" onClick={() => setOpen(false)} className="mt-1 py-2.5 text-center font-bold bg-brand-500 text-white rounded-xl">
              Começar agora
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  )
}

// Mockup tipo painel de estudo — substitui o chat-com-IA do hero anterior
function StudyDashboardMockup() {
  const tasks = [
    { label: 'Direito Constitucional · Princípios', time: '45min', done: true },
    { label: 'Português · Concordância', time: '30min', done: true },
    { label: 'Direito Penal · Crimes contra a pessoa', time: '1h', done: false },
    { label: 'Mini-simulado · 20 questões', time: '40min', done: false },
  ]
  return (
    <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-500/8 via-transparent to-emerald-500/8 border border-border p-3 sm:p-4 shadow-2xl shadow-brand-500/10">
      <div className="h-full rounded-xl bg-card border border-border overflow-hidden flex flex-col">
        {/* Header do painel */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold leading-tight">Plano de quinta · 27 mai</div>
              <div className="text-[9px] text-muted-foreground">2h15 · 4 itens</div>
            </div>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> em dia
          </div>
        </div>

        {/* Lista de tarefas */}
        <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
          {tasks.map((t, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px]',
                t.done
                  ? 'border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15 text-muted-foreground'
                  : 'border-border bg-background',
              )}
            >
              {t.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-muted-foreground/40 shrink-0" />
              )}
              <span className={cn('flex-1 font-medium', t.done && 'line-through')}>{t.label}</span>
              <span className="text-[9px] text-muted-foreground shrink-0">{t.time}</span>
            </div>
          ))}
        </div>

        {/* Progresso da semana */}
        <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold">Progresso semanal</span>
            <span className="text-muted-foreground">78%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '78%' }}
              transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Simulado domingo · 09h</span>
            <span className="inline-flex items-center gap-1"><BarChart3 className="w-2.5 h-2.5" /> ranking #142</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  const { scrollY } = useScroll()
  // efeito parallax suave no glow do fundo
  const glowY = useTransform(scrollY, [0, 600], [0, -80])

  return (
    <section className="relative overflow-hidden">
      {/* Glow decorativo de fundo (parallax suave) */}
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/8 dark:bg-brand-500/12 rounded-full blur-[120px] pointer-events-none"
      />
      <div aria-hidden className="absolute inset-0 bg-grid-pattern opacity-[0.025] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Coluna texto */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            className="text-center lg:text-left"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200/60 dark:border-brand-800/60 bg-brand-50/60 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Plataforma de estudos pra concursos militares e policiais</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.05]"
            >
              Sua farda começa com{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">método</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 h-2 bg-brand-500/15 dark:bg-brand-400/20 -z-0 rounded" />
              </span>.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Mentoria de estudos para concurseiros sérios: cronograma diário que se adapta, simulados reais cronometrados (Cebraspe, FGV, FCC), banco de questões oficiais, flashcards SRS e <strong className="text-foreground">edital verticalizado</strong> com o que mais cai.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-7 max-w-md mx-auto lg:mx-0">
              <EmailCapture
                source="hero-edital-pdf"
                placeholder="seu@email.com"
                cta="Quero meu edital + 7 dias grátis"
                successMessage="Conta criada! Em alguns minutos chega no seu email o edital verticalizado e sua senha de acesso pros 7 dias grátis."
                hint="Você recebe: ✓ edital verticalizado do curso ✓ 7 dias grátis na plataforma ✓ acesso ao cronograma personalizado · sem cartão"
                withCourseSelect
              />
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start">
              <Link
                href="/planos"
                className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all shadow-md shadow-brand-500/20 hover:shadow-lg"
              >
                Começar 7 dias grátis
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Ver demo sem cadastrar
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Trial 7 dias grátis</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Sem fidelidade</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Pagamento seguro</span>
            </motion.div>
          </motion.div>

          {/* Coluna mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative"
          >
            <StudyDashboardMockup />
            <div aria-hidden className="hidden lg:block absolute -bottom-6 -left-6 w-32 h-32 bg-brand-500/15 rounded-full blur-3xl" />
            <div aria-hidden className="hidden lg:block absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          </motion.div>
        </div>

        {/* Trust strip de bancas */}
        <Reveal delay={0.3} className="mt-16 sm:mt-20 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-4">
              Cobrimos todas as bancas que importam
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-3 opacity-70">
              {BANCAS.map((b) => (
                <span key={b} className="text-sm sm:text-base font-bold text-muted-foreground tracking-tight">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { v: '50+', l: 'Cursos por cargo' },
    { v: '9', l: 'Bancas suportadas' },
    { v: '5k+', l: 'Questões oficiais' },
    { v: '24/7', l: 'Mentor sempre on' },
  ]
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <StaggerGroup className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <StaggerItem key={s.l}>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-brand-600 to-brand-400 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{s.l}</div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}

function Diferenciais() {
  return (
    <section id="diferenciais" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-4">
            <Trophy className="w-3.5 h-3.5" /> O que só o Gabaritai tem
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Não é mais uma plataforma de aulas</h2>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            É um <strong className="text-foreground">sistema de mentoria</strong>. Aprende com você, se ajusta ao seu edital, te guia até a aprovação.
          </p>
        </Reveal>

        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFERENCIAIS.map((d) => {
            const Icon = d.icon
            return (
              <StaggerItem key={d.title}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="card p-5 hover:border-brand-500/40 hover:shadow-md hover:shadow-brand-500/5 transition-all h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      d.badge === 'Exclusivo'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                    )}>
                      {d.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mb-1.5">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </motion.div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}

function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Como funciona em 3 passos</h2>
          <p className="mt-3 text-muted-foreground">Da escolha do concurso ao dia da prova.</p>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-6 relative">
          <div aria-hidden className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          {COMO_FUNCIONA.map((s) => {
            const Icon = s.icon
            return (
              <StaggerItem key={s.step}>
                <div className="text-center relative">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card border border-border shadow-sm mb-4">
                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold">
                      {s.step}
                    </div>
                    <Icon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}

function Concursos() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Concursos cobertos</h2>
          <p className="mt-3 text-muted-foreground">
            Foco total em <strong className="text-foreground">militares e policiais</strong>. Mais de 50 cursos divididos por cargo específico.
          </p>
        </Reveal>

        <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CONCURSOS_DISPONIVEIS.map((c) => (
            <StaggerItem key={c.sigla}>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="card p-4 hover:border-brand-500/40 hover:shadow-md transition-all"
              >
                <div className="font-bold text-brand-600 dark:text-brand-400 text-lg tracking-tight">{c.sigla}</div>
                <div className="text-xs text-muted-foreground truncate">{c.nome}</div>
                <div className="text-[10px] text-muted-foreground mt-2 italic">{c.cargos.join(' · ')}</div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal delay={0.1} className="text-center mt-8">
          <Link href="/cursos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors group">
            Ver todos os cursos e cargos
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function Depoimentos() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" /> Plataforma nova · honestidade primeiro
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Sem depoimentos forjados
          </h2>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            O Gabaritai é uma plataforma nova. Em vez de inventar histórias de aprovados,
            preferimos te mostrar exatamente <strong className="text-foreground">o que sustenta o produto</strong>.
          </p>
        </Reveal>

        <StaggerGroup className="grid sm:grid-cols-3 gap-4 mb-10">
          {PILARES.map((p) => (
            <StaggerItem key={p.titulo}>
              <div className="card p-5 h-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="text-center">
          <Link
            href="/historias"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
          >
            Quer ser o primeiro aprovado destacado?
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

// ── Planos: 3 niveis × 2 ciclos (mensal/anual) ─────────────────────────────
//
// Regra do limite de cursos:
//  - Plano "1 curso": maxCourses=1, troca livre (cancela o ativo e ativa outro)
//  - Plano "2 cursos": maxCourses=2, mesma regra de troca
//  - Plano "Todos": maxCourses=null, sem limite
//
// Tentou ativar curso além do limite? UI bloqueia + sugere upgrade.
// Configuração concreta dos limites vive em PricingPlan.maxCourses no banco
// (campo já existe). Backend de access control deve respeitar isso.
const PLANOS = {
  '1-curso': {
    nome: '1 curso',
    desc: 'Pra quem foca num cargo só',
    limite: '1 curso ativo · troca livre',
    highlight: false,
    features: [
      '1 curso ativo por vez',
      'Troca de concurso quando quiser',
      'Cronograma adaptativo',
      'Mentor 24h',
      '3 simulados por semana',
      'Flashcards SRS',
      'Correção de redação',
    ],
    mensal: { priceLabel: '24,99', slug: 'mensal-1-curso' },
    anual: { priceLabel: '197', mensalEquivLabel: '16,42', economia: 34, slug: 'anual-1-curso' },
  },
  '2-cursos': {
    nome: '2 cursos',
    desc: 'Pra quem está prestando 2 concursos juntos',
    limite: 'Até 2 cursos simultâneos',
    highlight: true,
    features: [
      'Até 2 cursos ativos ao mesmo tempo',
      'Troca livre entre eles',
      'Tudo do plano de 1 curso',
      'Cronograma único integrado',
      'Simulados de ambos os concursos',
    ],
    mensal: { priceLabel: '39,99', slug: 'mensal-2-cursos' },
    anual: { priceLabel: '297', mensalEquivLabel: '24,75', economia: 38, slug: 'anual-2-cursos' },
  },
  'todos': {
    nome: 'Todos os cursos',
    desc: 'Acesso completo · sem limite de cargo',
    limite: 'Todos os cursos sem limite',
    highlight: false,
    features: [
      'TODOS os cursos da plataforma',
      'Sem limite de cursos ativos',
      'Tudo dos planos anteriores',
      'Acesso automático a edital novo',
      'Suporte prioritário',
      'Comunidade VIP',
    ],
    mensal: { priceLabel: '89,99', slug: 'mensal-todos' },
    anual: { priceLabel: '697', mensalEquivLabel: '58,08', economia: 35, slug: 'anual-todos' },
  },
} as const

type PlanKey = keyof typeof PLANOS

function Planos() {
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('anual')

  return (
    <section id="planos" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Planos pra cada momento</h2>
          <p className="mt-3 text-muted-foreground">
            Garantia incondicional de 7 dias. <strong className="text-foreground">Pix com 5% de desconto</strong>.
            Sem fidelidade — cancela quando quiser.
          </p>
        </Reveal>

        {/* Toggle Mensal | Anual */}
        <Reveal className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => setCiclo('mensal')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                ciclo === 'mensal' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCiclo('anual')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all inline-flex items-center gap-2',
                ciclo === 'anual' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Anual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                até -38%
              </span>
            </button>
          </div>
        </Reveal>

        {/* 3 cards */}
        <StaggerGroup className="grid md:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {(Object.keys(PLANOS) as PlanKey[]).map((key) => {
            const p = PLANOS[key]
            const ativo = ciclo === 'mensal' ? p.mensal : p.anual
            const isMensal = ciclo === 'mensal'
            return (
              <StaggerItem key={key}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'card p-6 flex flex-col gap-3 relative h-full transition-all',
                    p.highlight && 'ring-2 ring-brand-500 shadow-xl shadow-brand-500/15',
                  )}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
                      MAIS ESCOLHIDO
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{p.nome}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{p.desc}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[10px] font-semibold">
                      {p.limite}
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight tabular-nums">
                        R$ {ativo.priceLabel}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {isMensal ? '/mês' : '/ano'}
                      </span>
                    </div>
                    {!isMensal && 'mensalEquivLabel' in ativo && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        ≈ R$ {ativo.mensalEquivLabel}/mês ·{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          economia de {ativo.economia}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/checkout/${ativo.slug}`}
                    className={cn(
                      'mt-2 rounded-xl py-2.5 text-center text-sm font-semibold transition-all',
                      p.highlight
                        ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:-translate-y-0.5'
                        : 'border border-border bg-background hover:bg-muted',
                    )}
                  >
                    Assinar {isMensal ? 'mensal' : 'anual'}
                  </Link>
                </motion.div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>

        {/* Trial faixa abaixo dos planos */}
        <Reveal className="mt-8 max-w-3xl mx-auto">
          <div className="rounded-xl border border-dashed border-emerald-300/60 dark:border-emerald-700/40 bg-emerald-50/30 dark:bg-emerald-900/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-center sm:text-left">
              <strong className="text-foreground">Antes de assinar?</strong>{' '}
              <span className="text-muted-foreground">7 dias grátis · sem cartão · cancela em 2 cliques</span>
            </div>
            <Link
              href="/checkout/trial-7-dias"
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 inline-flex items-center gap-1 group"
            >
              Começar trial
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Perguntas frequentes</h2>
        </Reveal>

        <StaggerGroup className="space-y-2">
          {FAQS.map((f, i) => (
            <StaggerItem key={i}>
              <div className="card overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="font-semibold text-sm">{f.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                </motion.div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}

function CtaFinal() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <div className="relative card p-8 sm:p-14 border-brand-500/30 bg-gradient-to-br from-brand-500/8 via-card to-emerald-500/5 overflow-hidden">
            <div aria-hidden className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/15 rounded-full blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Comece hoje. Sem cartão.</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                7 dias pra explorar tudo. Se não te servir, sai sem dever nada — nem precisa pedir.
              </p>
              <Link
                href="/planos"
                className="group mt-6 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/25 hover:-translate-y-0.5"
              >
                Começar agora
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <Logo size="md" />
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Plataforma de mentoria para concursos militares e policiais. Cronograma adaptativo, simulados reais e mentor sempre disponível.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Produto</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/cursos" className="hover:text-foreground transition-colors">Concursos</Link></li>
            <li><Link href="/planos" className="hover:text-foreground transition-colors">Planos</Link></li>
            <li><a href="#diferenciais" className="hover:text-foreground transition-colors">Diferenciais</a></li>
            <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Empresa</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/sobre" className="hover:text-foreground transition-colors">Sobre</Link></li>
            <li><Link href="/termos" className="hover:text-foreground transition-colors">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Conta</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground transition-colors">Entrar</Link></li>
            <li><Link href="/registro" className="hover:text-foreground transition-colors">Criar conta</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Gabaritai · Plataforma de mentoria para concursos públicos
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Stats />
      <TimeBudgetCalculator />
      <Diferenciais />
      <ComoFunciona />
      <RemindersSection />
      <ComparisonSection />
      <Concursos />
      <Depoimentos />
      <Planos />
      <FAQ />
      <CtaFinal />
      <Footer />
    </div>
  )
}
