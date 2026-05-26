import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Calendar, Clock, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EmailCapture } from '@/components/EmailCapture'
import { getAllPosts, getPost } from '@/lib/blog-posts'

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPost(params.slug)
  if (!post) return { title: 'Post não encontrado' }
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: { canonical: `/blog/${post.slug}` },
  }
}

/**
 * Render simples de markdown — sem dependência externa. Cobre:
 *  - ## H2 / ### H3
 *  - parágrafo
 *  - lista bullet (- item)
 *  - lista numerada (1. item)
 *  - blockquote (> texto)
 *  - código inline (`texto`)
 *  - código bloco (```)
 *  - negrito (**texto**) e itálico (*texto*)
 *  - tabela simples (| a | b |\n| --- | --- |\n| 1 | 2 |)
 *  - link [texto](url)
 */
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  function escapeHtml(s: string): string {
    return s
  }

  // Inline formatting: negrito, itálico, código, link
  function inline(text: string): React.ReactNode {
    // Estratégia: tokenize com regex sequencial
    const parts: React.ReactNode[] = []
    let remaining = text
    let idx = 0
    while (remaining.length > 0) {
      // **bold**
      const bold = remaining.match(/^([\s\S]*?)\*\*([^*]+)\*\*([\s\S]*)$/)
      const code = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)$/)
      const link = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)$/)
      // pega o match mais próximo do começo
      const candidates = [
        bold && { kind: 'bold' as const, m: bold, len: bold[1].length },
        code && { kind: 'code' as const, m: code, len: code[1].length },
        link && { kind: 'link' as const, m: link, len: link[1].length },
      ].filter(Boolean) as Array<{ kind: 'bold' | 'code' | 'link'; m: RegExpMatchArray; len: number }>
      if (candidates.length === 0) {
        parts.push(remaining)
        break
      }
      candidates.sort((a, b) => a.len - b.len)
      const next = candidates[0]
      if (next.kind === 'bold') {
        if (next.m[1]) parts.push(next.m[1])
        parts.push(<strong key={`b-${idx++}`} className="font-semibold text-foreground">{next.m[2]}</strong>)
        remaining = next.m[3]
      } else if (next.kind === 'code') {
        if (next.m[1]) parts.push(next.m[1])
        parts.push(
          <code key={`c-${idx++}`} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground">
            {next.m[2]}
          </code>,
        )
        remaining = next.m[3]
      } else if (next.kind === 'link') {
        if (next.m[1]) parts.push(next.m[1])
        parts.push(
          <a key={`l-${idx++}`} href={next.m[3]} className="text-brand-600 hover:underline">
            {next.m[2]}
          </a>,
        )
        remaining = next.m[4]
      }
    }
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // H2
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key++} className="text-2xl sm:text-3xl font-bold tracking-tight mt-12 mb-4">
          {inline(line.slice(3))}
        </h2>,
      )
      i++
      continue
    }
    // H3
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key++} className="text-xl font-bold mt-8 mb-3">
          {inline(line.slice(4))}
        </h3>,
      )
      i++
      continue
    }
    // Tabela
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s\-:|]+\|/)) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      blocks.push(
        <div key={key++} className="my-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-border">
                {header.map((h, hi) => (
                  <th key={hi} className="text-left p-2 font-semibold">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-2 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-6 pl-4 border-l-4 border-brand-500/40 bg-muted/30 py-2 pr-3 rounded-r-lg italic text-muted-foreground"
        >
          {inline(quoteLines.join(' '))}
        </blockquote>,
      )
      continue
    }
    // Code block
    if (line.startsWith('```')) {
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push(
        <pre
          key={key++}
          className="my-6 p-4 rounded-xl bg-muted text-xs font-mono text-foreground overflow-x-auto"
        >
          {codeLines.join('\n')}
        </pre>,
      )
      continue
    }
    // Lista bullet
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="my-4 space-y-1.5 pl-6 list-disc text-base text-muted-foreground">
          {items.map((it, ii) => (
            <li key={ii} className="leading-relaxed">{inline(it)}</li>
          ))}
        </ul>,
      )
      continue
    }
    // Lista numerada
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="my-4 space-y-1.5 pl-6 list-decimal text-base text-muted-foreground">
          {items.map((it, ii) => (
            <li key={ii} className="leading-relaxed">{inline(it)}</li>
          ))}
        </ol>,
      )
      continue
    }
    // Linha em branco
    if (line.trim() === '') {
      i++
      continue
    }
    // Horizontal rule
    if (line.trim() === '---') {
      blocks.push(<hr key={key++} className="my-8 border-border" />)
      i++
      continue
    }
    // Parágrafo (junta linhas consecutivas até linha em branco)
    const paragraphLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('|')
    ) {
      paragraphLines.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="my-4 text-base leading-relaxed text-muted-foreground">
        {inline(paragraphLines.join(' '))}
      </p>,
    )
  }
  return blocks
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const dataPretty = new Date(post.publishedAt).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // JSON-LD Article schema pra Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Gabaritai',
      url: 'https://gabaritai-red.vercel.app',
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    keywords: post.keywords.join(', '),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/blog" className="hidden sm:block text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-muted">Todos os posts</Link>
            <Link href="/planos" className="text-sm font-semibold px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <Link href="/blog" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ChevronLeft className="w-3 h-3" /> Voltar pro blog
        </Link>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-[10px] font-semibold uppercase tracking-wider mb-4">
            {post.category}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            {post.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {post.description}
          </p>
          <div className="flex items-center gap-4 mt-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {dataPretty}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readingMin} min de leitura</span>
            <span>· {post.author}</span>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {renderMarkdown(post.content)}
        </div>

        {/* CTA mid/final */}
        <div className="mt-16 card p-6 sm:p-8 bg-gradient-to-br from-brand-500/5 via-card to-emerald-500/5 border-brand-500/20">
          <h3 className="text-xl font-bold tracking-tight mb-2">
            Gostou desse conteúdo?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Deixa seu email e recebe quando sair post novo. Sem spam, só conteúdo útil pra concurseiro.
          </p>
          <EmailCapture
            source={`blog-${post.slug}`}
            cta="Quero receber"
            successMessage="Pronto, te avisamos."
            hint="1 email por mês, no máximo · cancela quando quiser"
          />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/planos"
            className="group inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all"
          >
            Começar 7 dias grátis
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/metodo"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold"
          >
            Conhecer o método
          </Link>
        </div>
      </article>
    </div>
  )
}
