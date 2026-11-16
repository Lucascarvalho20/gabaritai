/**
 * Paginação da aba Questões.
 *
 * O cursor é a chave da última questão entregue — (createdAt, id) — e não uma
 * posição. Com o filtro "não feitas" o conjunto muda enquanto o aluno
 * responde: a questão do cursor some da lista, e um "pula 30" ou o cursor do
 * Prisma (que pula a própria linha do cursor) passaria por cima de questões
 * nunca vistas. Comparar pela chave não depende de a linha ainda estar lá.
 */

export type Situacao = 'nao-feitas' | 'erradas' | 'todas'

export type Cursor = { em: Date; id: string }

const ID_VALIDO = /^[A-Za-z0-9_-]{1,120}$/

export function montarCursor(em: Date, id: string): string {
  return Buffer.from(`${em.toISOString()}|${id}`, 'utf8').toString('base64url')
}

/** Cursor inválido ou adulterado vira `null` (primeira página), nunca erro 500. */
export function lerCursor(bruto: string | null | undefined): Cursor | null {
  if (!bruto || bruto.length > 300) return null
  let texto: string
  try {
    texto = Buffer.from(bruto, 'base64url').toString('utf8')
  } catch {
    return null
  }
  const corte = texto.indexOf('|')
  if (corte <= 0) return null
  const em = new Date(texto.slice(0, corte))
  const id = texto.slice(corte + 1)
  if (Number.isNaN(em.getTime()) || !ID_VALIDO.test(id)) return null
  return { em, id }
}
