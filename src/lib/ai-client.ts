/**
 * Cliente unificado de IA com roteamento por TAREFA + custo.
 *
 * Estratégia (cost-aware):
 *  - 'extract': barato (Groq grátis → Gemini Flash). Tarefas mecânicas (extrair questão de prova).
 *  - 'generate': médio (Gemini → Claude). Geração criativa (questões IA, mapa mental).
 *  - 'quality': premium (Claude → GPT-4o). Tarefas críticas (correção redação, análise complexa).
 *
 * Cada categoria tem fallback automático se a primeira opção falhar.
 */

export type AITask = 'extract' | 'generate' | 'quality'

type AIOpts = {
  maxTokens?: number
  temperature?: number
  task?: AITask // default: 'generate'
}

const TASK_ROUTING: Record<AITask, Array<'groq' | 'gemini' | 'openai' | 'claude'>> = {
  extract: ['groq', 'gemini', 'openai', 'claude'],     // mais barato primeiro
  generate: ['gemini', 'claude', 'openai', 'groq'],     // balanceado
  quality: ['claude', 'openai', 'gemini', 'groq'],      // melhor primeiro
}

async function callClaude(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (res.ok && data.content?.[0]?.text) return data.content[0].text
    console.warn('[ai] claude:', data.error?.message ?? 'falhou')
    return null
  } catch (err) {
    console.warn('[ai] claude exception:', err)
    return null
  }
}

async function callGroq(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
    const data = await res.json()
    if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content
    console.warn('[ai] groq:', data.error?.message ?? 'falhou')
    return null
  } catch (err) {
    console.warn('[ai] groq exception:', err)
    return null
  }
}

async function callGemini(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      },
    )
    const data = await res.json()
    if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text
    }
    console.warn('[ai] gemini:', data.error?.message ?? 'falhou')
    return null
  } catch (err) {
    console.warn('[ai] gemini exception:', err)
    return null
  }
}

async function callOpenAI(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
    const data = await res.json()
    if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content
    console.warn('[ai] openai:', data.error?.message ?? 'falhou')
    return null
  } catch (err) {
    console.warn('[ai] openai exception:', err)
    return null
  }
}

const PROVIDER_MAP = {
  claude: callClaude,
  groq: callGroq,
  gemini: callGemini,
  openai: callOpenAI,
}

export async function callAI(prompt: string, opts: AIOpts = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 4000
  const temperature = opts.temperature ?? 0.7
  const task = opts.task ?? 'generate'
  const chain = TASK_ROUTING[task]

  for (const provider of chain) {
    const result = await PROVIDER_MAP[provider](prompt, maxTokens, temperature)
    if (result) {
      console.log(`[ai] ✓ used ${provider} for task=${task}`)
      return result
    }
  }
  throw new Error(`Nenhum provider de IA disponível pra task=${task}. Configure ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY.`)
}

/**
 * Extrai e parseia JSON da resposta da IA — robusto a markdown fences e texto extra.
 */
export function parseAIJson<T = unknown>(raw: string): T {
  const clean = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  try { return JSON.parse(clean) as T } catch {}
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) return JSON.parse(arrMatch[0]) as T
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) return JSON.parse(objMatch[0]) as T
  throw new Error('Não foi possível extrair JSON da resposta da IA: ' + clean.slice(0, 200))
}

/**
 * Para tarefas que precisam de visão (OCR de PDF escaneado, análise de imagem).
 * Usa Gemini Flash (multimodal grátis até 1500 req/dia) com fallback OpenAI gpt-4o-mini.
 */
export async function callAIVision(opts: {
  prompt: string
  imageBase64: string
  mimeType: string
  maxTokens?: number
}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 8000

  // Gemini primeiro (multimodal grátis)
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: opts.prompt },
                { inline_data: { mime_type: opts.mimeType, data: opts.imageBase64 } },
              ],
            }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
          }),
        },
      )
      const data = await res.json()
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text
      }
      console.warn('[ai-vision] gemini:', data.error?.message)
    } catch (err) {
      console.warn('[ai-vision] gemini exception:', err)
    }
  }

  // Fallback OpenAI gpt-4o-mini (visão)
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: opts.prompt },
            { type: 'image_url', image_url: { url: `data:${opts.mimeType};base64,${opts.imageBase64}` } },
          ],
        }],
        max_tokens: maxTokens,
      }),
    })
    const data = await res.json()
    if (res.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content
    console.warn('[ai-vision] openai:', data.error?.message)
  }

  throw new Error('Nenhum provider de IA com visão configurado (GEMINI_API_KEY ou OPENAI_API_KEY)')
}
