import Link from 'next/link'
import { Calendar, Clock, ChevronRight } from 'lucide-react'

const POSTS = [
  {
    slug: 'tecnicas-estudo-concursos',
    titulo: '5 técnicas de estudo comprovadas para concursos públicos',
    desc: 'Descubra os métodos utilizados pelos aprovados: repetição espaçada, técnica Pomodoro, mapa mental e como a IA pode potencializar cada uma delas.',
    data: '05 Mai 2026', leitura: '8 min', categoria: 'Método de Estudo',
    emoji: '📚',
  },
  {
    slug: 'ia-aprovacao-concursos',
    titulo: 'Como a IA pode acelerar sua aprovação em concursos',
    desc: 'A inteligência artificial está revolucionando a forma como concurseiros estudam. Entenda como o Mentor IA identifica seus pontos fracos e cria planos personalizados.',
    data: '03 Mai 2026', leitura: '6 min', categoria: 'Tecnologia',
    emoji: '🤖',
  },
  {
    slug: 'guia-pmdf-2024',
    titulo: 'Guia completo: PMDF 2024/2025 — Tudo que você precisa saber',
    desc: 'Edital, datas, matérias, banca, nota de corte histórica e estratégia de estudo. O guia mais completo para quem quer ser aprovado na PMDF.',
    data: '01 Mai 2026', leitura: '12 min', categoria: 'Concursos',
    emoji: '🛡️',
  },
  {
    slug: 'flashcards-metodo-anki',
    titulo: 'Flashcards: o método Anki adaptado para concurseiros brasileiros',
    desc: 'A repetição espaçada (SRS) é o método mais eficiente para memorização. Entenda como funciona o algoritmo e como o GabaritAI o aplica ao estudo para concursos.',
    data: '28 Abr 2026', leitura: '7 min', categoria: 'Método de Estudo',
    emoji: '⚡',
  },
  {
    slug: 'cespe-cebraspe-estrategia',
    titulo: 'Estratégia definitiva para provas CESPE/CEBRASPE',
    desc: 'Certo ou errado com penalidade. Saiba quando arriscar, quando deixar em branco e como a CESPE formula pegadinhas. Aprovados revelam a estratégia.',
    data: '25 Abr 2026', leitura: '10 min', categoria: 'Estratégia',
    emoji: '🎯',
  },
  {
    slug: 'concurso-banco-do-brasil-dicas',
    titulo: 'BB 2025: estratégia de quem passou com 85% de acerto',
    desc: 'Entrevista com aprovada no Banco do Brasil sobre rotina de estudos, materiais usados e como a IA ajudou a identificar os pontos fracos a tempo.',
    data: '22 Abr 2026', leitura: '9 min', categoria: 'Concursos',
    emoji: '🏦',
  },
]

const CATEGORIAS = ['Todos', 'Método de Estudo', 'Tecnologia', 'Concursos', 'Estratégia']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block">← Início</Link>
          <h1 className="text-4xl font-black text-foreground">Blog GabaritAI</h1>
          <p className="text-muted-foreground mt-2 text-lg">Estratégias, dicas e novidades para concurseiros</p>
        </div>

        {/* Categorias */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIAS.map(cat => (
            <button key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${cat === 'Todos' ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map(post => (
            <article key={post.slug} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 p-8 text-center text-5xl">
                {post.emoji}
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    {post.categoria}
                  </span>
                </div>
                <h2 className="font-bold text-foreground leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {post.titulo}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.desc}</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.data}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.leitura}</span>
                  </div>
                  <button className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1">
                    Ler <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 rounded-2xl border border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 p-8 text-center">
          <h2 className="text-2xl font-black text-foreground mb-2">Receba novos artigos por e-mail</h2>
          <p className="text-muted-foreground mb-6">Dicas semanais de estudo, estratégias por banca e novidades do GabaritAI.</p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input type="email" placeholder="seu@email.com" className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
              Assinar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
