import { GEMINI_FALLBACKS, GROQ_MODELS } from '@/lib/ai-client'
import type { ChamadaLLM, ChamadaFerramenta, Ferramenta, MensagemAgente } from './loop'

/**
 * Chamada de modelo com ferramentas, no formato OpenAI — que o Groq e o Gemini
 * (pelo endpoint `/v1beta/openai`) também aceitam. Uma implementação, três
 * provedores.
 *
 * FALLBACK POR CHAMADA, NÃO POR CONVERSA. Cada chamada manda o histórico
 * inteiro, então a API é sem estado: se o Groq der 429 no terceiro passo, o
 * Gemini assume o quarto lendo as mesmas mensagens. O agente não percebe a
 * troca.
 *
 * Ordem: Groq (rápido, grátis, bom em ferramentas) → Gemini (grátis) →
 * OpenAI (pago, só se tiver crédito).
 */

type Provedor = { nome: string; url: string; chave: string; modelo: string }

function provedores(): Provedor[] {
  const lista: Provedor[] = []
  const groq = process.env.GROQ_API_KEY
  if (groq) {
    lista.push({ nome: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', chave: groq, modelo: GROQ_MODELS[0] })
  }
  const gemini = process.env.GEMINI_API_KEY
  if (gemini) {
    for (const modelo of GEMINI_FALLBACKS) {
      lista.push({
        nome: `gemini:${modelo}`,
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        chave: gemini,
        modelo,
      })
    }
  }
  const openai = process.env.OPENAI_API_KEY
  if (openai) {
    lista.push({ nome: 'openai', url: 'https://api.openai.com/v1/chat/completions', chave: openai, modelo: 'gpt-4o-mini' })
  }
  return lista
}

const TIMEOUT_MS = 20_000

export function criarLLM(): { llm: ChamadaLLM; provedorUsado: () => string | null } {
  let usado: string | null = null

  const llm: ChamadaLLM = async (mensagens: MensagemAgente[], ferramentas: Ferramenta[]) => {
    const lista = provedores()
    if (!lista.length) throw new Error('Nenhum provedor de IA configurado.')

    const corpo = (modelo: string) => JSON.stringify({
      model: modelo,
      temperature: 0.2,
      max_tokens: 1500,
      tool_choice: 'auto',
      tools: ferramentas.map((f) => ({
        type: 'function',
        function: { name: f.nome, description: f.descricao, parameters: f.parametros },
      })),
      // Alguns provedores recusam `content: null` em mensagem de assistente.
      messages: mensagens.map((m) => (m.role === 'assistant' ? { ...m, content: m.content ?? '' } : m)),
    })

    let ultimoErro = ''
    for (const p of lista) {
      const controle = new AbortController()
      const timer = setTimeout(() => controle.abort(), TIMEOUT_MS)
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.chave}` },
          body: corpo(p.modelo),
          signal: controle.signal,
        })
        if (!res.ok) {
          ultimoErro = `${p.nome} ${res.status}: ${(await res.text()).slice(0, 160)}`
          continue
        }
        const json: any = await res.json()
        const msg = json?.choices?.[0]?.message
        if (!msg) { ultimoErro = `${p.nome}: resposta sem mensagem`; continue }

        usado = p.nome
        const chamadas: ChamadaFerramenta[] = (msg.tool_calls ?? []).map((c: any, i: number) => ({
          id: c.id || `chamada-${Date.now()}-${i}`,
          type: 'function',
          function: { name: c.function?.name ?? '', arguments: c.function?.arguments ?? '{}' },
        }))
        return { conteudo: typeof msg.content === 'string' ? msg.content : null, chamadas }
      } catch (err: any) {
        ultimoErro = `${p.nome}: ${err?.name === 'AbortError' ? 'timeout' : err?.message}`
      } finally {
        clearTimeout(timer)
      }
    }
    throw new Error(`Todos os provedores falharam. Último: ${ultimoErro}`)
  }

  return { llm, provedorUsado: () => usado }
}
