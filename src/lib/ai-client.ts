/**
 * Cliente unificado de IA — chama Claude (Anthropic) primeiro, com fallback automático.
 * Pra usar Claude, defina ANTHROPIC_API_KEY no .env (alternativa: OPENAI_API_KEY, GEMINI_API_KEY).
 */

type AIProvider = 'claude' | 'openai' | 'gemini' | 'groq'

export async function callAI(prompt: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
  const maxTokens = opts?.maxTokens ?? 4000
  const temperature = opts?.temperature ?? 0.7

  // Tenta Claude primeiro (melhor pra geração estruturada)
  const claudeKey = process.env.ANTHROPIC_API_KEY
  if (claudeKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      if (res.ok && data.content?.[0]?.text) return data.content[0].text
      console.error('[ai] claude error:', data)
    } catch (err) {
      console.error('[ai] claude exception:', err)
    }
  }

  // Fallback Groq (grátis, rápido)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      })
      const data = await res.json()
      if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content
    } catch (err) {
      console.error('[ai] groq exception:', err)
    }
  }

  // Fallback OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      })
      const data = await res.json()
      if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content
    } catch (err) {
      console.error('[ai] openai exception:', err)
    }
  }

  throw new Error('Nenhum provider de IA configurado. Defina ANTHROPIC_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY no .env')
}

/**
 * Extrai e parseia JSON da resposta da IA — robusto a markdown fences e texto extra.
 */
export function parseAIJson<T = unknown>(raw: string): T {
  const clean = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  // Tenta direto
  try { return JSON.parse(clean) as T } catch {}
  // Tenta achar primeiro array ou objeto
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) return JSON.parse(arrMatch[0]) as T
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) return JSON.parse(objMatch[0]) as T
  throw new Error('Não foi possível extrair JSON da resposta da IA: ' + clean.slice(0, 200))
}
