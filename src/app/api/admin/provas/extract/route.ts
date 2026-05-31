import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { callAIVision, parseAIJson } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Extrai questões de um PDF de prova oficial. Opcionalmente cruza com um PDF
 * de gabarito separado pra preencher a resposta correta de cada item.
 *
 * Body multipart:
 *   - prova: File (PDF da prova)
 *   - gabarito?: File (PDF separado de gabarito — só letras)
 *   - examFormat?: 'CE' | 'ME_5' | 'ME_4' | 'MISTA'
 *
 * Resposta:
 *   { questoes: [{ numero, enunciado, alternativas, gabarito? }], stats }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  let provaBuffer: ArrayBuffer
  let gabaritoBuffer: ArrayBuffer | null = null
  let examFormat: string | null = null

  try {
    const form = await req.formData()
    const provaFile = form.get('prova') as File | null
    const gabaritoFile = form.get('gabarito') as File | null
    examFormat = (form.get('examFormat') as string) || null
    if (!provaFile) return NextResponse.json({ message: 'Anexe o PDF da prova' }, { status: 400 })
    provaBuffer = await provaFile.arrayBuffer()
    if (gabaritoFile) gabaritoBuffer = await gabaritoFile.arrayBuffer()
  } catch (err: any) {
    return apiError(err, 'PDF inválido', 'prova-extract-parse', 400)
  }

  if (provaBuffer.byteLength === 0) {
    return NextResponse.json({ message: 'PDF da prova vazio' }, { status: 400 })
  }
  if (provaBuffer.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ message: 'PDF da prova > 20MB — divida em partes' }, { status: 413 })
  }

  const provaBase64 = Buffer.from(provaBuffer).toString('base64')

  const isCE = examFormat === 'CE'
  const promptProva = `Você é um EXTRATOR ESPECIALISTA de provas oficiais de concurso público brasileiro. Sua função é ler o PDF da prova anexa e devolver TODAS as questões objetivas no formato JSON estruturado.

═══════════════════════════════════════════════════════════════
FORMATO ESPERADO PELA PROVA
═══════════════════════════════════════════════════════════════

${isCE ? `Estilo CEBRASPE/CESPE — itens CERTO/ERRADO:
Cada item é uma afirmação que deve ser julgada certa (C) ou errada (E).
NÃO tem alternativas A-E — só uma afirmação por item.
Estrutura típica:
  "1  A respeito de XYZ, julgue o item.
       O item diz tal coisa..."
` : `Estilo múltipla escolha:
Cada questão tem alternativas A) B) C) D) E) (ou A) B) C) D)).
`}

═══════════════════════════════════════════════════════════════
REGRAS RÍGIDAS
═══════════════════════════════════════════════════════════════

1. EXTRAIA TODAS as questões — não pule nenhuma, mesmo as longas ou as que dependem de texto-base.
2. PRESERVE o enunciado COMPLETO, incluindo texto-base (boilerplate "Considerando o texto acima…" deve vir junto).
3. PRESERVE TODO formatting (quebras de linha entre itens, ${isCE ? 'cada item C/E é uma questão separada' : 'cada alternativa A-E)'}.
4. Se a questão referencia um texto-base anterior, COPIE o texto-base inteiro no enunciado da PRIMEIRA questão do bloco, e nas demais questões do bloco coloque uma marcação curta "[Refere-se ao texto da Q{numero}]".
5. NÚMERO da questão: use o número que aparece no PDF. Se prova é dividida em "Conhecimentos Básicos 1-50, Específicos 51-120", use os números reais.
6. ALTERNATIVAS: ${isCE ? 'sempre [{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]' : 'array de objetos {letra: "A"|"B"|"C"|"D"|"E", texto: "..."}'}.
7. SE A PROVA TEM REDAÇÃO/DISCURSIVA: IGNORE — só extraia objetivas.
8. SE O PDF NÃO É UMA PROVA: retorne { "erro": "..." }.

═══════════════════════════════════════════════════════════════
RESPOSTA — APENAS JSON puro (sem markdown):
═══════════════════════════════════════════════════════════════

{
  "questoes": [
    {
      "numero": 1,
      "enunciado": "...",
      "alternativas": ${isCE ? '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]' : '[{"letra":"A","texto":"..."},{"letra":"B","texto":"..."}]'}
    }
  ]
}`

  let extracted: any
  try {
    const raw = await callAIVision({
      prompt: promptProva,
      imageBase64: provaBase64,
      mimeType: 'application/pdf',
      maxTokens: 32000,
    })
    extracted = parseAIJson(raw)
  } catch (err: any) {
    return apiError(err, 'Falha ao extrair prova via IA', 'prova-extract-ai')
  }

  if (extracted.erro) {
    return NextResponse.json({ message: 'IA: ' + extracted.erro }, { status: 422 })
  }
  if (!Array.isArray(extracted.questoes) || extracted.questoes.length === 0) {
    return NextResponse.json({ message: 'IA não identificou questões no PDF' }, { status: 422 })
  }

  // ── Cruza com gabarito se admin enviou ───────────────────────────────────
  const gabaritoMap = new Map<number, string>()
  if (gabaritoBuffer && gabaritoBuffer.byteLength > 0) {
    const gabaritoBase64 = Buffer.from(gabaritoBuffer).toString('base64')
    const promptGabarito = `Você está vendo o PDF do GABARITO OFICIAL de uma prova de concurso. Extraia o mapeamento "número da questão → letra correta".

Estrutura típica do PDF: tabela ou lista com pares "1 - C", "2 - E", "3 - A" etc.

${isCE ? 'Estilo CEBRASPE: respostas são apenas "C" (certo) ou "E" (errado).' : 'Estilo múltipla escolha: respostas A, B, C, D, E.'}

⚠️ ATENÇÃO:
- Algumas questões podem estar ANULADAS — marque como "ANULADA"
- Se houver gabarito preliminar E definitivo, use o DEFINITIVO
- Se aparecer apenas um (por exemplo só preliminar), use ele

Responda APENAS o JSON (sem markdown):
{
  "gabarito": [
    { "numero": 1, "letra": "C" },
    { "numero": 2, "letra": "ANULADA" }
  ]
}`

    try {
      const rawG = await callAIVision({
        prompt: promptGabarito,
        imageBase64: gabaritoBase64,
        mimeType: 'application/pdf',
        maxTokens: 8000,
      })
      const parsedG = parseAIJson<any>(rawG)
      if (Array.isArray(parsedG.gabarito)) {
        for (const item of parsedG.gabarito) {
          if (typeof item.numero === 'number' && typeof item.letra === 'string') {
            gabaritoMap.set(item.numero, item.letra.toUpperCase())
          }
        }
      }
    } catch (err) {
      // Não-fatal: se gabarito falhar, devolve questões sem gabarito
      console.warn('[prova-extract] gabarito ai falhou:', err)
    }
  }

  // ── Aplica gabarito nas questões ─────────────────────────────────────────
  const questoesComGabarito = extracted.questoes.map((q: any) => {
    const g = gabaritoMap.get(q.numero)
    return {
      numero: q.numero,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      gabarito: g && g !== 'ANULADA' ? g : null,
      anulada: g === 'ANULADA',
    }
  })

  const comGabarito = questoesComGabarito.filter((q: any) => q.gabarito).length
  const anuladas = questoesComGabarito.filter((q: any) => q.anulada).length

  return NextResponse.json({
    ok: true,
    questoes: questoesComGabarito,
    stats: {
      total: questoesComGabarito.length,
      comGabarito,
      anuladas,
      semGabarito: questoesComGabarito.length - comGabarito - anuladas,
    },
  })
}
