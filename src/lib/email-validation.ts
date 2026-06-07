/**
 * Validação de email robusta.
 *
 * Regra: aceita emails que LIKELY VÃO RECEBER mensagem real.
 * Rejeita: formato inválido, domínios descartáveis, emails de teste óbvios.
 *
 * Não fazemos verificação DNS/MX (cara, lenta) — Resend já filtra esses
 * casos na entrega. Foco aqui é bloquear lixo conhecido.
 */

/**
 * Regex mais robusta que a básica /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 * Bloqueia: espaços, múltiplos @, ponto no início/fim, TLD curto demais
 */
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

/**
 * Domínios descartáveis e de teste mais comuns.
 * Lista enxuta — não tenta cobrir todos (impossível), só os MUITO comuns.
 */
const DOMAINS_BLOQUEADOS = new Set([
  // Descartáveis populares
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.net',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'tempmail.org',
  'temp-mail.org',
  'temp-mail.io',
  'getnada.com',
  'yopmail.com',
  'yopmail.fr',
  'sharklasers.com',
  'dispostable.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'maildrop.cc',
  'mintemail.com',
  'mt2014.com',
  'mt2015.com',
  'throwawaymail.com',
  'mailcatch.com',
  'spamgourmet.com',
  'pokemail.net',
  // Domínios óbvios de teste
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.test',
  'asdf.com',
  'qwerty.com',
  // Localhost / inválidos
  'localhost',
])

/**
 * Padrões de email óbvios de teste (regex case-insensitive).
 */
const PADROES_TESTE = [
  /^teste?@/i,
  /^test@/i,
  /^asdf+@/i,
  /^qwerty?@/i,
  /^[a-z]@[a-z]\./i, // "a@b.com" — provavelmente fake
]

export type EmailValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string }

/**
 * Valida + normaliza um email.
 * Retorna o email em lowercase trimmed se válido.
 */
export function validateEmail(raw: string): EmailValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'Email não informado' }
  }

  const email = raw.trim().toLowerCase()

  if (email.length < 5) {
    return { ok: false, reason: 'Email muito curto' }
  }
  if (email.length > 254) {
    return { ok: false, reason: 'Email muito longo' }
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, reason: 'Formato de email inválido' }
  }

  // Padrões óbvios de teste
  for (const padrao of PADROES_TESTE) {
    if (padrao.test(email)) {
      return { ok: false, reason: 'Use seu email pessoal válido (sem padrões de teste)' }
    }
  }

  // Domínio
  const atIdx = email.lastIndexOf('@')
  const dominio = email.slice(atIdx + 1)

  if (DOMAINS_BLOQUEADOS.has(dominio)) {
    return {
      ok: false,
      reason: 'Domínios temporários ou descartáveis não são aceitos. Use seu email pessoal válido.',
    }
  }

  // TLD precisa ter 2+ caracteres E não ser puramente numérico
  const tld = dominio.split('.').pop() ?? ''
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return { ok: false, reason: 'Domínio do email inválido' }
  }

  return { ok: true, normalized: email }
}
