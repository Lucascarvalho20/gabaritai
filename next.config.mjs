/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production'

// Content-Security-Policy.
// Mantida compatível com Next.js (precisa de 'unsafe-inline'/'unsafe-eval' pros
// scripts de hidratação sem nonce) e com os serviços usados (Supabase, Google
// OAuth, MercadoPago, imagens https). Ganhos sem risco: object-src none,
// base-uri self, frame-ancestors none. Em dev, libera ws: pro HMR.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? ' ws: wss:' : ' wss:'}`,
  "frame-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https:",
].join('; ')

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS: força HTTPS (2 anos, subdomínios). Só atua sob HTTPS (prod);
          // localhost ignora. Reduz risco de downgrade/man-in-the-middle.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ]
      }
    ]
  }
}

export default nextConfig
