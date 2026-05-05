import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail } from '@/lib/demo-users'
import { signToken } from '@/lib/jwt'

// Em produção: salvar no PostgreSQL. Para demo, retorna um usuário free temporário.
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const existing = findUserByEmail(email)
    if (existing) {
      return NextResponse.json({ message: 'Este e-mail já está cadastrado' }, { status: 409 })
    }

    // Cria usuário temporário de trial (7 dias)
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: 'STUDENT' as const,
      plan: 'FREE' as const,
      courses: [] as string[],
      concursoAlvo: '',
      isBetaTester: false,
    }

    const token = await signToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      plan: newUser.plan,
    })

    return NextResponse.json({ token, user: newUser }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
