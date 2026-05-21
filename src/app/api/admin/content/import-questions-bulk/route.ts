import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { callAIVision, parseAIJson } from '@/lib/ai-client'
import { Difficulty, QuestionSource } from '@prisma/client'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Importação em lote de provas oficiais — abordagem "filename + block + gabarito".
 *
 * Convenção de nome (obrigatória — sem isso vai pra revisão manual):
 *   {ANO}_{BANCA}_{ORGAO}_{CARGO}_caderno.pdf
 *   {ANO}_{BANCA}_{ORGAO}_{CARGO}_gabarito.pdf
 *
 * Exemplos válidos:
 *   2025_CEBRASPE_PF_AGENTE_caderno.pdf
 *   2025_CEBRASPE_PF_AGENTE_gabarito.pdf
 *   2022_AOCP_PMGO_SOLDADO_caderno.pdf
 *
 * Fluxo:
 *  1. Recebe N PDFs via multipart
 *  2. Agrupa por chave (ANO_BANCA_ORGAO_CARGO)
 *  3. Pra cada par caderno+gabarito:
 *     - Caderno → IA extrai questões agrupadas por bloco/matéria
 *     - Gabarito → IA extrai tabela número→letra
 *     - Cruza pelo número → preenche gabarito da questão
 *  4. Persiste em batch
 *
 * Body multipart:
 *   { files: File[], dryRun?: 'true'|'false' }
 *
 * Retorna preview ou contagem persistida.
 */
type ParsedName = {
  ano: number
  banca: string
  orgao: string
  cargo: string
  tipo: 'caderno' | 'gabarito' | 'unknown'
  key: string // ano_banca_orgao_cargo (lowercase)
  filename: string
}

