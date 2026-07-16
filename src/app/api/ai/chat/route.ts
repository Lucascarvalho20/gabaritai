import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { DEMO_USERS } from '@/lib/demo-users'
import { consumeQuota } from '@/lib/ai-quota'
import { prisma } from '@/lib/prisma'
import { isContentLockedForUser } from '@/lib/trial-content'

/**
 * Persiste mensagem do user + resposta da IA na AiConversation.
 * Fire-and-forget: não bloqueia resposta se DB falhar.
 *
 * Retorna o conversationId (novo ou existente) pra o frontend poder
 * continuar a mesma conversa entre sessões.
 */
async function persistConversation(opts: {
  userId: string
  conversationId: string | null
  userMessage: string
  aiResponse: string
}): Promise<string | null> {
  try {
    let convoId = opts.conversationId
    if (convoId) {
      const exists = await prisma.aiConversation.findFirst({
        where: { id: convoId, userId: opts.userId },
        select: { id: true },
      })
      if (!exists) convoId = null
    }
    if (!convoId) {
      const created = await prisma.aiConversation.create({
        data: { userId: opts.userId },
        select: { id: true },
      })
      convoId = created.id
    } else {
      await prisma.aiConversation.update({
        where: { id: convoId },
        data: { updatedAt: new Date() },
      })
    }
    await prisma.aiMessage.createMany({
      data: [
        { conversationId: convoId, role: 'user', content: opts.userMessage },
        { conversationId: convoId, role: 'assistant', content: opts.aiResponse },
      ],
    })
    return convoId
  } catch (err) {
    console.error('[ai/chat] persistConversation failed', err)
    return opts.conversationId
  }
}

