/**
 * Allowlist de contas do dono que PODEM compartilhar o mesmo CPF/telefone.
 *
 * Regra geral do produto continua sendo: 1 CPF por conta, 1 telefone por conta
 * (gate antifraude do trial). Esta allowlist é a ÚNICA exceção — serve só pras
 * contas internas do João (admin + conta pessoal de teste), pra ele conseguir
 * logar/testar em ambas com o mesmo CPF.
 *
 * NÃO adicione e-mails de usuários comuns aqui.
 */
const CPF_SHARE_ALLOWLIST = new Set<string>([
  'admin@gabaritai.com.br',
  'j.lucas.jol45@gmail.com',
])

/**
 * Retorna true se AMBOS os e-mails estão na allowlist — ou seja, podem
 * compartilhar CPF/telefone entre si sem cair no bloqueio antifraude.
 */
export function bothAllowedToShareContact(
  emailA?: string | null,
  emailB?: string | null,
): boolean {
  if (!emailA || !emailB) return false
  return (
    CPF_SHARE_ALLOWLIST.has(emailA.toLowerCase().trim()) &&
    CPF_SHARE_ALLOWLIST.has(emailB.toLowerCase().trim())
  )
}
