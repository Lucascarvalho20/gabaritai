import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { DEMO_USERS } from '@/lib/demo-users'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const payload = await verifyToken(auth.split(' ')[1])
  if (!payload) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

  const user = DEMO_USERS.find(u => u.id === payload.sub)
  const { message, history = [] } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ message: 'Mensagem não pode ser vazia' }, { status: 400 })
  }

  const systemPrompt = buildMentorPrompt(user)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const groqKey      = process.env.GROQ_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  // Cascade: Claude → OpenAI → Gemini → Groq (grátis) → DeepSeek → fallback
  if (anthropicKey) {
    try {
      const r = await callClaude(message, history, systemPrompt, anthropicKey)
      return NextResponse.json({ response: r, provider: 'claude' })
    } catch (e) { console.error('[Claude]', e) }
  }

  if (openaiKey) {
    try {
      const r = await callOpenAI(message, history, systemPrompt, openaiKey)
      return NextResponse.json({ response: r, provider: 'openai' })
    } catch (e) { console.error('[OpenAI]', e) }
  }

  if (geminiKey) {
    try {
      const r = await callGemini(message, history, systemPrompt, geminiKey)
      return NextResponse.json({ response: r, provider: 'gemini' })
    } catch (e) { console.error('[Gemini]', e) }
  }

  if (groqKey) {
    try {
      const r = await callOpenAICompat(message, history, systemPrompt, groqKey,
        'https://api.groq.com/openai/v1/chat/completions',
        process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile')
      return NextResponse.json({ response: r, provider: 'groq' })
    } catch (e) { console.error('[Groq]', e) }
  }

  if (deepseekKey) {
    try {
      const r = await callOpenAICompat(message, history, systemPrompt, deepseekKey,
        'https://api.deepseek.com/v1/chat/completions',
        process.env.DEEPSEEK_MODEL ?? 'deepseek-chat')
      return NextResponse.json({ response: r, provider: 'deepseek' })
    } catch (e) { console.error('[DeepSeek]', e) }
  }

  return NextResponse.json({
    response: generateFallbackResponse(message, user),
    provider: 'fallback'
  })
}

async function callClaude(message: string, history: any[], system: string, apiKey: string) {
  const messages = [
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6', max_tokens: 2048, system, messages }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function callOpenAI(message: string, history: any[], system: string, apiKey: string) {
  return callOpenAICompat(message, history, system, apiKey,
    'https://api.openai.com/v1/chat/completions',
    process.env.OPENAI_MODEL ?? 'gpt-4o-mini')
}

// Função genérica OpenAI-compatível: serve OpenAI, Groq, DeepSeek, xAI, etc.
async function callOpenAICompat(
  message: string, history: any[], system: string, apiKey: string,
  baseUrl: string, model: string
) {
  const messages = [
    { role: 'system', content: system },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 2048, messages }),
  })
  if (!res.ok) throw new Error(`${baseUrl} ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

async function callGemini(message: string, history: any[], system: string, apiKey: string) {
  const MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-pro',
    'gemini-1.0-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ].filter(Boolean) as string[]

  for (const model of MODELS) {
    try {
      // gemini-pro não suporta systemInstruction — inclui no primeiro turn
      const firstText = system ? `${system}\n\nUsuário: ${message}` : message
      const contents = history.length === 0
        ? [{ role: 'user', parts: [{ text: firstText }] }]
        : [
            ...history.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ]

      const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 2048 } }
      // systemInstruction só funciona em modelos 1.5+
      if (model.includes('1.5') && system) {
        body.systemInstruction = { parts: [{ text: system }] }
        body.contents = [
          ...history.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: message }] }
        ]
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (res.ok) {
        const data = await res.json()
        return data.candidates[0].content.parts[0].text as string
      }
      console.error(`[Gemini] model ${model} failed ${res.status}`)
    } catch (e) {
      console.error(`[Gemini] model ${model} exception:`, e)
    }
  }
  throw new Error('Todos os modelos Gemini falharam')
}

function buildMentorPrompt(user: any): string {
  return `Você é o Mentor IA do GabaritAI — plataforma brasileira de estudos para concursos públicos.

## SEU ALUNO
- Nome: ${user?.name?.split(' ')[0] ?? 'Concurseiro'}
- Concurso alvo: ${user?.concursoAlvo ?? 'concurso público'}
- Nível: ${user?.nivel ?? 'intermediario'}
- Horas/dia: ${user?.horasDia ?? '3'}h
- Meta: "${user?.meta ?? 'Ser aprovado no concurso'}"

## MISSÃO
Atuar como mentor próximo, estratégico e motivador. Responda sempre em português do Brasil.
Adapte cada resposta ao perfil do aluno. Para carreiras policiais, use linguagem técnica e objetiva.
Para bancas como CESPE, enfatize atenção às assertivas. Para FCC/CESGRANRIO, enfatize a teoria.

Cite legislação, artigos e jurisprudência quando relevante. Dê sempre um próximo passo concreto.
Use markdown para organizar. Seja direto, sem enrolação.`
}

function generateFallbackResponse(message: string, user: any): string {
  const nome = user?.name?.split(' ')[0] ?? 'Concurseiro'
  const concurso = user?.concursoAlvo ?? 'seu concurso'
  const msg = message.toLowerCase()

  if (msg.includes('ponto fraco') || msg.includes('errando') || msg.includes('dificuldade')) {
    return `Analisando seu perfil, ${nome}! 📊\n\nCom base nos padrões de alunos de **${concurso}**, os pontos que mais derrubam candidatos são:\n\n1. **Questões de múltipla interpretação** (CESPE) — muitos erram por não ler todas as opções\n2. **Legislação específica** — artigos que parecem iguais mas têm palavras diferentes\n3. **Matemática sob pressão** — erros de cálculo por falta de treino cronometrado\n\n**Próximo passo:** Faça 10 questões agora na seção Questões, filtre pelo assunto que mais erra.\n\n> ⚠️ Para análise com IA real, adicione ANTHROPIC_API_KEY, OPENAI_API_KEY ou GEMINI_API_KEY no Vercel → Settings → Environment Variables.`
  }

  return `Olá, ${nome}! Sou seu Mentor IA para **${concurso}**. 🧠\n\nPosso te ajudar com:\n- 📊 Análise de desempenho e pontos fracos\n- 📅 Ajuste do cronograma\n- 📝 Explicações de qualquer matéria\n- 🎯 Estratégias por banca\n\nO que você precisa hoje?\n\n> ⚠️ **Modo demonstração** — Para respostas reais, adicione uma chave de IA no Vercel → Environment Variables.`
}
