import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { checkSetupAuth } from '@/lib/setup-auth'

// Sem isto o Next pré-renderiza a rota no build e o timestamp congela na data
// da compilação — foi o que escondeu por meses que produção estava desatualizada.
export const dynamic = 'force-dynamic'
import { GEMINI_MODEL, GROQ_MODELS, geminiEndpoint } from '@/lib/ai-client'
import { isSandboxMode } from '@/lib/mercadopago'

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
      if (r.ok) {
        const todos = j.models ?? []
        out.gemini = todos
          .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
          .map((m: any) => String(m.name).replace('models/', ''))
        // Embeddings são outra família: respondem embedContent, não generateContent.
        // Interessam porque permitem rodar a busca semântica sem depender da OpenAI.
        out.geminiEmbeddings = todos
          .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('embedContent'))
          .map((m: any) => `${String(m.name).replace('models/', '')} (dim=${m.outputDimensions ?? '?'})`)
      } else {
        out.gemini = `erro ${r.status}: ${JSON.stringify(j).slice(0, 200)}`
      }
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

async function diagnosticoCompleto(req: Request) {
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
    ? await testOpenAICompat('https://api.groq.com/openai/v1/chat/completions', GROQ_MODELS[0], groqKey)
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

  return {
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
    // Booleano de configuração, não segredo. Existe porque sandbox ligado faz o
    // pagamento parecer funcionar e nunca concluir — e isso é invisível de fora.
    pagamento: {
      modoSandbox: isSandboxMode(),
      tokenConfigurado: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      tokenTipo: (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').startsWith('APP_USR-')
        ? 'producao'
        : (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').startsWith('TEST-') ? 'teste' : 'desconhecido',
      webhookSecretConfigurado: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
    },
    ai: { anyWorking, results },
    instructions: anyWorking ? '✅ IA funcionando!' : '❌ Configure pelo menos uma chave. Recomendado: GROQ_API_KEY (grátis em console.groq.com)',
  }
}

/**
 * Duas camadas, por um motivo de custo e não só de sigilo.
 *
 * O diagnóstico completo faz UMA CHAMADA REAL a cada provedor de IA. Quando ele
 * era público, qualquer pessoa que abrisse /api/health em loop esgotava a cota
 * gratuita do Gemini e do Groq — justamente as IAs que atendem os alunos. A
 * falha apareceria como "a IA do site parou", sem nada apontando para o health.
 *
 * - Público:  { ok, timestamp, versao } — liveness e qual commit está no ar.
 *             O commit não é segredo (o repositório é público) e resolve a
 *             pergunta "o deploy novo já subiu?" sem precisar adivinhar.
 * - ?detalhe=1: exige sessão de admin OU o SETUP_SECRET como Bearer (curl).
 *             Resultado guardado por 5 minutos, para nem o admin martelar as APIs.
 */
const CACHE_MS = 5 * 60 * 1000
let cache: { em: number; dados: Awaited<ReturnType<typeof diagnosticoCompleto>> } | null = null

export async function GET(req: NextRequest) {
  const base = {
    ok: true,
    timestamp: new Date().toISOString(),
    versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  }

  if (new URL(req.url).searchParams.get('detalhe') !== '1') {
    return NextResponse.json(base)
  }

  const setup = checkSetupAuth(req)
  if (!setup.ok) {
    const admin = await requireAdmin(req)
    if (!admin.user) {
      return NextResponse.json({ ...base, message: 'Diagnóstico exige admin.' }, { status: 403 })
    }
  }

  const agora = Date.now()
  if (!cache || agora - cache.em > CACHE_MS) {
    cache = { em: agora, dados: await diagnosticoCompleto(req) }
  }
  return NextResponse.json({ ...cache.dados, ...base, cacheDe: new Date(cache.em).toISOString() })
}
