/**
 * TOTP (RFC 6238) — implementação minimalista sem dependências externas.
 * Compatível com Google Authenticator, Authy, 1Password, Microsoft Authenticator.
 */
import crypto from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
  let bits = 0, value = 0, out = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  return out
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0, value = 0
  const bytes: number[] = []
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c)
    if (idx === -1) throw new Error('invalid base32 char: ' + c)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Gera novo secret base32 (160 bits = 32 chars). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

/** Gera código TOTP de 6 dígitos para um secret e timestamp. */
export function generateTotpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / 30)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))

  const key = base32Decode(secret)
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest()

  const offset = hmac[hmac.length - 1] & 0x0f
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const code = (binCode % 1_000_000).toString().padStart(6, '0')
  return code
}

/**
 * Verifica código TOTP com tolerância de ±1 janela (30s antes/depois)
 * pra acomodar pequenas diferenças de clock.
 */
export function verifyTotpCode(secret: string, code: string, timestamp = Date.now()): boolean {
  const target = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(target)) return false
  for (const offset of [-1, 0, 1]) {
    const ts = timestamp + offset * 30_000
    if (generateTotpCode(secret, ts) === target) return true
  }
  return false
}

/**
 * URL otpauth:// — usada pra gerar QR code no app autenticador.
 * Format: otpauth://totp/Issuer:account?secret=XXX&issuer=Issuer
 */
export function buildOtpauthUrl(account: string, secret: string, issuer = 'Gabaritai'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * URL pra renderizar QR code via API pública (sem precisar instalar lib).
 * Em produção: substituir por geração local (lib qrcode) pra não vazar otpauth pra terceiros.
 */
export function buildQrImageUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(otpauthUrl)}`
}
