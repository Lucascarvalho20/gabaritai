import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, DEMO_USERS } from '@/lib/demo-users'
import { signToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const user = findUserByEmail(email)

    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    })

    const { password: _pw, betaAccessCode: _code, ...safeUser } = user

    return NextResponse.json({
      token,
      user: {
        ...safeUser,
        profile: {
          concursoId: user.courses === 'all' ? 'todos' : (user.courses as string[])[0],
          concursoLabel: user.concursoAlvo,
          nivel: user.nivel,
          horasDia: user.horasDia,
          meta: user.meta,
        }
      }
    })
  } catch (err) {
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
