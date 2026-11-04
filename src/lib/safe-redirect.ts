/**
 * Validação de destino de redirecionamento.
 *
 * Existe por causa do **open redirect**: se a aplicação aceita qualquer URL num
 * parâmetro `?redirect=` e manda o usuário pra lá depois do login, um atacante
 * monta o link
 *
 *     https://seusite.com/login?redirect=https://site-falso.com/login
 *
 * O domínio que a vítima lê é o verdadeiro, e o login acontece mesmo. Só que no
 * fim ela cai numa cópia da tela de login no domínio do atacante, achando que a
 * sessão expirou — e digita a senha lá. O phishing fica convincente justamente
 * porque o primeiro link era legítimo.
 *
 * A defesa é aceitar **apenas caminhos internos**. Três casos precisam ser
 * barrados, e o terceiro é o que costuma passar despercebido:
 *
 *   https://outro.com   → absoluto, óbvio
 *   //outro.com         → relativo ao protocolo; o navegador resolve como
 *                         https://outro.com, mas começa com '/' e passa numa
 *                         checagem ingênua de `startsWith('/')`
 *   /\outro.com         → alguns navegadores normalizam '\' para '/', então
 *                         isto vira '//outro.com'
 */

/** Para onde mandar quando não há destino válido. */
export const DESTINO_PADRAO = '/dashboard'

/**
 * Devolve o caminho se ele for interno e seguro; `null` caso contrário.
 * Nunca lança — entrada inválida é só um destino recusado.
 */
export function caminhoInternoSeguro(valor: string | null | undefined): string | null {
  if (!valor) return null

  // Decodifica para pegar tentativas tipo %2F%2Fsite.com
  let destino = valor
  try {
    destino = decodeURIComponent(valor)
  } catch {
    return null // percent-encoding malformado
  }

  destino = destino.trim()
  if (!destino) return null

  // Normaliza '\' para '/' antes de checar, igual o navegador faz
  const normalizado = destino.replace(/\\/g, '/')

  if (!normalizado.startsWith('/')) return null   // absoluto ou relativo solto
  if (normalizado.startsWith('//')) return null   // relativo ao protocolo → externo
  if (normalizado.includes('\n') || normalizado.includes('\r')) return null // header injection

  return normalizado
}

/** Igual ao anterior, mas devolve o padrão em vez de `null`. */
export function destinoOuPadrao(valor: string | null | undefined, padrao = DESTINO_PADRAO): string {
  return caminhoInternoSeguro(valor) ?? padrao
}
