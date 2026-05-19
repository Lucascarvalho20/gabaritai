'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Brain, Target, Zap, Shield, Clock, FileText, Sparkles, ArrowRight,
  CheckCircle2, Award, BarChart3, Menu, X, Sun, Moon, Star, Users,
  TrendingUp, Calendar, Bot, Trophy, Lock, ChevronDown, Play,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

// ─── DADOS PRÓPRIOS DO SITE ───────────────────────────────────────────────────

const DIFERENCIAIS = [
  {
    icon: Brain,
    title: 'Mentor IA que conhece seu edital',
    desc: 'Não é chatbot genérico. A IA puxa o edital exato do seu concurso, sabe seus pontos fracos pelo histórico e te orienta como um professor particular.',
    badge: 'Exclusivo',
  },
  {
    icon: Calendar,
    title: 'Cronograma adaptativo (não estático)',
    desc: 'Outras plataformas vendem PDF com plano fixo. Aqui o cronograma se ajusta sozinho a cada semana baseado no seu desempenho e nas matérias que você ainda não dominou.',
    badge: 'Exclusivo',
  },
  {
    icon: Target,
    title: 'Simulado real cronometrado no domingo',
    desc: 'Toda semana 1 simulado completo no formato exato do edital (Cebraspe certo/errado ou múltipla escolha), com cronômetro real e PDF pra imprimir.',
    badge: 'Diferencial',
  },
  {
    icon: FileText,
    title: 'Detecção automática de edital novo',
    desc: 'Quando sai edital novo, nosso sistema percebe e atualiza matéria, peso e banca do seu cronograma. Outras plataformas demoram semanas pra atualizar.',
    badge: 'Exclusivo',
  },
  {
    icon: TrendingUp,
    title: 'Repetição espaçada com SRS',
    desc: 'Flashcards baseados em ciência do aprendizado (SuperMemo SM-2). Você revê os conteúdos no momento exato pra fixar na memória de longo prazo.',
    badge: 'Diferencial',
  },
  {
    icon: Award,
    title: 'Correção de redação por IA',
    desc: 'Manda sua redação → IA corrige em segundos com nota global e por critério (coesão, gramática, argumentação) + sugestão de reescrita. Treino infinito.',
    badge: 'Exclusivo',
  },
  {
    icon: FileText,
    title: 'Edital verticalizado',
    desc: 'Veja matéria por matéria do último edital: peso, assuntos mais cobrados e seu acerto em cada. Sabe exatamente onde focar.',
    badge: 'Exclusivo',
  },
  {
    icon: Trophy,
    title: 'Ranking semanal por curso',
    desc: 'Compare sua nota com outros alunos do mesmo concurso no simulado de domingo. Motivação extra pra estudar.',
    badge: 'Diferencial',
  },
]

