/**
 * URL pública do site, normalizada.
 *
 * Existe por um bug real: a NEXT_PUBLIC_SITE_URL foi colada na Vercel com
 * quebras de linha no fim, e o sitemap passou a publicar
 * `https://gabaritai-red.vercel.app\n\n/cursos` — URLs inválidas que o Google
 * descarta. Valor de configuração colado à mão é entrada de usuário: se o
 * código não normaliza, o erro de digitação vira bug em produção.
 */
const PADRAO = 'https://gabaritai-red.vercel.app'

export function urlDoSite(): string {
  const bruto = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || PADRAO
  const limpo = bruto.trim().replace(/\/+$/, '')
  return /^https?:\/\/[^\s/]+/.test(limpo) ? limpo : PADRAO
}
