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

  // Tenta na ordem: Claude → OpenAI → Gemini → fallback
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
  const messages = [
    { role: 'system', content: system },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? 'gpt-4o', max_tokens: 2048, messages }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callGemini(message: string, history: any[], system: string, apiKey: string) {
  const contents = [
    ...history.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ]
  const systemInstruction = { parts: [{ text: system }] }
  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-pro'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, contents, generationConfig: { maxOutputTokens: 2048 } }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
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

  return `Olá, ${nome}! Sou seu Mentor IA para **${concurso}**. 🧠\n\nPosso te ajudar com:\n- 📊 Análise de desempenho e pontos fracos\n- 📅 Ajuste do cronograma\n- 📝 Explicações de qualquer matéria\n- 🎯 Estratégias por banca\n\nO que você precisa hoje?\n\n> ⚠️ **Modo demonstração** — Configure uma chave de IA no Vercel para respostas reais (veja CHAVES_API.md).`
}