function detectCronogramaUpdate(userMessage: string, _aiResponse: string): { horas_dia?: number; dias_semana?: number[] } | null {
  const msg = userMessage.toLowerCase()
  const isCronogramaRequest = msg.includes('cronograma') || msg.includes('horário') || msg.includes('horas') || msg.includes('dias de estudo') || msg.includes('segunda') || msg.includes('dias da semana')
  if (!isCronogramaRequest) return null

  const update: { horas_dia?: number; dias_semana?: number[] } = {}

  const horasMatch = msg.match(/(\d+)\s*hora/i)
  if (horasMatch) update.horas_dia = parseInt(horasMatch[1])

  const diasMap: Record<string, number> = {
    'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3,
    'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6,
  }
  const diasMentioned: number[] = []
  for (const [dia, num] of Object.entries(diasMap)) {
    if (msg.includes(dia)) diasMentioned.push(num)
  }

  const naoQueroDias: number[] = []
  for (const [dia, num] of Object.entries(diasMap)) {
    if (msg.includes(`${dia} não`) || msg.includes(`não.*${dia}`) || (msg.includes('não quero') && msg.includes(dia))) {
      naoQueroDias.push(num)
    }
  }

  if (diasMentioned.length > 0 || naoQueroDias.length > 0) {
    let studyDays = diasMentioned.length > 0 ? diasMentioned : [1, 2, 3, 4, 5, 6]
    studyDays = studyDays.filter(d => !naoQueroDias.includes(d))
    if (studyDays.length > 0) update.dias_semana = studyDays
  }

  return Object.keys(update).length > 0 ? update : null
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const payload = await verifyToken(auth.split(' ')[1])
  if (!payload?.sub) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

  const { message, history = [], conversationId: incomingConvoId = null } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ message: 'Mensagem não pode ser vazia' }, { status: 400 })
  }
  if (typeof message === 'string' && message.length > 4000) {
    return NextResponse.json({ message: 'Mensagem muito longa (máx 4000 caracteres)' }, { status: 400 })
  }

  // Tenta carregar user REAL do banco (com profile pra personalizar prompt).
  // Se não existe (token velho de demo), faz fallback pro DEMO_USERS.
  const realUser = await prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: {
      id: true,
      name: true,
      email: true,
      hasFullAccess: true,
      profile: { select: { concursoLabel: true, nivel: true, horasDia: true, meta: true } },
    },
  })
  if (realUser && await isContentLockedForUser(realUser.id)) {
    return NextResponse.json({ message: 'O Mentor IA faz parte dos planos pagos. No gratuito você usa o cronograma pra se organizar.', locked: true }, { status: 403 })
  }

  const demoUser = !realUser ? DEMO_USERS.find(u => u.id === payload.sub) : null
  // Normaliza pra forma que buildMentorPrompt espera (concursoAlvo, nivel, etc.)
  const user = realUser
    ? {
        name: realUser.name,
        email: realUser.email,
        concursoAlvo: realUser.profile?.concursoLabel ?? null,
        nivel: realUser.profile?.nivel ?? 'intermediario',
        horasDia: realUser.profile?.horasDia ?? '3',
        meta: realUser.profile?.meta ?? null,
      }
    : (demoUser ?? null)

  if (realUser) {
    try {
      await consumeQuota({ userId: realUser.id, kind: 'mentor_chat', hasFullAccess: realUser.hasFullAccess })
    } catch (err: any) {
      if (err?.code === 'QUOTA_EXCEEDED') {
        return NextResponse.json({ message: err.message, quota: err.quota }, { status: 429 })
      }
      throw err
    }
  }

  // Helper local: persiste E retorna response com conversationId
  const persistAndRespond = async (resp: string, provider: string, cronogramaUpdate: any) => {
    const convoId = realUser
      ? await persistConversation({
          userId: realUser.id,
          conversationId: incomingConvoId,
          userMessage: message,
          aiResponse: resp,
        })
      : null
    return NextResponse.json({ response: resp, provider, cronogramaUpdate, conversationId: convoId })
  }

  const systemPrompt = buildMentorPrompt(user as any)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const groqKey      = process.env.GROQ_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  // Cascade: Groq (grátis) → Gemini → Claude → OpenAI → DeepSeek → fallback
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'gemma2-9b-it']
    for (const gm of groqModels) {
      try {
        const r = await callOpenAICompat(message, history, systemPrompt, groqKey,
          'https://api.groq.com/openai/v1/chat/completions', gm)
        return persistAndRespond(r, 'groq', detectCronogramaUpdate(message, r))
      } catch (e) { console.error(`[Groq ${gm}]`, e) }
    }
  }

  if (geminiKey) {
    try {
      const r = await callGemini(message, history, systemPrompt, geminiKey)
      return persistAndRespond(r, 'gemini', detectCronogramaUpdate(message, r))
    } catch (e) { console.error('[Gemini]', e) }
  }

  if (anthropicKey) {
    try {
      const r = await callClaude(message, history, systemPrompt, anthropicKey)
      return persistAndRespond(r, 'claude', detectCronogramaUpdate(message, r))
    } catch (e) { console.error('[Claude]', e) }
  }

  if (openaiKey) {
    try {
      const r = await callOpenAI(message, history, systemPrompt, openaiKey)
      return persistAndRespond(r, 'openai', detectCronogramaUpdate(message, r))
    } catch (e) { console.error('[OpenAI]', e) }
  }

  if (deepseekKey) {
    try {
      const r = await callOpenAICompat(message, history, systemPrompt, deepseekKey,
        'https://api.deepseek.com/v1/chat/completions',
        process.env.DEEPSEEK_MODEL ?? 'deepseek-chat')
      return persistAndRespond(r, 'deepseek', detectCronogramaUpdate(message, r))
    } catch (e) { console.error('[DeepSeek]', e) }
  }

  const r = generateFallbackResponse(message, user as any)
  return persistAndRespond(r, 'fallback', detectCronogramaUpdate(message, r))
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
    signal: AbortSignal.timeout(8000),
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
    signal: AbortSignal.timeout(8000),
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
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) }
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
