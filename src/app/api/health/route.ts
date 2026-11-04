import { NextResponse } from 'next/server'

// Sem isto o Next pré-renderiza a rota no build e o timestamp congela na data
// da compilação — foi o que escondeu por meses que produção estava desatualizada.
export const dynamic = 'force-dynamic'
import { GEMINI_MODEL, geminiEndpoint } from '@/lib/ai-client'

async function testOpenAICompat(url: string, model: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
    })
    if (res.ok) return { ok: true }
    const text = await res.text()
    return { ok: false, error: `${res.status}: ${text.slice(0, 150)}` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

/**
 * Lista os modelos que a chave realmente consegue usar.
 *
 * Existe porque nome de modelo é descontinuado sem aviso: o Groq aposentou o
 * llama-3.3-70b-versatile e o Google o gemini-2.0-flash, e a documentação dos
 * dois aponta substitutos diferentes conforme a página. Perguntar ao provedor
 * é a única fonte confiável.
 */
async function listarModelos(): Promise<Record<string, string[] | string>> {
  const out: Record<string, string[] | string> = {}

  const gem = process.env.GEMINI_API_KEY
  if (gem) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gem}&pageSize=200`)
      const j: any = await r.json()
      out.gemini = r.ok
        ? (j.models ?? [])
            .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
            .map((m: any) => String(m.name).replace('models/', ''))
        : `erro ${r.status}: ${JSON.stringify(j).slice(0, 200)}`
    } catch (e: any) { out.gemini = `falhou: ${e.message}` }
  }

  const groq = process.env.GROQ_API_KEY
  if (groq) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groq}` },
      })
      const j: any = await r.json()
      out.groq = r.ok
        ? (j.data ?? []).map((m: any) => String(m.id))
        : `erro ${r.status}: ${JSON.stringify(j).slice(0, 200)}`
    } catch (e: any) { out.groq = `falhou: ${e.message}` }
  }

  return out
}

export async function GET(req: Request) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const groqKey      = process.env.GROQ_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  type AIResult = { ok: boolean; error?: string }
  const results: Record<string, AIResult> = {}

  // OpenAI
  results.openai = openaiKey
    ? await testOpenAICompat('https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', openaiKey)
    : { ok: false, error: 'OPENAI_API_KEY não configurada' }

  // Gemini — usa o MESMO modelo do resto do app, senão o health mente
  if (geminiKey) {
    try {
      const res = await fetch(
        `${geminiEndpoint()}?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 5 } }),
        }
      )
      if (res.ok) {
        results.gemini = { ok: true }
      } else {
        const text = await res.text()
        results.gemini = { ok: false, error: `${res.status}: ${text.slice(0, 150)}` }
      }
    } catch (e: any) {
      results.gemini = { ok: false, error: e.message }
    }
  } else {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY não configurada' }
  }

  // Groq (grátis — console.groq.com)
  results.groq = groqKey
    ? await testOpenAICompat('https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile', groqKey)
    : { ok: false, error: 'GROQ_API_KEY não configurada (grátis em console.groq.com)' }

  // DeepSeek
  results.deepseek = deepseekKey
    ? await testOpenAICompat('https://api.deepseek.com/v1/chat/completions', 'deepseek-chat', deepseekKey)
    : { ok: false, error: 'DEEPSEEK_API_KEY não configurada (barato em platform.deepseek.com)' }

  // Anthropic
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
      })
      if (res.ok) {
        results.anthropic = { ok: true }
      } else {
        const text = await res.text()
        results.anthropic = { ok: false, error: `${res.status}: ${text.slice(0, 150)}` }
      }
    } catch (e: any) {
      results.anthropic = { ok: false, error: e.message }
    }
  } else {
    results.anthropic = { ok: false, error: 'ANTHROPIC_API_KEY não configurada' }
  }

  const anyWorking = Object.values(results).some(r => r.ok)

  const querModelos = new URL(req.url).searchParams.get('models') === '1'
  const modelosDisponiveis = querModelos ? await listarModelos() : undefined

  return NextResponse.json({
    ok: true,
    ...(modelosDisponiveis ? { modelosDisponiveis } : {}),
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    env: {
      hasJwtSecret:  !!process.env.JWT_SECRET,
      hasApiUrl:     !!process.env.NEXT_PUBLIC_API_URL,
      hasOpenAI:     !!openaiKey,
      hasGemini:     !!geminiKey,
      hasGroq:       !!groqKey,
      hasDeepSeek:   !!deepseekKey,
      hasAnthropic:  !!anthropicKey,
    },
    ai: { anyWorking, results },
    instructions: anyWorking ? '✅ IA funcionando!' : '❌ Configure pelo menos uma chave. Recomendado: GROQ_API_KEY (grátis em console.groq.com)',
  })
}
