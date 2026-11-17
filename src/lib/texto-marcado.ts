/**
 * Destaque dentro do texto de uma questão: negrito, itálico e sublinhado.
 *
 * Em prova de múltipla escolha o destaque É a questão: "o termo sublinhado é
 * um pronome", "a palavra destacada", "o segmento grifado". O extrator das
 * provas grava o destaque como <b>, <i> e <u>; só essas três marcas são
 * entendidas — qualquer outra coisa entre < > continua sendo texto. A tela
 * monta elementos React com o resultado, nunca HTML cru: o texto vindo do banco
 * não tem como virar script.
 */
export type Trecho = { texto: string; negrito: boolean; italico: boolean; sublinhado: boolean }

const MARCA = /<(\/?)(b|i|u)>/g

export function trechosMarcados(texto: string): Trecho[] {
  const trechos: Trecho[] = []
  const aberto = { b: 0, i: 0, u: 0 }
  let ultimo = 0
  const empurrar = (t: string) => {
    if (!t) return
    const estilo = { negrito: aberto.b > 0, italico: aberto.i > 0, sublinhado: aberto.u > 0 }
    const anterior = trechos[trechos.length - 1]
    if (anterior && anterior.negrito === estilo.negrito && anterior.italico === estilo.italico && anterior.sublinhado === estilo.sublinhado) {
      anterior.texto += t
    } else {
      trechos.push({ texto: t, ...estilo })
    }
  }
  for (const m of texto.matchAll(MARCA)) {
    empurrar(texto.slice(ultimo, m.index))
    const tag = m[2] as 'b' | 'i' | 'u'
    aberto[tag] = m[1] ? Math.max(0, aberto[tag] - 1) : aberto[tag] + 1
    ultimo = (m.index ?? 0) + m[0].length
  }
  empurrar(texto.slice(ultimo))
  return trechos
}

/** O texto sem as marcas: prévia de uma linha, busca, notificação. */
export function semMarcas(texto: string): string {
  return texto.replace(MARCA, '')
}
