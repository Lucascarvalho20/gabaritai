import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { cursosDoAluno, modoDaCalculadora } from '@/lib/calculadora-dados'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/calculadora — o que a calculadora do aluno precisa do servidor.
 *
 * Plano pago (e teste de 7 dias): os cursos do aluno, cada um com a estimativa
 * do conteúdo do edital. As contas com as horas do aluno — juntar dois cursos,
 * caber até a prova, por onde começar — rodam no navegador (calculadora.ts):
 * o servidor não precisa saber das horas dele.
 *
 * Gratuito: nenhum curso — a calculadora dele é a do edital em PDF.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })
  try {
    const modo = await modoDaCalculadora(auth.user.id)
    const cursos = modo === 'pago' ? await cursosDoAluno(auth.user.id) : []
    return NextResponse.json({ modo, cursos })
  } catch (err) {
    console.error('[calculadora]', err)
    return NextResponse.json({ message: 'Não foi possível calcular agora.' }, { status: 500 })
  }
}
