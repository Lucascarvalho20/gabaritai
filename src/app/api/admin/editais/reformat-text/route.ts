import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { callAI } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/admin/editais/reformat-text
 * Body: { text: string }
 *
 * Reformata um texto cru de edital pra o formato estruturado que o parser
 * determinístico reconhece. Usado como fallback quando o admin colou
 * conteúdo bagunçado do PDF e o parser de cliente não conseguiu interpretar.
 *
 * Não persiste nada — só devolve texto reformatado pra o admin colar de volta.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text || text.length < 50) {
    return NextResponse.json({ message: 'Cole pelo menos 50 caracteres do edital' }, { status: 400 })
  }
  if (text.length > 200_000) {
    return NextResponse.json({ message: 'Texto > 200k chars — divide em partes' }, { status: 413 })
  }

  const prompt = `Você recebe um texto bagunçado de conteúdo programático de edital de concurso brasileiro (provavelmente colado de um PDF, com quebras de linha estranhas, sem formatação).

Sua tarefa: REORGANIZAR esse conteúdo no formato estruturado abaixo, SEM inventar nada e SEM omitir nada do original.

FORMATO DE SAÍDA — markdown simples:

## Nome da Matéria
1. Primeiro tópico
2. Segundo tópico
2.1. Subtópico
3. Terceiro tópico

## Próxima Matéria
1. Tópico
...

REGRAS:
- Cada matéria começa com "## Nome Da Matéria" (title case, sem numeração inicial)
- Cada tópico fica em UMA linha, com numeração "1.", "2." etc — preserve a numeração do edital
- Subtópicos em linhas separadas com "1.1.", "1.2."
- NÃO omita nada — se o edital lista 22 tópicos numa matéria, devolva 22
- NÃO invente conteúdo — só reorganize o que está lá
- Se houver múltiplos cargos, separe com "CARGO 1: Nome do Cargo", "CARGO 2: ..."
- Conserte acentuação obviamente errada ("Lingua" → "Língua", "Dominio" → "Domínio")
- NÃO adicione texto explicativo — devolva APENAS o markdown reformatado

TEXTO ORIGINAL:
${text}

REFORMATADO:`

  let reformatted: string
  try {
    const raw = await callAI(prompt, { maxTokens: 16000, temperature: 0.1 })
    if (!raw) return NextResponse.json({ message: 'IA não retornou nada' }, { status: 500 })
    reformatted = raw.trim()
    // Remove eventuais marcadores ```markdown e ```
    reformatted = reformatted.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```\s*$/i, '').trim()
  } catch (err: any) {
    return apiError(err, 'Falha ao reformatar via IA', 'edital-reformat-ai')
  }

  return NextResponse.json({ ok: true, reformatted })
}
