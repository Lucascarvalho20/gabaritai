/**
 * Service Worker básico do Gabaritai.
 * Estratégia: network-first com fallback de cache pra navegação,
 * stale-while-revalidate pra assets estáticos.
 *
 * Não cacheia /api/* — sempre busca fresh do servidor.
 */

const VERSION = 'v1-2026-05-18'
const STATIC_CACHE = `gabaritai-static-${VERSION}`
const PAGES_CACHE = `gabaritai-pages-${VERSION}`

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Nunca cacheia APIs (precisa de dados frescos)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return

  // GET only
  if (e.request.method !== 'GET') return

  // Mesmo domínio só
  if (url.origin !== self.location.origin) return

  // Páginas HTML: network-first
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(PAGES_CACHE).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() => caches.match(e.request).then((r) => r ?? caches.match('/'))),
    )
    return
  }

  // Assets estáticos (CSS, JS, imagens): stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|webp|css|js|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request)
        const fetchPromise = fetch(e.request).then((res) => {
          cache.put(e.request, res.clone())
          return res
        }).catch(() => cached)
        return cached ?? fetchPromise
      }),
    )
    return
  }
})
