import { NextResponse } from 'next/server'

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY

  // Testa cada provider com uma chamada real mínima
  type AIResult = { ok: boolean; error?: string }
  const results: Record<string, AIResult> = {}

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
      })
      if (res.ok) {
        results.openai = { ok: true }
      } else {
        const text = await res.text()
        results.openai = { ok: false, error: `${res.status}: ${text.slice(0, 120)}` }
      }
    } catch (e: any) {
      results.openai = { ok: false, error: e.message }
    }
  } else {
    results.openai = { ok: false, error: 'OPENAI_API_KEY não configurada' }
  }

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
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
        results.gemini = { ok: false, error: `${res.status}: ${text.slice(0, 120)}` }
      }
    } catch (e: any) {
      results.gemini = { ok: false, error: e.message }
    }
  } else {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY não configurada' }
  }

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
        results.anthropic = { ok: false, error: `${res.status}: ${text.slice(0, 120)}` }
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
      hasJwtSecret:   !!process.env.JWT_SECRET,
      hasApiUrl:      !!process.env.NEXT_PUBLIC_API_URL,
      hasOpenAI:      !!openaiKey,
      hasGemini:      !!geminiKey,
      hasAnthropic:   !!anthropicKey,
    },
    ai: {
      anyWorking,
      results,
    }
  })
}
