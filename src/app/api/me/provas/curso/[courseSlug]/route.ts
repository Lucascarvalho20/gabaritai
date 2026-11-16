import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { desempenhoEmProvas, provasDoCurso } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/provas/curso/[courseSlug] — as provas oficiais do curso, as
 * tentativas do aluno em cada uma e o desempenho somado por matéria.
 * Sem o curso, a lista vem com `acesso: false` (a tela mostra o cadeado).
 */
export async function GET(req: NextRequest, { params }: { params: { courseSlug: string } }) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    const lista = await provasDoCurso(auth.user.id, params.courseSlug)
    const desempenho = lista.acesso ? await desempenhoEmProvas(auth.user.id, params.courseSlug) : null
    return NextResponse.json({ ...lista, desempenho })
  } catch (err) {
    return respostaDeErro(err, 'provas-curso')
  }
}
