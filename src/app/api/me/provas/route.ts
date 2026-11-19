import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { cursosComProvas } from '@/lib/provas/aluno'
import { respostaDeErro } from '@/lib/provas/http'

export const dynamic = 'force-dynamic'

/** GET /api/me/provas — os cursos com prova oficial que a conta vê, com quantas provas e se tem acesso. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    return NextResponse.json({ cursos: await cursosComProvas(auth.user.id) })
  } catch (err) {
    return respostaDeErro(err, 'provas-cursos')
  }
}