const COMO_FUNCIONA = [
  {
    step: '01',
    title: 'Escolhe o concurso e cargo',
    desc: 'PF Agente, PMDF Soldado, PCDF Escrivão, etc. Mais de 50 cursos divididos por cargo específico.',
  },
  {
    step: '02',
    title: 'IA monta seu cronograma',
    desc: 'Algoritmo distribui matérias por peso do edital, intercala estudo+revisão+questões, considera horas/dia e data da prova.',
  },
  {
    step: '03',
    title: 'Estuda, faz simulado, evolui',
    desc: 'Mini-simulados terça e quinta, simulado real domingo, mentor IA 24h, flashcards no momento certo. A cada semana você fica mais perto.',
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

const DEPOIMENTOS = [
  {
    nome: 'Mateus L.',
    cargo: 'Aprovado PMDF Soldado 2024',
    foto: '👮',
    texto: 'Estudei 8 meses pelo Gabaritai. O simulado de domingo me fez sentir a prova antes da prova. Passei em 47º lugar.',
  },
  {
    nome: 'Ana C.',
    cargo: 'Aprovada PCDF Escrivã 2024',
    foto: '👩‍⚖️',
    texto: 'O mentor IA salvou minha redação. Refiz umas 30 vezes até ter nota máxima nos critérios. Hoje sou escrivã.',
  },
  {
    nome: 'Roberto S.',
    cargo: 'Aprovado PF Agente 2024',
    foto: '🚓',
    texto: 'Outras plataformas me afogaram em conteúdo. Aqui o cronograma me disse exatamente o que estudar a cada dia.',
  },
]

const FAQS = [
  {
    q: 'Como o Gabaritai é diferente do Gran Cursos, Estratégia, etc?',
    a: 'Eles vendem AULAS. Aqui você tem MENTORIA. A IA conhece seu edital, sabe seus pontos fracos e te guia. Cronograma adaptativo, correção de redação automática, simulados no formato exato da banca. É como ter um professor particular 24h + um sistema de estudo que se ajusta a você.',
  },
  {
    q: 'Quanto tempo até eu ver resultado?',
    a: 'Os primeiros 7 dias você já tem cronograma montado, dashboard de progresso e simulados. Em 30 dias já dá pra medir evolução em pontos específicos (matéria por matéria). Quem estuda 3h/dia consistente costuma estar pronto pra prova em 4-6 meses.',
  },
  {
    q: 'Funciona pra qualquer banca?',
    a: 'Sim. O sistema usa o edital ATIVO como fonte da verdade. Se a banca é Cebraspe, simulados vêm em formato certo/errado com regra de errada-anula-certa. Se é FGV/FCC/VUNESP, vem em múltipla escolha. A IA imita o estilo da banca.',
  },
  {
    q: 'O que acontece se sair edital novo?',
    a: 'Nosso sistema detecta automaticamente e atualiza seu cronograma com novas matérias e pesos. Você é avisado e não precisa começar do zero — o progresso anterior é preservado.',
  },
  {
    q: 'E se eu não conseguir passar?',
    a: 'Garantia incondicional de 7 dias: se não gostar nos primeiros 7 dias, devolvemos 100% sem perguntar. Depois disso, continue estudando — temos casos de aprovados depois de 18 meses de uso.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. Site responsivo + PWA instalável (vira app no celular). Tudo funciona: cronograma, mentor IA, flashcards, simulados.',
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
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#diferenciais" className="text-muted-foreground hover:text-foreground transition">Diferenciais</a>
          <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition">Como funciona</a>
          <Link href="/cursos" className="text-muted-foreground hover:text-foreground transition">Concursos</Link>
          <Link href="/planos" className="text-muted-foreground hover:text-foreground transition">Planos</Link>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-xl hover:bg-muted">
            Entrar
          </Link>
          <Link href="/planos" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition">
            Começar agora <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-xl hover:bg-muted">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="px-4 py-3 flex flex-col gap-1 text-sm">
            <a href="#diferenciais" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Diferenciais</a>
            <a href="#como-funciona" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Como funciona</a>
            <Link href="/cursos" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Concursos</Link>
            <Link href="/planos" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">Planos</Link>
            <a href="#faq" onClick={() => setOpen(false)} className="py-2.5 hover:text-brand-500">FAQ</a>
            <div className="border-t border-border my-2" />
            <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 font-semibold">Entrar</Link>
            <Link href="/planos" onClick={() => setOpen(false)} className="mt-1 py-2.5 text-center font-bold bg-brand-500 text-white rounded-xl">
              Começar agora
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mentoria IA pra concursos militares e policiais</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Sua farda começa <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">aqui</span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <strong>Plataforma de mentoria pra concurseiros</strong>: cronograma diário · simulados reais cronometrados (Cebraspe, FGV, FCC) · mini-simulados · banco de questões oficiais + IA · flashcards SRS · mapas mentais · <strong>edital verticalizado</strong> com matérias e assuntos mais cobrados.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/planos"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition shadow-lg shadow-brand-500/25"
              >
                Começar 3 dias grátis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/cursos"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card hover:bg-muted font-semibold transition"
              >
                Ver concursos disponíveis
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-4 justify-center lg:justify-start text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> 7 dias garantia</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Cancela quando quiser</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Pagamento seguro</span>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-border p-4 shadow-2xl">
              <div className="h-full rounded-xl bg-card border border-border p-5 flex flex-col gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Mentor Gabaritai</div>
                    <div className="text-[10px] text-muted-foreground">Online · Conhece seu edital</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted text-foreground">
                  Bom dia! Vi que você errou 3 questões de Direito Constitucional ontem. Vamos revisar os incisos do art. 5º antes do seu simulado de domingo?
                </div>
                <div className="self-end p-2.5 rounded-lg bg-brand-500 text-white max-w-[80%]">
                  Bora. Pode me dar um resumo rápido?
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  Beleza. Foco em 3 pontos hoje (8 min): princípio da legalidade, direitos individuais e coletivos, e garantias fundamentais...
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Cronograma adaptativo</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Target className="w-3 h-3" /> Simulado domingo 9h</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block absolute -bottom-6 -left-6 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl" />
            <div className="hidden lg:block absolute -top-6 -right-6 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {[
          { v: '50+', l: 'Cursos por cargo' },
          { v: '9', l: 'Bancas suportadas' },
          { v: '∞', l: 'Questões geradas' },
          { v: '24/7', l: 'Mentor IA' },
        ].map((s) => (
          <div key={s.l}>
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Diferenciais() {
  return (
    <section id="diferenciais" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold mb-4">
            <Trophy className="w-3.5 h-3.5" /> O que só o Gabaritai tem
          </div>
          <h2 className="text-3xl sm:text-4xl font-black">Não é mais uma plataforma de aulas</h2>
          <p className="mt-3 text-muted-foreground">
            É um <strong>sistema de mentoria</strong>. Aprende com você, se ajusta ao seu edital, te guia até a aprovação.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFERENCIAIS.map((d) => {
            const Icon = d.icon
            return (
              <div key={d.title} className="card p-5 hover:border-brand-500/40 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    d.badge === 'Exclusivo' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                  )}>
                    {d.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">{d.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-black">Como funciona em 3 passos</h2>
          <p className="mt-3 text-muted-foreground">Da escolha do concurso ao dia da prova.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-brand-500 to-purple-500 opacity-20" />
          {COMO_FUNCIONA.map((s) => (
            <div key={s.step} className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white font-black text-2xl mb-4 shadow-lg shadow-brand-500/25">
                {s.step}
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Concursos() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-black">Concursos cobertos</h2>
          <p className="mt-3 text-muted-foreground">
            Foco total em <strong>militares e policiais</strong>. Mais de 50 cursos divididos por cargo específico.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CONCURSOS_DISPONIVEIS.map((c) => (
            <div key={c.sigla} className="card p-4 hover:border-brand-500/40 transition">
              <div className="font-black text-brand-600 dark:text-brand-400 text-lg">{c.sigla}</div>
              <div className="text-xs text-muted-foreground truncate">{c.nome}</div>
              <div className="text-[10px] text-muted-foreground mt-2 italic">{c.cargos.join(' · ')}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/cursos" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:underline">
            Ver todos os cursos e cargos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Depoimentos() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-black">Aprovados de verdade</h2>
          <p className="mt-3 text-muted-foreground">Não somos só promessa.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {DEPOIMENTOS.map((d, i) => (
            <div key={i} className="card p-5">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />)}
              </div>
              <p className="text-sm leading-relaxed mb-4">"{d.texto}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="text-3xl">{d.foto}</div>
                <div>
                  <div className="font-bold text-sm">{d.nome}</div>
                  <div className="text-[10px] text-muted-foreground">{d.cargo}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Planos() {
  const planos = [
    {
      slug: 'trial',
      name: 'Trial Grátis',
      price: 0,
      pricePretty: 'R$ 0',
      period: '3 dias',
      desc: 'Conhece a plataforma sem cartão',
      features: ['1 curso à escolha', 'Cronograma completo', 'Mentor IA', '3 mini-simulados'],
      cta: 'Começar grátis',
      highlight: false,
    },
    {
      slug: 'mensal',
      name: 'Mensal',
      price: 39.90,
      pricePretty: 'R$ 39,90',
      period: '/mês',
      desc: '1 curso · pra quem tá começando',
      features: ['1 curso à escolha', 'Mentor IA 24h', 'Simulados terça, quinta e domingo', 'Flashcards SRS', 'Correção de redação'],
      cta: 'Assinar',
      highlight: false,
    },
    {
      slug: 'anual',
      name: 'Anual',
      price: 297,
      pricePretty: 'R$ 297',
      period: '/ano',
      desc: 'Economia de 38% · mais escolhido',
      features: ['1 curso à escolha', 'Tudo do mensal', 'Acesso a edital novo', 'Suporte prioritário', 'Cancela quando quiser'],
      cta: 'Assinar anual',
      highlight: true,
    },
    {
      slug: 'vitalicio',
      name: 'Vitalício',
      price: 1997,
      pricePretty: 'R$ 1.997',
      period: 'único',
      desc: 'Limitado a 100 vagas · vale a vida toda',
      features: ['TODOS os cursos', 'Acesso vitalício', 'Atualizações pra sempre', 'IA com memória permanente', 'Comunidade VIP'],
      cta: 'Garantir vitalício',
      highlight: false,
      badge: '🏆 Edição limitada',
    },
  ]

  return (
    <section id="planos" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-black">Planos pra cada momento</h2>
          <p className="mt-3 text-muted-foreground">
            Garantia incondicional de 7 dias. Pague no Pix com <strong>5% de desconto</strong>.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {planos.map((p) => (
            <div
              key={p.slug}
              className={cn(
                'card p-5 flex flex-col gap-3 relative',
                p.highlight && 'ring-2 ring-brand-500 shadow-xl shadow-brand-500/10',
              )}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                  MAIS ESCOLHIDO
                </div>
              )}
              {p.badge && (
                <div className="text-[10px] font-bold text-yellow-700 dark:text-yellow-300">{p.badge}</div>
              )}
              <div>
                <h3 className="font-black text-lg">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <div>
                <span className="text-3xl font-black">{p.pricePretty}</span>
                <span className="text-xs text-muted-foreground ml-1">{p.period}</span>
              </div>
              <ul className="space-y-1.5 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-xs">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout/${p.slug}`}
                className={cn(
                  'mt-2 rounded-xl py-2.5 text-center text-sm font-bold transition',
                  p.highlight
                    ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                    : 'border border-border bg-background hover:bg-muted',
                )}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="py-16 sm:py-24 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black">Perguntas frequentes</h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition"
              >
                <span className="font-bold text-sm">{f.q}</span>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaFinal() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="card p-8 sm:p-12 bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-transparent border-brand-500/30">
          <h2 className="text-3xl sm:text-4xl font-black">Comece hoje. Pague nada por 3 dias.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Sem cartão de crédito. Sem letra miúda. Se não gostar, sai sem dever nada.
          </p>
          <Link
            href="/planos"
            className="mt-6 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition shadow-xl shadow-brand-500/25"
          >
            Começar agora <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <Logo size="md" />
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Mentoria com IA pra concursos militares e policiais. Cronograma adaptativo, simulados reais, mentor 24h.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Produto</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/cursos" className="hover:text-foreground">Concursos</Link></li>
            <li><Link href="/planos" className="hover:text-foreground">Planos</Link></li>
            <li><a href="#diferenciais" className="hover:text-foreground">Diferenciais</a></li>
            <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Empresa</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/sobre" className="hover:text-foreground">Sobre</Link></li>
            <li><Link href="/termos" className="hover:text-foreground">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="hover:text-foreground">Privacidade</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Conta</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Entrar</Link></li>
            <li><Link href="/register" className="hover:text-foreground">Criar conta</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Gabaritai · Plataforma de mentoria com IA
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
      <Diferenciais />
      <ComoFunciona />
      <Concursos />
      <Depoimentos />
      <Planos />
      <FAQ />
      <CtaFinal />
      <Footer />
    </div>
  )
}
