import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

/**
 * Rota de IA para resumo de conteúdo — similar ao NotebookLM do Google.
 * Gera: resumo, mapa mental, flashcards e questões a partir de um texto/edital.
 */

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const payload = await verifyToken(auth.split(' ')[1])
  if (!payload) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

  const { conteudo, tipo, concurso } = await req.json()
  // tipo: 'resumo' | 'mapa_mental' | 'flashcards' | 'questoes' | 'pontos_chave'

  if (!conteudo?.trim()) {
    return NextResponse.json({ message: 'Conteúdo não pode ser vazio' }, { status: 400 })
  }

  const prompt = buildPrompt(conteudo, tipo, concurso)
  const result = await callAI(prompt)

  return NextResponse.json({ resultado: result, tipo })
}

function buildPrompt(conteudo: string, tipo: string, concurso?: string): string {
  const contexto = concurso ? `Contexto: concurso ${concurso}.\n\n` : ''

  const prompts: Record<string, string> = {
    resumo: `${contexto}Você é um especialista em concursos públicos brasileiros. Faça um RESUMO INTELIGENTE do texto abaixo, destacando:
- Os pontos mais cobrados em provas
- Artigos e legislação importantes
- Exceções e pegadinhas comuns
- Use bullet points e negritos

TEXTO:
${conteudo}`,

    mapa_mental: `${contexto}Crie um MAPA MENTAL do conteúdo abaixo em formato de texto estruturado, usando emojis e hierarquia clara. Organize por:
📌 TEMA CENTRAL
  ├── 🔵 Subtema 1
  │   ├── Ponto A
  │   └── Ponto B
  └── 🟢 Subtema 2

CONTEÚDO:
${conteudo}`,

    flashcards: `${contexto}Crie 10 FLASHCARDS de alta qualidade para concurso público a partir do texto. Formato:
**Flashcard 1:**
Frente: [pergunta direta e objetiva]
Verso: [resposta completa e precisa]

TEXTO:
${conteudo}`,

    questoes: `${contexto}Crie 5 QUESTÕES de concurso público no estilo CESPE/CEBRASPE (certo ou errado) e 3 questões de múltipla escolha, baseadas no texto abaixo. Para cada questão, indique o gabarito e explique brevemente.

TEXTO:
${conteudo}`,

    pontos_chave: `${contexto}Liste os 10 PONTOS-CHAVE mais importantes do texto para quem está estudando para concurso público. Para cada ponto, explique por que ele é relevante para a prova. Seja direto e objetivo.

TEXTO:
${conteudo}`,
  }

  return prompts[tipo] ?? prompts.resumo
}

async function callOpenAICompat(prompt: string, url: string, model: string, apiKey: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

async function callAI(prompt: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const groqKey      = process.env.GROQ_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  // Groq first — grátis, rápido (console.groq.com)
  if (groqKey) {
    try {
      return await callOpenAICompat(prompt, 'https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile', groqKey)
    } catch (e) { console.error('[Groq]', e) }
  }

  if (geminiKey) {
    const MODELS = [
      process.env.GEMINI_MODEL,
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ].filter(Boolean) as string[]

    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4096 },
            }),
          }
        )
        if (res.ok) {
          const data = await res.json()
          return data.candidates[0].content.parts[0].text
        }
        console.error(`[Gemini] model ${model} failed ${res.status}`)
      } catch (e) { console.error(`[Gemini] model ${model}:`, e) }
    }
  }

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.content[0].text
      }
    } catch (e) { console.error('[Claude]', e) }
  }

  if (openaiKey) {
    try {
      return await callOpenAICompat(prompt, 'https://api.openai.com/v1/chat/completions', process.env.OPENAI_MODEL ?? 'gpt-4o-mini', openaiKey)
    } catch (e) { console.error('[OpenAI]', e) }
  }

  // DeepSeek — barato, alta qualidade (platform.deepseek.com)
  if (deepseekKey) {
    try {
      return await callOpenAICompat(prompt, 'https://api.deepseek.com/v1/chat/completions', process.env.DEEPSEEK_MODEL ?? 'deepseek-chat', deepseekKey)
    } catch (e) { console.error('[DeepSeek]', e) }
  }

  return '⚠️ Nenhuma chave de IA funcionou. Configure GEMINI_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY no Vercel → Environment Variables.'
}
