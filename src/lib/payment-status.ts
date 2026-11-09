/**
 * Regra de transição de status de pagamento: só anda pra frente.
 *
 * POR QUE EXISTE. O Mercado Pago manda várias notificações para o mesmo
 * pagamento, às vezes ao mesmo tempo, e cada uma faz o servidor consultar a API
 * deles. Duas consultas paralelas podem voltar em ordem trocada: a que perguntou
 * um instante ANTES da aprovação responde "pending", chega DEPOIS da que
 * respondeu "approved", e sobrescreve. Foi assim que um pagamento de verdade,
 * com o curso já liberado, apareceu como PENDING no banco.
 *
 * O nome do problema é *lost update* com leitura velha. A defesa clássica não é
 * tentar ordenar as notificações (não temos como) — é tornar a escrita
 * monotônica: cada status tem um nível, e um status só pode ser trocado por
 * outro de nível igual ou maior. Notificação atrasada vira no-op.
 *
 *   PENDING (0) → REJECTED/CANCELLED (1) → APPROVED (2) → REFUNDED (3)
 *
 * A consequência que importa: dinheiro confirmado não volta atrás por
 * notificação. APPROVED só sai de APPROVED para REFUNDED.
 *
 * Note que REJECTED/CANCELLED → APPROVED é permitido. Parece estranho, mas o
 * contrário seria pior: se o dinheiro entrou, recusar a aprovação é exatamente
 * o "cobrado e não liberado" que este módulo existe pra evitar.
 */

export type StatusPagamento = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'

const NIVEL: Record<StatusPagamento, number> = {
  PENDING: 0,
  REJECTED: 1,
  CANCELLED: 1,
  APPROVED: 2,
  REFUNDED: 3,
}

export function transicaoPermitida(de: StatusPagamento, para: StatusPagamento): boolean {
  return NIVEL[para] >= NIVEL[de]
}
