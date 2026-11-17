/**
 * A matéria em que o mentor deve procurar, quando o pedido vem de uma sessão
 * de estudo ("tirar dúvida sobre Direito Penal").
 *
 * O id vem do navegador, então não é confiável: só vale se for uma das
 * matérias do edital do aluno. Senão, um aluno de PM mandando o id de
 * Contabilidade receberia trechos do material de um curso que ele não comprou.
 * Sem lista de matérias permitidas (aluno sem curso principal, admin), a busca
 * já seria sem filtro — restringir a uma matéria só estreita, então vale.
 */
export function materiaDoPedido(pedido: unknown, permitidas: string[] | null): string | null {
  if (typeof pedido !== 'string' || !pedido.trim() || pedido.length > 64) return null
  if (permitidas === null) return pedido
  return permitidas.includes(pedido) ? pedido : null
}
