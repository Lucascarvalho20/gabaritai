import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAIVision, parseAIJson } from '@/lib/ai-client'
import { apiError } from '@/lib/api-errors'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Extrai a ESTRUTURA COMPLETA do edital — multi-cargo + metadados completos.
 *
 * O PDF entra UMA vez. A IA varre tudo e devolve:
 *   - editalGeral: numero, ano, órgão, banca, datas, taxa
 *   - cargos[]: cada cargo com vagas, salário, escolaridade, total de questões,
 *               duração, redação, formato (CE/ME), regra de anulação E a árvore
 *               matéria→tópico daquele cargo.
 *
 * Depois o servidor cruza cada cargo com os Course cadastrados (match por nome/cargo)
 * pra UI sugerir "esse cargo é o seu PF-Agente?".
 *
 * Admin escolhe quais cargos importar e ajusta o que precisar.
 *
 * Body multipart: { pdf: File }
 * OU JSON: { pdfBase64 }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const contentType = req.headers.get('content-type') ?? ''
  let pdfBuffer: ArrayBuffer

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('pdf') as File | null
      if (!file) return NextResponse.json({ message: 'Anexe o PDF do edital' }, { status: 400 })
      pdfBuffer = await file.arrayBuffer()
    } else {
      const body = await req.json()
      if (!body.pdfBase64) return NextResponse.json({ message: 'pdfBase64 obrigatório' }, { status: 400 })
      pdfBuffer = Buffer.from(body.pdfBase64, 'base64').buffer as ArrayBuffer
    }
  } catch (err: any) {
    return apiError(err, 'PDF inválido ou corrompido', 'edital-extract-pdf-parse', 400)
  }

  if (pdfBuffer.byteLength === 0) {
    return NextResponse.json({ message: 'PDF vazio' }, { status: 400 })
  }
  if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ message: 'PDF maior que 20MB — divida em partes' }, { status: 413 })
  }

  const base64 = Buffer.from(pdfBuffer).toString('base64')

  const prompt = `Você é um EXTRATOR ESPECIALISTA de editais de concurso público brasileiro. Sua função é ler o edital anexo e devolver um JSON estruturado com TUDO que está nele — sem inventar nada que não esteja no documento.

ESTE EDITAL PODE TER MÚLTIPLOS CARGOS (perito + delegado + agente + escrivão no mesmo PDF é comum em PF, PC). Você DEVE identificar e listar TODOS os cargos descritos, separadamente, mesmo que compartilhem o mesmo conteúdo programático.

═══════════════════════════════════════════════════════════════
O QUE VOCÊ DEVE EXTRAIR
═══════════════════════════════════════════════════════════════

A) editalGeral — dados que valem pra TODOS os cargos:
   - numero: ex "001/2026" ou "EDITAL Nº 1 — CONCURSO PÚBLICO DA POLÍCIA FEDERAL/2026"
   - ano: ano do edital (Int)
   - orgao: ex "Polícia Federal", "Polícia Civil do DF"
   - banca: nome da banca organizadora — ex "Cebraspe", "FGV", "FCC", "Vunesp"
   - dataAbertura: data de publicação do edital (ISO yyyy-mm-dd ou null)
   - dataInscricaoIni: data de início das inscrições (ISO ou null)
   - dataInscricaoFim: data de fim das inscrições (ISO ou null)
   - dataProva: data da prova objetiva (ISO ou null)
   - taxaInscricao: valor da taxa em reais (Float, ex 180.00 — null se isento ou não declarado)

B) cargos[] — para CADA cargo descrito no edital:
   - nome: nome COMPLETO do cargo como aparece no edital (ex "Agente de Polícia Federal", "Delegado de Polícia Federal", "Perito Criminal Federal — Área 1 (Engenharia Civil)")
   - vagas: número de vagas pra esse cargo (Int — soma ampla concorrência + cotas se aparecer só total)
   - salario: remuneração mensal inicial (Float em reais)
   - escolaridade: ex "Superior em qualquer área", "Médio", "Superior em Direito"
   - totalQuestoes: total de questões da prova objetiva pra esse cargo (Int)
   - duracaoMin: duração da prova em MINUTOS (Int — converta "4 horas" em 240)
   - hasRedacao: true se o cargo tem prova discursiva/redação obrigatória, false caso contrário
   - examFormat: formato das questões objetivas. Use APENAS um destes códigos:
       * "CE"     → certo/errado (estilo Cebraspe clássico)
       * "ME_5"   → múltipla escolha com 5 alternativas (A,B,C,D,E)
       * "ME_4"   → múltipla escolha com 4 alternativas (A,B,C,D)
       * "MISTA"  → mistura CE + múltipla escolha
       * null     → se não conseguir identificar
   - wrongAnnulsRight: true se "item errado ANULA item certo" (penalização) — typical Cebraspe. false caso contrário.
   - regraAnulacaoTexto: texto LITERAL do edital sobre regra de pontuação/anulação (1-2 frases) — null se não houver
   - materias: árvore do conteúdo programático DESTE cargo (ver formato abaixo)

C) materias[] (dentro de cada cargo):
   Array de objetos, na ORDEM em que aparecem no edital. Cada objeto:
   {
     "nome": "Direito Constitucional",          // nome EXATO como no edital
     "ordem": 1,                                // posição no edital
     "qtdQuestoes": 20,                         // qtas questões dessa matéria (Int ou null se não informado)
     "peso": 1.5,                               // peso/multiplicador (Float, default 1, null se não informado)
     "topicos": [
       {
         "nome": "Princípios Fundamentais",
         "ordem": 1,
         "subtopicos": [
           { "nome": "Soberania, cidadania, dignidade", "ordem": 1 }
         ]
       }
     ]
   }
   Preserve HIERARQUIA: se edital diz "1. Direito Constitucional / 1.1 Princípios / 1.1.1 Soberania", retorne 3 níveis (matéria→tópico→subtópico).

═══════════════════════════════════════════════════════════════
REGRAS RÍGIDAS
═══════════════════════════════════════════════════════════════

1. NÃO INVENTE. Se o campo não está no edital, retorne null (não chute).
2. NOMES EXATOS. Preserve acentuação, capitalização e numeração do edital.
3. MULTI-CARGO: se o conteúdo programático é IDÊNTICO entre cargos, ainda assim liste cada cargo separadamente em "cargos[]" — só repete o array de materias.
4. CARGOS DE ÁREAS: "Perito Criminal Federal — Área 1, 2, 3..." são cargos DIFERENTES, liste todos.
5. SE O PDF NÃO FOR EDITAL: retorne { "erro": "explicação" }.

═══════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════════════════════════════

Responda APENAS o JSON puro (sem markdown, sem texto antes ou depois):

{
  "editalGeral": {
    "numero": "...",
    "ano": 2026,
    "orgao": "...",
    "banca": "...",
    "dataAbertura": "2026-01-15",
    "dataInscricaoIni": null,
    "dataInscricaoFim": null,
    "dataProva": null,
    "taxaInscricao": 180.00
  },
  "cargos": [
    {
      "nome": "Agente de Polícia Federal",
      "vagas": 100,
      "salario": 12522.50,
      "escolaridade": "Superior em qualquer área",
      "totalQuestoes": 120,
      "duracaoMin": 240,
      "hasRedacao": true,
      "examFormat": "CE",
      "wrongAnnulsRight": true,
      "regraAnulacaoTexto": "Cada item errado anulará um item certo.",
      "materias": [
        {
          "nome": "Direito Constitucional",
          "ordem": 1,
          "qtdQuestoes": 20,
          "peso": 1,
          "topicos": [
            { "nome": "Princípios Fundamentais", "ordem": 1, "subtopicos": [] }
          ]
        }
      ]
    }
  ]
}`

  let extracted: any
  try {
    const raw = await callAIVision({
      prompt,
      imageBase64: base64,
      mimeType: 'application/pdf',
      maxTokens: 32000,
    })
    extracted = parseAIJson(raw)
  } catch (err: any) {
    return apiError(err, 'Falha na extração via IA — tenta de novo', 'edital-extract-ai')
  }

  if (extracted.erro) {
    return NextResponse.json({ message: 'IA: ' + extracted.erro }, { status: 422 })
  }
  if (!Array.isArray(extracted.cargos) || extracted.cargos.length === 0) {
    return NextResponse.json(
      { message: 'IA não identificou nenhum cargo no PDF. Verifique se o PDF é o edital oficial.' },
      { status: 422 },
    )
  }

  // ── Cruza cargos detectados com Courses cadastrados ─────────────────────
  const knownCourses = await prisma.course.findMany({
    where: { active: true },
    select: { id: true, name: true, cargo: true, orgao: true, slug: true, parentSlug: true },
    orderBy: { name: 'asc' },
  })

  const norm = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim()

  function jaccard(a: string, b: string): number {
    const aT = new Set(norm(a).split(' ').filter((t) => t.length > 2))
    const bT = new Set(norm(b).split(' ').filter((t) => t.length > 2))
    if (aT.size === 0 || bT.size === 0) return norm(a) === norm(b) ? 1 : 0
    const inter = [...aT].filter((t) => bT.has(t)).length
    const uni = new Set([...aT, ...bT]).size
    return inter / uni
  }

  const orgaoFromEdital = extracted.editalGeral?.orgao ?? ''
  const cargosWithMatches = extracted.cargos.map((c: any) => {
    const cargoTokens = norm(c.nome)
    const orgaoTokens = norm(orgaoFromEdital)
    const ranked = knownCourses
      .map((kc) => {
        // similaridade composta: nome do cargo (peso 2) + órgão (peso 1)
        const cargoSim = Math.max(
          jaccard(cargoTokens, kc.cargo ?? ''),
          jaccard(cargoTokens, kc.name),
        )
        const orgaoSim = orgaoTokens && kc.orgao ? jaccard(orgaoTokens, kc.orgao) : 0
        const score = cargoSim * 0.7 + orgaoSim * 0.3
        return { course: kc, score, cargoSim, orgaoSim }
      })
      .filter((r) => r.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    return {
      ...c,
      courseMatches: ranked.map((r) => ({
        courseId: r.course.id,
        courseName: r.course.name,
        cargo: r.course.cargo,
        orgao: r.course.orgao,
        score: Math.round(r.score * 100) / 100,
      })),
      suggestedCourseId: ranked[0]?.score >= 0.6 ? ranked[0].course.id : null,
    }
  })

  // Hash do PDF pra auditoria + detectar duplicatas
  const crypto = await import('crypto')
  const pdfHash = crypto.createHash('sha256').update(Buffer.from(pdfBuffer)).digest('hex')

  // Carrega matérias globais existentes pra ajudar o admin a fazer match
  const knownSubjects = await prisma.subject.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  // Stats
  const totalMaterias = cargosWithMatches.reduce(
    (acc: number, c: any) => acc + (c.materias?.length ?? 0),
    0,
  )
  const totalTopicos = cargosWithMatches.reduce(
    (acc: number, c: any) =>
      acc + (c.materias?.reduce((a: number, m: any) => a + (m.topicos?.length ?? 0), 0) ?? 0),
    0,
  )

  return NextResponse.json({
    ok: true,
    pdfHash,
    pdfSizeKb: Math.round(pdfBuffer.byteLength / 1024),
    editalGeral: extracted.editalGeral ?? {},
    cargos: cargosWithMatches,
    knownCourses,
    knownSubjects,
    stats: {
      cargos: cargosWithMatches.length,
      cargosComMatch: cargosWithMatches.filter((c: any) => c.suggestedCourseId).length,
      materias: totalMaterias,
      topicos: totalTopicos,
    },
  })
}
