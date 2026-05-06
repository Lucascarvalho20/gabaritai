import { NextResponse } from 'next/server'

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

export async function GET() {
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

  // Gemini — testa com gemini-pro (mais compatível)
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
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

  return NextResponse.json({
    ok: true,
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
