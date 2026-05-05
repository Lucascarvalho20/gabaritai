'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula').regex(/[0-9]/, 'Precisa de ao menos um número'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

export default function RegistroPage() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      const { token, user } = res.data
      localStorage.setItem('gabaritai_token', token)
      setUser(user)
      toast.success('Conta criada! Vamos configurar seu plano de estudos.')
      router.push('/onboarding')
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao criar conta'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Criar conta grátis</h1>
        <p className="text-muted-foreground">7 dias grátis, sem cartão de crédito. Comece agora.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input type="text" className="input" placeholder="João Lucas Silva" autoComplete="name" {...register('name')} />
          {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" placeholder="seu@email.com" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-danger-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Senha</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} className="input pr-11" placeholder="Mín. 8 caracteres" autoComplete="new-password" {...register('password')} />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Confirmar senha</label>
          <input type={showPass ? 'text' : 'password'} className="input" placeholder="Repita a senha" autoComplete="new-password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-danger-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full mt-2">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {isSubmitting ? 'Criando conta...' : 'Criar conta grátis'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
