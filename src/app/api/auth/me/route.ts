import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { DEMO_USERS } from '@/lib/demo-users'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const token = auth.split(' ')[1]
  const payload = await verifyToken(token)

  if (!payload) {
    return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
  }

  const user = DEMO_USERS.find(u => u.id === payload.sub)
  if (!user) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  const { password: _pw, betaAccessCode: _code, ...safeUser } = user
  return NextResponse.json({
    ...safeUser,
    profile: {
      concursoId: user.courses === 'all' ? 'todos' : (user.courses as string[])[0],
      concursoLabel: user.concursoAlvo,
      nivel: user.nivel,
      horasDia: user.horasDia,
      meta: user.meta,
    }
  })
}
