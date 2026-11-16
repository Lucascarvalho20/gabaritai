/**
 * Mantém viva, depois que a resposta já saiu, uma tarefa que o aluno não
 * precisa esperar (ex.: gerar o flashcard do erro com IA).
 *
 * Numa função serverless o processo pode congelar logo depois da resposta, e
 * uma promessa solta morre junto — às vezes no meio. Na Vercel, o contexto da
 * requisição expõe `waitUntil`, que segura a função até a promessa terminar;
 * é o mesmo símbolo que o pacote `@vercel/functions` lê. Fora da Vercel (dev,
 * testes) o contexto não existe e a tarefa segue solta, como antes.
 */
const CONTEXTO_DA_REQUISICAO = Symbol.for('@vercel/request-context')

export function depoisDaResposta(tarefa: Promise<unknown>, rotulo: string): void {
  const segura = tarefa.catch((err) => console.warn(`[${rotulo}] falhou depois da resposta:`, err))
  const contexto = (globalThis as any)[CONTEXTO_DA_REQUISICAO]?.get?.()
  if (typeof contexto?.waitUntil === 'function') contexto.waitUntil(segura)
}
