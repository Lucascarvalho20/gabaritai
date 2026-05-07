import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export const maxDuration = 60
// tipo: 'flashcards' | 'questoes' | 'simulado'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  const payload = await verifyToken(auth.split(' ')[1])
  if (!payload) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

  const { tipo, materia, curso, quantidade = 5, nivel = 'medio', semana = 1 } = await req.json()

  const prompt = buildPrompt(tipo, materia, curso, quantidade, nivel, semana)
  const result = await callAI(prompt)

  try {
    // Remove markdown code blocks if present
    const clean = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ data: parsed, tipo })
  } catch {
    // If JSON parsing fails, return raw text
    return NextResponse.json({ data: result, tipo, raw: true })
  }
}

function buildPrompt(tipo: string, materia: string, curso: string, qtd: number, nivel: string, semana: number): string {
  const seed = `semana_${semana}_${materia}_${curso}`.replace(/\s/g, '_')

  if (tipo === 'flashcards') {
    return `Você é um especialista em concursos públicos brasileiros.
Gere ${qtd} flashcards ÚNICOS para concurso (seed: ${seed}).
Matéria: ${materia}
Concurso: ${curso}
Nível: ${nivel}

FORMATO JSON (retorne APENAS o array, sem texto extra):
[
  {
    "frente": "Pergunta objetiva e direta sobre ${materia}?",
    "verso": "Resposta completa, cite artigos/lei quando relevante. Inclua dica de memorização.",
    "materia": "${materia}",
    "nivel": "${nivel}"
  }
]

Regras:
- Questões INÉDITAS, não genéricas
- Baseie em conteúdo que CAI em provas de ${curso}
- Verso deve ter resposta completa com fundamento legal
- Inclua uma "dica" de memorização ao final do verso`
  }

  if (tipo === 'questoes') {
    return `Você é bancário CESPE/CEBRASPE especialista em ${curso}.
Gere ${qtd} questões de múltipla escolha INÉDITAS (seed: ${seed}).
Matéria: ${materia}
Nível: ${nivel}

FORMATO JSON (retorne APENAS o array):
[
  {
    "enunciado": "Enunciado claro e objetivo",
    "alternativas": [
      {"letra": "A", "texto": "Texto da alternativa A"},
      {"letra": "B", "texto": "Texto da alternativa B"},
      {"letra": "C", "texto": "Texto da alternativa C"},
      {"letra": "D", "texto": "Texto da alternativa D"},
      {"letra": "E", "texto": "Texto da alternativa E"}
    ],
    "gabarito": "A",
    "explicacao": "Por que A é correta e as demais erradas. Cite artigos.",
    "materia": "${materia}",
    "banca": "CESPE/CEBRASPE",
    "dificuldade": "${nivel}"
  }
]

Regras:
- Questões baseadas em provas REAIS do ${curso}
- Gabarito variado (não sempre A)
- Explicação detalhada com fundamento legal`
  }

  if (tipo === 'simulado') {
    return `Crie um simulado completo para ${curso} (semana ${semana}).
Matéria principal: ${materia || 'Todas'}
Nível: ${nivel}
Gere ${qtd} questões no estilo REAL da banca do ${curso}.

FORMATO JSON (retorne APENAS o array):
[
  {
    "enunciado": "Texto da questão",
    "alternativas": [
      {"letra": "A", "texto": "..."},
      {"letra": "B", "texto": "..."},
      {"letra": "C", "texto": "..."},
      {"letra": "D", "texto": "..."},
      {"letra": "E", "texto": "..."}
    ],
    "gabarito": "B",
    "explicacao": "Explicação completa",
    "materia": "Matéria da questão",
    "dificuldade": "${nivel}"
  }
]`
  }

  return `Gere conteúdo educacional sobre ${materia} para ${curso}.`
}

async function callAI(prompt: string): Promise<string> {
  const groqKey      = process.env.GROQ_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  async function tryOpenAICompat(url: string, model: string, key: string) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const d = await res.json()
    return d.choices[0].message.content as string
  }

  // Groq first (free, fast)
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'gemma2-9b-it']
    for (const gm of groqModels) {
      try { return await tryOpenAICompat('https://api.groq.com/openai/v1/chat/completions', gm, groqKey) }
      catch (e) { console.error(`[Groq ${gm}]`, e) }
    }
  }

  // Gemini
  if (geminiKey) {
    const models = ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
    for (const m of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 4096 } }),
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) { const d = await res.json(); return d.candidates[0].content.parts[0].text }
      } catch (e) { console.error(`[Gemini ${m} gerar]`, e) }
    }
  }

  // Anthropic
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) { const d = await res.json(); return d.content[0].text }
    } catch (e) { console.error('[Anthropic gerar]', e) }
  }

  // OpenAI
  if (openaiKey) {
    try { return await tryOpenAICompat('https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', openaiKey) }
    catch (e) { console.error('[OpenAI gerar]', e) }
  }

  // DeepSeek
  if (deepseekKey) {
    try { return await tryOpenAICompat('https://api.deepseek.com/v1/chat/completions', 'deepseek-chat', deepseekKey) }
    catch (e) { console.error('[DeepSeek gerar]', e) }
  }

  return '[]'
}
