import { type MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

/**
 * Sitemap dinâmico. Inclui:
 *  - rotas estáticas principais (home, cursos, planos, sobre, blog)
 *  - 1 entry por parentSlug (concurso pai — PF, PMDF, etc.) que tem
 *    curso ativo com edital
 *  - 1 entry por cargo (?cargo=slug) pra Google indexar landing específica
 *
 * Convertido em /sitemap.xml automaticamente pelo Next.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Rotas estáticas — alta prioridade pras de conversão (home, planos)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/cursos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/planos`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Cursos com edital ativo — agrupados por parentSlug
  let dynamicRoutes: MetadataRoute.Sitemap = []
  try {
    const cursos = await prisma.course.findMany({
      where: {
        active: true,
        editais: { some: { isActive: true } },
      },
      select: {
        slug: true,
        parentSlug: true,
        createdAt: true,
        editais: {
          where: { isActive: true },
          select: { updatedAt: true, dataProva: true },
          take: 1,
        },
      },
    })

    // Agrupa por parentSlug pra emitir 1 URL por concurso pai
    const parents = new Set<string>()
    for (const c of cursos) {
      const key = c.parentSlug ?? c.slug
      parents.add(key)
    }

    dynamicRoutes = [
      ...Array.from(parents).map((slug) => ({
        url: `${BASE_URL}/cursos/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      // URLs com cargo específico (?cargo=...) — pra deep SEO de cada cargo
      ...cursos.map((c) => ({
        url: `${BASE_URL}/cursos/${c.parentSlug ?? c.slug}?cargo=${c.slug}`,
        lastModified: c.editais[0]?.updatedAt ?? c.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ]
  } catch (err) {
    // Se DB indisponível (build sem env), retorna apenas static
    console.warn('[sitemap] DB indisponível:', err)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
