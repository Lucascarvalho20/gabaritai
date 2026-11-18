/**
 * A anotação que o aluno escreve numa tentativa de prova ("fui mediano porque
 * errei crase e deixei Informática em branco"). Função pura, coberta por teste.
 */

export const MAX_ANOTACAO = 500

/**
 * Texto pronto para guardar: sem caractere de controle, sem espaço sobrando,
 * no máximo 500 caracteres. Vazio (ou tipo errado) vira null — apagar a
 * anotação é mandar o campo vazio.
 */
export function limparAnotacao(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const sem = Array.from(v, (c) => {
    const n = c.charCodeAt(0)
    return n === 10 ? '\n' : n < 32 || n === 127 ? ' ' : c
  }).join('')
  const t = sem.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!t) return null
  return Array.from(t).slice(0, MAX_ANOTACAO).join('').trimEnd()
}
