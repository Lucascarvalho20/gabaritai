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
    ? `O aluno estuda pra: ${concurso}. Foca nos pontos relevantes pra esse cargo/banca.\n\n`
    : ''

  return `${contexto}Você é um professor SÊNIOR de concursos públicos brasileiros, especialista em CESPE/CEBRASPE, FGV, FCC e Vunesp. Tem 15 anos analisando provas anteriores e sabe exatamente o que cai. Sua especialidade: transformar lei/texto bruto em um resumo que o aluno olha e diz "agora eu entendi".

Sua tarefa: criar um RESUMO ESTRATÉGICO do texto abaixo. NÃO É um resumo escolar — é material de revisão pra véspera de prova.

═══ NÍVEL DE QUALIDADE EXIGIDO ═══

EXEMPLO DE COMO DEVE FICAR (Lei 8.072/90 — Crimes Hediondos):

## 📌 Visão geral
Lei dos crimes hediondos define tratamento mais rigoroso para crimes graves. Caiu em **87% dos concursos PF/PRF/PMs nos últimos 5 anos**. Dominar essa lei = vantagem competitiva real.

## ⚖️ Conceitos centrais (DECORA)
- **Crimes hediondos (Art. 1º)**: rol TAXATIVO. Homicídio qualificado, latrocínio, estupro, genocídio, etc.
- **Equiparados (Art. 2º)**: tráfico, tortura, terrorismo — NÃO são hediondos, mas recebem mesmo tratamento.

## 🔥 O QUE MAIS CAI

**1. Progressão de regime (Art. 2º §2º, após Lei 13.964/19):**
| Categoria | Fração |
|---|---|
| Primário | **40%** |
| Reincidente em hediondo | **60%** |
| Hediondo c/ morte (primário) | **50%** |
| Hediondo c/ morte (reincidente) | **70%** |

> 🚨 ANTES do Anticrime era 2/5 e 3/5. Banca usa enunciado "antigo" pra confundir.

**2. Vedações absolutas (Art. 2º):**
- ❌ Anistia, graça, indulto, fiança
- ✅ Cabe HC, revisão criminal

**3. Prisão temporária (Art. 2º §4º):**
- Hediondo: **30 dias + 30** (=60). Comum: 5 dias.

## ⚠️ Pegadinhas que derrubam
1. **Tráfico privilegiado** (HC 118.533/STF) NÃO é hediondo.
2. **Latrocínio** é hediondo. **Roubo c/ lesão grave** NÃO é.
3. **Importunação sexual** (Art. 215-A) NÃO é hediondo (estupro é).

## 🎯 Mnemônicos
- **"3T equiparados"**: Tráfico, Tortura, Terrorismo.

## 📚 Pra aprofundar
- Súmula 471 STJ — Anticrime não retroage
- Tema 972 STF — Tráfico privilegiado
- Lei 13.964/19 (Anticrime) — mudanças mais cobradas

═══ AGORA FAÇA O MESMO COM ESTE TEXTO ═══

REGRAS OBRIGATÓRIAS — ESSAS NÃO SÃO OPCIONAIS:

1. **SEMPRE cite artigo + lei específica**: "Art. 33, CP", "Art. 5º, XXII, CF". Nunca diga apenas "a lei diz que..."
2. **SEMPRE cite números exatos**: prazos (5 dias, 30 dias, 6 meses), percentuais (40%, 60%), idades (18, 21, 60), valores em R$ se for o caso. Banca ADORA mudar 1 número.
3. **Use TABELAS** quando houver comparação (regimes de pena, hipóteses de prisão, prazos prescricionais). Markdown table.
4. **Cite SÚMULAS relevantes** (Súmula 444 STJ, etc.) quando aplicável.
5. **Cite JURISPRUDÊNCIA recente** quando houver entendimento consolidado (STF/STJ).
6. **Diferencie INSTITUTOS PARECIDOS**: anistia ≠ graça ≠ indulto. Furto ≠ roubo. Fiança ≠ liberdade provisória.
7. **NÃO seja genérico**: NUNCA escreva "é importante pra concurso" sem dizer POR QUE específico.
8. **Use formato MATEMÁTICO** se for matemática: $x^2 + 2x - 3 = 0$ (LaTeX inline). Tabelas pra comparação numérica.
9. **NÃO repita o texto original**. Destila.
10. Tom: direto, próximo, técnico mas humano. Sem "espero que tenha gostado" ou frases vazias.

DEVE TER NO MÍNIMO:
- 5 conceitos centrais com base legal
- 3 tópicos no "O que mais cai" com tabela quando aplicável
- 4 pegadinhas específicas com referência
- 2 súmulas ou jurisprudências
- Tabelas markdown se a matéria envolver comparações ou números

TEXTO PARA RESUMIR:
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

/**
 * Cascade específica do RESUMO INTELIGENTE — prioriza QUALIDADE.
 *
 * Pra resumo, o aluno espera profundidade técnica (citações, súmulas, tabelas).
 * Groq Llama é rápido mas tende a ser genérico — uso ele só como fallback.
 *
 * Ordem: Gemini 1.5 Pro → Claude → OpenAI gpt-4o → Gemini Flash → Groq → DeepSeek
 */
async function callAI(prompt: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey    = process.env.OPENAI_API_KEY
  const geminiKey    = process.env.GEMINI_API_KEY
  const groqKey      = process.env.GROQ_API_KEY
  const deepseekKey  = process.env.DEEPSEEK_API_KEY

  // 1º — Gemini 1.5 Pro (qualidade alta, grátis 60 req/min)
  if (geminiKey) {
    const MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'].filter(Boolean)
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 8192, temperature: 0.4 },
            }),
            signal: AbortSignal.timeout(40_000),
          }
        )
        if (res.ok) {
          const data = await res.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text && text.length > 500) return text // só aceita se for resumo "denso"
        }
        console.error(`[Gemini ${model}] failed ${res.status}`)
      } catch (e) { console.error(`[Gemini ${model}]:`, e) }
    }
  }

  // 2º — Claude (top quality em conteúdo legal/técnico)
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
          max_tokens: 8192,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(40_000),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text
        if (text && text.length > 500) return text
      }
    } catch (e) { console.error('[Claude]', e) }
  }

  // 3º — OpenAI gpt-4o (forte em estruturação, custa $0.15/1M tokens)
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          max_tokens: 8192,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(40_000),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text && text.length > 500) return text
      }
    } catch (e) { console.error('[OpenAI]', e) }
  }

  // 4º — Groq Llama (rápido, fallback se top-tier falhar)
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-70b-8192']
    for (const gm of groqModels) {
      try {
        return await callOpenAICompat(prompt, 'https://api.groq.com/openai/v1/chat/completions', gm, groqKey)
      } catch (e) { console.error(`[Groq ${gm}]`, e) }
    }
  }

  // 5º — DeepSeek
  if (deepseekKey) {
    try {
      return await callOpenAICompat(prompt, 'https://api.deepseek.com/v1/chat/completions', process.env.DEEPSEEK_MODEL ?? 'deepseek-chat', deepseekKey)
    } catch (e) { console.error('[DeepSeek]', e) }
  }

  return '⚠️ Nenhuma IA respondeu. Avise o admin pra checar as chaves no Vercel.'
}
