import Link from 'next/link'
import { Target, Brain, Users, Zap, Award, MapPin } from 'lucide-react'

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 text-brand-600 dark:text-brand-400 text-sm font-medium">
            <MapPin className="w-4 h-4" /> Brasília, DF — Brasil
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground">
            Uma startup do DF<br />para os concurseiros do Brasil
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O GabaritAI nasceu de uma necessidade real: tornar a preparação para concursos públicos mais inteligente, acessível e eficiente com o poder da inteligência artificial.
          </p>
        </div>

        {/* Missão */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Missão', text: 'Democratizar o acesso à mentoria de qualidade para concursos públicos, usando IA para personalizar cada jornada de estudo.' },
            { icon: Brain, title: 'Visão', text: 'Ser uma plataforma de referência para concurseiros brasileiros, unindo tecnologia a um método de estudo baseado em evidência: repetição espaçada, prática ativa e diagnóstico por matéria.' },
            { icon: Award, title: 'Valores', text: 'Excelência, transparência e foco no aluno. Cada funcionalidade é construída pensando em quem estuda 4, 6, 8 horas por dia.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* História */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
          <h2 className="text-2xl font-black text-foreground">Nossa história</h2>
          <p className="text-muted-foreground leading-relaxed">
            Eu sou o João Lucas, moro no Distrito Federal e construí o GabaritAI sozinho. A ideia veio de um incômodo simples: as plataformas que eu conhecia entregavam o mesmo cronograma para todo mundo, sem olhar o edital, o peso de cada matéria ou o que a pessoa já sabe.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Vi gente perto de mim gastando caro em cursinho e continuando perdida sobre o que estudar primeiro. Então o foco aqui é outro: o cronograma sai de um cálculo determinístico em cima do edital e das horas que você realmente tem — e ele te avisa antes se o tempo até a prova não vai dar.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Hoje a plataforma cobre <strong className="text-foreground">5 concursos com conteúdo completo</strong> (PF, PRF, PM-DF, PM-GO e PC-DF), somando 14 cargos, e outros 7 estão em preparação. Cada curso tem cronograma, banco de questões, simulados cronometrados, flashcards com repetição espaçada e resumos gerados a partir do edital.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '17', label: 'Cursos disponíveis' },
            { value: '24/7', label: 'Mentor IA ativo' },
            { value: '3', label: 'Provedores de IA' },
            { value: '100%', label: 'Foco em concursos' },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="text-3xl font-black text-brand-600 dark:text-brand-400">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Concursos cobertos */}
        <div>
          <h2 className="text-2xl font-black text-foreground mb-6">Concursos que atendemos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🛡️', name: 'PMDF' }, { icon: '🔵', name: 'Polícia Federal' },
              { icon: '🚔', name: 'PRF' }, { icon: '🔍', name: 'PCDF' },
              { icon: '🚒', name: 'CBMDF' }, { icon: '⚖️', name: 'TJDFT' },
              { icon: '🏦', name: 'Banco do Brasil' }, { icon: '💛', name: 'Caixa Econômica' },
              { icon: '🏛️', name: 'Pol. Legislativa' }, { icon: '🇧🇷', name: 'CNU' },
              { icon: '🏅', name: 'PF Delegado' }, { icon: '⭐', name: 'PMDF Oficial' },
            ].map(({ icon, name }) => (
              <div key={name} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card text-sm">
                <span>{icon}</span>
                <span className="text-muted-foreground font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black text-foreground">Junte-se a nós</h2>
          <p className="text-muted-foreground">Comece sua preparação inteligente hoje. 7 dias grátis, sem cartão de crédito.</p>
          <Link href="/registro" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">
            Começar agora grátis
          </Link>
          <div className="pt-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Voltar ao início</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
