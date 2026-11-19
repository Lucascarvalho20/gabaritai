import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { generateOrFetchCached } from '@/lib/ai-cache'
import { garantirCota, incrementQuota } from '@/lib/ai-quota'
import { hasAccessToCourse } from '@/lib/plan-access'
import { promptDeExplicacao } from '@/lib/explicacao-questao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/me/questoes/[id]/explicacao
 *
 * "Por que está certo / por que está errado" de uma questão. A IA gera UMA vez
 * por questão e o texto fica no cache compartilhado: o próximo aluno recebe na
 * hora, sem esperar a IA e sem gastar cota. Antes o botão passava pelo chat do
 * mentor — busca semântica, conversa gravada e IA — a cada clique de cada aluno.
 *
 * A explicação entrega o gabarito, então só sai para quem já respondeu a
 * questão ou tem acesso ao gabarito da prova de onde ela veio.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const questao = await prisma.question.findUnique({
    where: { id: params.id },
    select: {
      id: true, enunciado: true, alternativas: true, gabarito: true, explicacao: true, active: true,
      bancaSlug: true, orgao: true, ano: true, subjectId: true,
      subject: { select: { name: true } },
      prova: { select: { courseId: true } },
      comando: true,
      provaTexto: { select: { titulo: true, conteudo: true } },
    },
  })
  if (!questao || !questao.active) return NextResponse.json({ message: 'Questão não disponível' }, { status: 404 })

  const [respondeu, conta] = await Promise.all([
    prisma.questionAttempt.findFirst({ where: { userId: user.id, questionId: questao.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { hasFullAccess: true } }),
  ])
  const podeVer = !!respondeu || (questao.prova?.courseId ? await hasAccessToCourse(user.id, questao.prova.courseId) : false)
  if (!podeVer) return NextResponse.json({ message: 'Responda a questão para ver a explicação.' }, { status: 403 })

  if (questao.explicacao?.trim()) {
    return NextResponse.json({ texto: questao.explicacao, origem: 'cadastrada' })
  }

  try {
    const { content, cached } = await generateOrFetchCached<string>({
      kind: 'explicacao',
      subjectId: questao.subjectId,
      bancaSlug: questao.bancaSlug,
      // O gabarito entra na chave: se a banca trocar o gabarito, a explicação velha não volta.
      extra: `questao:${questao.id}:${questao.gabarito.trim().toUpperCase()}:v1`,
      prompt: promptDeExplicacao({ ...questao, materia: questao.subject?.name ?? null, textoBase: questao.provaTexto }),
      // O aluno espera na tela: a fila rápida (Groq primeiro, raciocínio curto, tempo-limite).
      aiTask: 'rapida',
      maxTokens: 700,
      temperature: 0.3,
      // Confere a cota antes de chamar a IA, mas só desconta se a geração der
      // certo: IA fora do ar não pode comer a cota do aluno.
      antesDeGerar: () => garantirCota({ userId: user.id, kind: 'explicacao_ia', hasFullAccess: !!conta?.hasFullAccess }),
    })
    if (!cached) await incrementQuota({ userId: user.id, kind: 'explicacao_ia' })
    return NextResponse.json({ texto: String(content), origem: cached ? 'cache' : 'ia' })
  } catch (err: any) {
    if (err?.code === 'QUOTA_EXCEEDED') {
      return NextResponse.json({ message: err.message, quota: err.quota }, { status: 429 })
    }
    console.error('[questoes/explicacao]', err)
    return NextResponse.json({ message: 'A IA não respondeu agora. Tente de novo em instantes.' }, { status: 503 })
  }
}
