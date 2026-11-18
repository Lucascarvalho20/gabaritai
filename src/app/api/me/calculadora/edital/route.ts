import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { estimarPrograma } from '@/lib/calculadora'
import { referenciasDaPlataforma } from '@/lib/calculadora-dados'
import { ErroEdital, pareceComPdf, MAX_PDF_BYTES, MAX_TEXTO, MIN_TEXTO } from '@/lib/edital-aluno'
import { lerEditalDoAluno } from '@/lib/edital-aluno-leitura'

// Um edital de 100 páginas leva de 30 s a 2 min na IA.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * POST /api/me/calculadora/edital — o aluno manda o edital (PDF em multipart,
 * campo "pdf", ou JSON { texto }) e recebe, por cargo, as matérias, o programa
 * e a estimativa de tempo (a suposição de calculadora.ts: tópicos do edital ×
 * tempo real de um tópico da mesma matéria no site).
 *
 * Qualquer conta logada usa, inclusive a gratuita. Proteções: login, limite
 * por IP, cota diária por aluno (edital já lido por alguém sai do cache, sem
 * gastar cota) e o tamanho do arquivo. Nada do arquivo é guardado.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  const rl = rateLimit({ key: `edital-aluno:${getClientIp(req)}`, windowMs: 60_000, max: 6 })
  if (!rl.allowed) return NextResponse.json({ message: 'Muitos envios seguidos. Espere um minuto.' }, { status: 429 })

  let pdf: Buffer | undefined
  let texto: string | undefined
  try {
    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const arquivo = (await req.formData()).get('pdf')
      if (!arquivo || typeof arquivo === 'string') return NextResponse.json({ message: 'Anexe o PDF do edital.' }, { status: 400 })
      if (arquivo.size > MAX_PDF_BYTES) {
        return NextResponse.json({ message: 'O PDF passa de 4 MB. Cole o texto do edital (ou só o conteúdo programático) no campo de texto.' }, { status: 413 })
      }
      pdf = Buffer.from(await arquivo.arrayBuffer())
      if (!pareceComPdf(pdf)) return NextResponse.json({ message: 'Este arquivo não é um PDF.' }, { status: 400 })
    } else {
      const corpo = await req.json().catch(() => ({}))
      const colado: string = typeof corpo?.texto === 'string' ? corpo.texto : ''
      texto = colado
      if (colado.length < MIN_TEXTO) return NextResponse.json({ message: 'Cole o texto do edital (pelo menos o quadro de provas e o conteúdo programático).' }, { status: 400 })
      if (colado.length > MAX_TEXTO) return NextResponse.json({ message: 'Texto longo demais. Cole só o quadro de provas e o conteúdo programático.' }, { status: 413 })
    }
  } catch {
    return NextResponse.json({ message: 'Não consegui receber o arquivo. Tente de novo.' }, { status: 400 })
  }

  try {
    const usuario = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { hasFullAccess: true } })
    const { edital, doCache } = await lerEditalDoAluno({ userId: auth.user.id, hasFullAccess: !!usuario?.hasFullAccess, pdf, texto })
    const refs = await referenciasDaPlataforma()
    return NextResponse.json({
      edital: { orgao: edital.orgao, banca: edital.banca, ano: edital.ano, dataProva: edital.dataProva },
      cargos: edital.cargos.map((c) => ({
        nome: c.nome,
        totalQuestoes: c.totalQuestoes,
        programa: c.materias,
        estimativa: estimarPrograma(c.materias, refs.porMateria, refs.geral),
      })),
      doCache,
    })
  } catch (err: any) {
    if (err instanceof ErroEdital) return NextResponse.json({ message: err.message }, { status: err.status })
    if (err?.code === 'QUOTA_EXCEEDED') {
      return NextResponse.json({ message: `Você já leu ${err.quota?.limit ?? 'os'} editais hoje. Amanhã libera de novo.`, quota: err.quota }, { status: 429 })
    }
    console.error('[calculadora-edital]', err)
    return NextResponse.json({ message: 'Não foi possível ler o edital agora.' }, { status: 500 })
  }
}
