import crypto from 'crypto'

/**
 * Limpa telefone (só dígitos). Aceita formatos: (11) 91234-5678, 11912345678, +55 11 91234-5678
 * Normaliza removendo prefixo +55 ou 55 (se for 12-13 dígitos com BR começando em 55).
 */
export function cleanPhone(phone: string): string {
  const digits = String(phone).replace(/\D/g, '')
  // Se vem com +55 ou 55 prefixo BR (12 ou 13 dígitos), remove
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2)
  if (digits.length === 12 && digits.startsWith('55')) return digits.slice(2)
  return digits
}

/**
 * Valida telefone brasileiro: DDD (2 dígitos) + 8 ou 9 dígitos.
 * Rejeita DDD inválido (lista oficial) e celulares sem 9 inicial.
 */
const DDDS_VALIDOS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

export function isValidPhone(phone: string): boolean {
  const c = cleanPhone(phone)
  if (c.length < 10 || c.length > 11) return false
  const ddd = c.slice(0, 2)
  if (!DDDS_VALIDOS.has(ddd)) return false
  if (c.length === 11 && c[2] !== '9') return false
  return true
}

/**
 * Hash do telefone (SHA-256 + salt). Usado pra dedup sem armazenar valor real.
 */
export function hashPhone(phone: string): string {
  const salt = process.env.PHONE_SALT ?? process.env.CPF_SALT ?? 'gabaritai-phone-salt-change-in-production'
  return crypto.createHash('sha256').update(cleanPhone(phone) + salt).digest('hex')
}

/**
 * Criptografia AES-256-GCM do telefone. Formato: iv:authTag:cipherText (base64).
 */
export function encryptPhone(phone: string): string {
  const key = (process.env.PHONE_ENCRYPTION_KEY ?? process.env.CPF_ENCRYPTION_KEY ?? 'gabaritai-32byte-phone-encryption!').slice(0, 32).padEnd(32, '0')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv)
  let encrypted = cipher.update(cleanPhone(phone), 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag().toString('base64')
  return `${iv.toString('base64')}:${authTag}:${encrypted}`
}

/**
 * Formata telefone: 11912345678 → (11) 91234-5678
 */
export function formatPhone(phone: string): string {
  const c = cleanPhone(phone)
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`
  if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`
  return phone
}
