import { type MetadataRoute } from 'next'
import { urlDoSite } from '@/lib/site-url'

const BASE_URL = urlDoSite()

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
