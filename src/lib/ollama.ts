/**
 * Ollama: um modelo de IA rodando numa máquina sua, sem API paga.
 *
 * Desligado por padrão. Só entra quando OLLAMA_URL está definida — no Mac de
 * quem desenvolve (http://localhost:11434) ou num servidor próprio. Quando
 * está, vem PRIMEIRO em toda cadeia de provedores: é local e não custa nada.
 *
 * Na Vercel não há como rodar o Ollama: a função serverless não tem GPU nem
 * processo permanente, e tem 2 GB de memória — um modelo de 7B pede uns 5 GB.
 * Por isso o site no ar continua nas cotas gratuitas de Groq e Gemini, e o
 * Ollama serve para desenvolver e para gerar conteúdo em lote no próprio
 * computador. Apontar OLLAMA_URL de produção para uma máquina de casa deixaria
 * o site dependente dela estar ligada — não faça.
 *
 * Num servidor próprio (uma VM sempre ligada), o Ollama não tem senha: fica
 * atrás de um proxy que exige OLLAMA_API_KEY, e o site manda a chave no
 * cabeçalho Authorization. Chave por http aberto para outra máquina vazaria no
 * caminho, então com chave o endereço remoto precisa ser https.
 *
 * Os embeddings (a busca do RAG) continuam no Gemini: a coluna é vector(1536)
 * e vetores de modelos diferentes não se comparam — trocar exigiria reindexar
 * todo o material (rag/embed.ts).
 */
export const OLLAMA_MODELO_PADRAO = 'qwen2.5:7b'

/** Tempo para um modelo local responder: num notebook, bem mais que os 8 s das APIs. */
export const OLLAMA_TIMEOUT_MS = 90_000

export function ollamaConfig(): { url: string; modelo: string; chave: string } | null {
  const bruto = process.env.OLLAMA_URL?.trim()
  if (!bruto) return null
  let u: URL
  try {
    u = new URL(bruto)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const chave = process.env.OLLAMA_API_KEY?.trim()
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
  if (chave && u.protocol === 'http:' && !local) return null
  // O Ollama fala o formato da OpenAI neste caminho: o mesmo código serve aos dois.
  return {
    url: `${u.origin}${u.pathname.replace(/\/+$/, '')}/v1/chat/completions`,
    modelo: process.env.OLLAMA_MODEL?.trim() || OLLAMA_MODELO_PADRAO,
    // O Ollama local ignora o cabeçalho; o proxy do servidor próprio confere.
    chave: chave || 'ollama',
  }
}
