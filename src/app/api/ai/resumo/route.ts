import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

const MAX_CHARS = 30_000

// Limite diário por aluno (resumos/dia).
// Trial: bem restrito pra não queimar tokens com fraude.
// Plano "todos cursos" tem mais espaço.
function dailyLimitForUser(plan: string | null, hasFullAccess: boolean): number {
  if (hasFullAccess) return 50 // admin/beta tester
  const p = (plan ?? '').toLowerCase()
  if (p.startsWith('trial')) return 2
  if (p.includes('todos')) return 10
  return 5 // padrão pagante
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { conteudo, concurso } = await req.json()

  if (!conteudo?.trim()) {
    return NextResponse.json({ message: 'Conteúdo não pode ser vazio' }, { status: 400 })
  }
  if (typeof conteudo !== 'string') {
    return NextResponse.json({ message: 'Conteúdo inválido' }, { status: 400 })
  }
  if (conteudo.length > MAX_CHARS) {
    return NextResponse.json({
      message: `Texto muito longo (máx ${MAX_CHARS.toLocaleString('pt-BR')} caracteres). Quebra em pedaços menores.`,
    }, { status: 400 })
  }

  // ── Quota diária por aluno (anti-abuso) ────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, hasFullAccess: true, role: true },
  })
  const limit = dailyLimitForUser(fullUser?.plan ?? null, fullUser?.hasFullAccess ?? false)

  const usage = await prisma.featureUsage.findUnique({
    where: {
      userId_feature_date: { userId: user.id, feature: 'resumo', date: today },
    },
    select: { count: true },
  })
  const used = usage?.count ?? 0

  if (used >= limit) {
    return NextResponse.json({
      message: `Você atingiu o limite de ${limit} resumos hoje. Volta amanhã ou faz upgrade pra ter mais.`,
      quota: { used, limit },
    }, { status: 429 })
  }

  // ── Gera resumo ─────────────────────────────────────────────────────────
  const prompt = buildPrompt(conteudo, concurso)
  const result = await callAI(prompt)

  // ── Registra uso (mesmo se IA falhou — protege contra retry abuse) ──────
  await prisma.featureUsage.upsert({
    where: {
      userId_feature_date: { userId: user.id, feature: 'resumo', date: today },
    },
    create: { userId: user.id, feature: 'resumo', date: today, count: 1 },
    update: { count: { increment: 1 } },
  })

  return NextResponse.json({
    resultado: result,
    quota: { used: used + 1, limit },
  })
}

function buildPrompt(conteudo: string, concurso?: string): string {
  const contexto = concurso
    ? `O aluno está estudando para o concurso: ${concurso}. Foque nos pontos relevantes para esse cargo/banca.\n\n`
    : ''

  return `${contexto}Você é um professor especialista em concursos públicos brasileiros, com 15 anos de experiência preparando alunos pra CESPE/CEBRASPE, FGV, FCC e Vunesp. Sua especialidade é destilar textos longos em material de estudo direto e completo.

Faça um RESUMO INTELIGENTE COMPLETO do texto abaixo, seguindo essa estrutura:

## 📌 Visão geral
Em 2-3 frases, qual o tema central e por que é importante pra concurso.

## ⚖️ Conceitos e definições principais
Lista os conceitos-chave. Pra cada um:
- **Nome do conceito**: definição clara e curta.
- Mencione a base legal (artigo, lei, decreto) quando houver.

## 🔥 O que mais cai em prova
Liste tópicos específicos que aparecem em provas anteriores, na ordem de importância. Seja direto:
- **Tópico**: o que costuma cair, palavra-chave a memorizar.

## ⚠️ Pegadinhas e exceções
Pontos onde as bancas TENTAM derrubar o candidato. Use bullets curtos. Foque em:
- Exceções à regra geral
- Termos confusos (parecidos, mas com sentido diferente)
- Prazos, números, percentuais (banca ADORA trocar)

## 🎯 Mnemônicos e dicas
Se houver acrônimos, frases pra memorizar, regras práticas — coloque aqui.

## 📚 Para aprofundar
Liste 2-3 leis, súmulas ou jurisprudências relacionadas que o aluno deve estudar depois.

REGRAS:
- Use Markdown (## títulos, **negritos**, listas).
- Seja direto, sem enrolar. Concurseiro não tem tempo.
- NÃO repita o texto original — extrai o essencial.
- Quando citar lei, escreva "Art. X, Lei Y" em negrito.
- Use emojis nos títulos pra ficar visual.
- Português brasileiro, tom profissional mas próximo.

TEXTO:
${conteudo}`
}

async function callOpenAICompat(prompt: string, url: string, model: string, apiKey: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30_000),
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

  // Groq first — grátis, rápido
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'gemma2-9b-it']
    for (const gm of groqModels) {
      try { return await callOpenAICompat(prompt, 'https://api.groq.com/openai/v1/chat/completions', gm, groqKey) }
      catch (e) { console.error(`[Groq ${gm}]`, e) }
    }
  }

  if (geminiKey) {
    const MODELS = [process.env.GEMINI_MODEL, 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'].filter(Boolean) as string[]
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
            signal: AbortSignal.timeout(30_000),
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
        signal: AbortSignal.timeout(30_000),
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

  if (deepseekKey) {
    try {
      return await callOpenAICompat(prompt, 'https://api.deepseek.com/v1/chat/completions', process.env.DEEPSEEK_MODEL ?? 'deepseek-chat', deepseekKey)
    } catch (e) { console.error('[DeepSeek]', e) }
  }

  return '⚠️ Nenhuma IA respondeu. Avise o admin pra checar as chaves no Vercel.'
}
