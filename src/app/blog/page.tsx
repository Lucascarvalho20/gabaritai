import { type Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EmailCapture } from '@/components/EmailCapture'
import { getAllPosts } from '@/lib/blog-posts'

export const metadata: Metadata = {
  title: 'Blog — guias e estratégia pra concurso público',
  description: 'Posts âncora para concurseiros: método de estudo, análise por banca, edital verticalizado, planejamento. Conteúdo direto, sem encheção de linguiça.',
  keywords: ['blog concurso', 'estratégia concurso público', 'como passar em concurso', 'edital verticalizado', 'banca Cebraspe'],
  openGraph: {
    title: 'Blog Gabaritai — guias práticos pra concurseiro',
    description: 'Posts âncora pra quem está se preparando: método, banca, edital, planejamento.',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/metodo" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Método</Link>
            <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          ← Voltar pro início
        </Link>

        <div className="mb-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Blog Gabaritai</h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg leading-relaxed">
            Guias práticos pra concurseiro. Sem mistério de IA, sem promessa fácil. Cada post é um post
            que a gente gostaria de ter lido quando começou.
          </p>
        </div>

        {/* Posts */}
        <div className="grid md:grid-cols-2 gap-5 mb-16">
          {posts.map((post) => {
            const dataPretty = new Date(post.publishedAt).toLocaleDateString('pt-BR', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card p-6 hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col gap-3 group"
              >
                <div className="inline-flex items-center gap-2 self-start">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300">
                    {post.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                  {post.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dataPretty}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readingMin} min</span>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Ler post <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Newsletter */}
        <div className="card p-6 sm:p-8 bg-gradient-to-br from-brand-500/5 via-card to-emerald-500/5 border-brand-500/20 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Receba novos posts por email</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Quando sai post novo, a gente te avisa. 1 email por mês, no máximo. Sem spam.
          </p>
          <div className="max-w-md mx-auto">
            <EmailCapture
              source="blog-newsletter"
              cta="Assinar"
              successMessage="Pronto! Te avisamos quando sair post novo."
              hint="Cancela quando quiser"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
