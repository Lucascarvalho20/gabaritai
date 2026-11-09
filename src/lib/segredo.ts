/**
 * Leitura de segredo de ambiente SEM valor padrão em produção.
 *
 * O projeto tinha o padrão `process.env.X ?? 'valor-literal'` em vários
 * segredos — chave de criptografia de CPF, salt de hash, token de cron. Com o
 * repositório público, o literal deixa de ser um "valor de desenvolvimento" e
 * passa a ser uma chave conhecida por qualquer pessoa: se a variável faltar em
 * algum ambiente, o sistema não quebra — ele passa a operar com uma chave
 * publicada, em silêncio. Para dado pessoal, é o pior modo de falha possível.
 *
 * Aqui o fallback só existe fora de produção (`next dev`, testes). Em build de
 * produção — o que inclui os previews da Vercel — segredo ausente vira erro
 * explícito na primeira vez que for usado.
 *
 * Aceita mais de um nome porque alguns segredos herdam de outro (o telefone
 * reaproveita a chave do CPF quando não tem a própria).
 */
export function segredo(nomes: string[], fallbackDesenvolvimento: string): string {
  for (const nome of nomes) {
    const valor = process.env[nome]
    if (valor) return valor
  }
  if (process.env.NODE_ENV !== 'production') return fallbackDesenvolvimento
  throw new Error(`Segredo ausente: configure ${nomes[0]} no ambiente. Sem ele a operação é recusada.`)
}
