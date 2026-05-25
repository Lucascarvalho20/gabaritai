import { type MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/(admin)/',
          '/(dashboard)/',
          '/checkout/',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
