/**
 * JSON para dentro de <script type="application/ld+json">.
 *
 * JSON.stringify não escapa "<". Um título de post ou nome de curso com
 * "</script>" fecharia a tag, e o resto do texto viraria HTML da página — um
 * XSS vindo do banco. Trocar "<" por < deixa o JSON idêntico para quem
 * o lê (o Google decodifica o escape) e tira a saída da tag.
 */
export function paraJsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, '\\u003c')
}