function parseFilename(filename: string): ParsedName | null {
  const base = filename.replace(/\.pdf$/i, '')
  const parts = base.split(/[_-]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 4) return null
  const ano = parseInt(parts[0], 10)
  if (!Number.isFinite(ano) || ano < 1990 || ano > 2100) return null
  const tipoRaw = parts[parts.length - 1].toLowerCase()
  let tipo: 'caderno' | 'gabarito' | 'unknown' = 'unknown'
  if (/gab/.test(tipoRaw)) tipo = 'gabarito'
  else if (/cad|prova|questoes/.test(tipoRaw)) tipo = 'caderno'

  // Se o último termo for tipo, remove pra extrair cargo
  const hasTipoSuffix = tipo !== 'unknown'
  const mainParts = hasTipoSuffix ? parts.slice(0, -1) : parts
  if (mainParts.length < 4) return null

  const banca = mainParts[1].toUpperCase()
  const orgao = mainParts[2].toUpperCase()
  const cargo = mainParts.slice(3).join('_').toUpperCase()
  // Se não veio sufixo, assume caderno
  if (tipo === 'unknown') tipo = 'caderno'

  return {
    ano,
    banca,
    orgao,
    cargo,
    tipo,
    key: `${ano}_${banca}_${orgao}_${cargo}`.toLowerCase(),
    filename,
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ message: 'Envie multipart/form-data' }, { status: 400 })
  }

  const form = await req.formData()
  const dryRun = form.get('dryRun') === 'true'
  const files: File[] = []
  for (const [key, value] of form.entries()) {
    if (key === 'files' && value instanceof File) files.push(value)
  }
  if (files.length === 0) {
    return NextResponse.json({ message: 'Anexe pelo menos um PDF em "files"' }, { status: 400 })
  }

  // Parse de nomes
  const parsed: Array<ParsedName & { file: File }> = []
  const naoReconhecidos: string[] = []
  for (const f of files) {
    const p = parseFilename(f.name)
    if (!p) naoReconhecidos.push(f.name)
    else parsed.push({ ...p, file: f })
  }

  // Agrupa por chave (uma chave = um par caderno+gabarito potencialmente)
  const grupos = new Map<string, { caderno?: File; gabarito?: File; meta: ParsedName }>()
  for (const p of parsed) {
    const g = grupos.get(p.key) ?? { meta: p }
    if (p.tipo === 'caderno') g.caderno = p.file
    else if (p.tipo === 'gabarito') g.gabarito = p.file
    grupos.set(p.key, g)
  }

  // Matérias do banco pra IA mapear
  const allSubjects = await prisma.subject.findMany({ select: { id: true, name: true } })
  const subjectsList = allSubjects.map((s) => s.name).join(', ')
  const subjectByName = new Map(allSubjects.map((s) => [s.name.toLowerCase(), s.id]))

  const PROMPT_CADERNO = (meta: ParsedName) => `Você é extrator estruturado de provas de concurso brasileiro.

Esta é a prova: ${meta.banca} ${meta.ano} — ${meta.orgao} — cargo ${meta.cargo}.

Extraia TODAS as questões. Pra cada uma, determine a matéria pelo HEADER da seção (ex: "DIREITO CONSTITUCIONAL", "PORTUGUÊS", "INFORMÁTICA"). Use estes nomes EXATOS pra "materia":
${subjectsList}

Se uma questão estiver entre headers, use o último header visto. Se um header não bater nenhum da lista, use o nome literal do PDF.

Retorne APENAS JSON array (sem markdown):
[{
  "numero": 1,
  "materia": "Direito Constitucional",
  "enunciado": "texto completo (inclua texto-base/CG1A1 se houver)",
  "alternativas": [{"letra":"A","texto":"..."}] OU [] se CERTO/ERRADO,
  "gabarito": ""
}]

REGRAS:
- gabarito sempre "" (vai vir do PDF separado de gabarito)
- ignore cabeçalho/rodapé/numeração de página
- Cebraspe = certo/errado (alternativas vazias)
- FGV/FCC/VUNESP/AOCP = A-E`

  const PROMPT_GABARITO = (meta: ParsedName) => `Este é o gabarito da prova ${meta.banca} ${meta.ano} ${meta.orgao} ${meta.cargo}.

Retorne APENAS JSON (sem markdown):
{ "respostas": [{"numero": 1, "resposta": "C"}, ...] }

Se houver múltiplos cargos no mesmo PDF, retorne apenas o do cargo ${meta.cargo}.
Resposta deve ser letra única (A,B,C,D,E) ou "C"/"E" pra certo/errado.`

  const resultados: any[] = []
  let totalQuestoesPersistidas = 0

  for (const [key, g] of grupos.entries()) {
    if (!g.caderno) {
      resultados.push({ key, ok: false, motivo: 'caderno faltando' })
      continue
    }

    try {
      const cadernoBuf = Buffer.from(await g.caderno.arrayBuffer())
      const cadernoB64 = cadernoBuf.toString('base64')

      // 1. Extrai questões do caderno
      const rawCaderno = await callAIVision({
        prompt: PROMPT_CADERNO(g.meta),
        imageBase64: cadernoB64,
        mimeType: 'application/pdf',
        maxTokens: 20000,
      })
      const questoes = parseAIJson<any[]>(rawCaderno)

      // 2. Se tem gabarito, extrai
      let gabaritoMap = new Map<number, string>()
      if (g.gabarito) {
        const gabBuf = Buffer.from(await g.gabarito.arrayBuffer())
        const gabB64 = gabBuf.toString('base64')
        const rawGab = await callAIVision({
          prompt: PROMPT_GABARITO(g.meta),
          imageBase64: gabB64,
          mimeType: 'application/pdf',
          maxTokens: 6000,
        })
        const gabJson = parseAIJson<{ respostas: Array<{ numero: number; resposta: string }> }>(rawGab)
        for (const r of gabJson.respostas ?? []) gabaritoMap.set(r.numero, r.resposta)
      }

      // 3. Cruza: preenche gabarito.numero → questao
      for (const q of questoes) {
        if (q.numero && gabaritoMap.has(q.numero)) {
          q.gabarito = gabaritoMap.get(q.numero) ?? ''
        }
      }

      const semGabarito = questoes.filter((q: any) => !q.gabarito).length

      if (!dryRun) {
        // 4. Persiste
        const created = await prisma.$transaction(
          questoes.map((q: any) => {
            const subjId = q.materia ? subjectByName.get(q.materia.toLowerCase()) ?? null : null
            return prisma.question.create({
              data: {
                subjectId: subjId,
                bancaSlug: g.meta.banca.toLowerCase(),
                orgao: g.meta.orgao,
                ano: g.meta.ano,
                numeroQuestao: q.numero ?? null,
                source: QuestionSource.OFFICIAL,
                difficulty: Difficulty.MEDIUM,
                enunciado: q.enunciado,
                alternativas: (q.alternativas ?? []) as any,
                gabarito: q.gabarito ?? '',
                explicacao: '',
                tags: [
                  'bulk-import',
                  `banca:${g.meta.banca.toLowerCase()}`,
                  `ano:${g.meta.ano}`,
                  `orgao:${g.meta.orgao.toLowerCase()}`,
                  `cargo:${g.meta.cargo.toLowerCase()}`,
                ],
              },
              select: { id: true },
            })
          }),
        )
        totalQuestoesPersistidas += created.length
        resultados.push({
          key, ok: true, ano: g.meta.ano, banca: g.meta.banca, orgao: g.meta.orgao, cargo: g.meta.cargo,
          questoesExtraidas: questoes.length, persistidas: created.length, semGabarito,
        })
      } else {
        resultados.push({
          key, ok: true, ano: g.meta.ano, banca: g.meta.banca, orgao: g.meta.orgao, cargo: g.meta.cargo,
          questoesExtraidas: questoes.length, semGabarito,
          amostra: questoes.slice(0, 3),
        })
      }
    } catch (err: any) {
      resultados.push({ key, ok: false, motivo: err.message })
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    arquivosRecebidos: files.length,
    gruposProcessados: grupos.size,
    naoReconhecidos,
    totalQuestoesPersistidas,
    resultados,
  })
}
