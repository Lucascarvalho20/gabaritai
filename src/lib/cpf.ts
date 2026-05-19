import crypto from 'crypto'

/**
 * Limpa CPF (só dígitos).
 */
export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Valida CPF brasileiro pelos dígitos verificadores.
 * Rejeita: tamanho != 11, todos dígitos iguais (000..., 111..., etc.)
 */
export function isValidCpf(cpf: string): boolean {
  const c = cleanCpf(cpf)
  if (c.length !== 11) return false
  if (/^(\d)\1{10}$/.test(c)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let d1 = 11 - (sum % 11)
  if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(c[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  let d2 = 11 - (sum % 11)
  if (d2 >= 10) d2 = 0
  return d2 === parseInt(c[10])
}

/**
 * Hash do CPF com SHA-256 + salt (CPF_SALT env). Usado pra dedup sem armazenar valor real.
 */
export function hashCpf(cpf: string): string {
  const salt = process.env.CPF_SALT ?? 'gabaritai-cpf-salt-change-in-production'
  return crypto.createHash('sha256').update(cleanCpf(cpf) + salt).digest('hex')
}

/**
 * Criptografia AES-256-GCM do CPF — armazenado em cpfEncrypted.
 * Retorna formato: iv:authTag:cipherText (base64).
 */
export function encryptCpf(cpf: string): string {
  const key = (process.env.CPF_ENCRYPTION_KEY ?? 'gabaritai-32byte-cpf-encryption-key!').slice(0, 32).padEnd(32, '0')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv)
  let encrypted = cipher.update(cleanCpf(cpf), 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag().toString('base64')
  return `${iv.toString('base64')}:${authTag}:${encrypted}`
}

/**
 * Decifra CPF — uso restrito (ex: solicitação do usuário ou auditoria legal).
 */
export function decryptCpf(payload: string): string | null {
  try {
    const key = (process.env.CPF_ENCRYPTION_KEY ?? 'gabaritai-32byte-cpf-encryption-key!').slice(0, 32).padEnd(32, '0')
    const [ivB64, tagB64, cipherText] = payload.split(':')
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), iv)
    decipher.setAuthTag(tag)
    let dec = decipher.update(cipherText, 'base64', 'utf8')
    dec += decipher.final('utf8')
    return dec
  } catch {
    return null
  }
}

/**
 * Formata CPF: 12345678901 → 123.456.789-01
 */
export function formatCpf(cpf: string): string {
  const c = cleanCpf(cpf)
  if (c.length !== 11) return cpf
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}
