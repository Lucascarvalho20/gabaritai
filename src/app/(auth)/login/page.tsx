'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import type { Metadata } from 'next'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data)
      const { token, user } = res.data
      localStorage.setItem('gabaritai_token', token)
      setUser(user)
      toast.success(`Bem-vindo de volta, ${user.name.split(' ')[0]}!`)
      if (user.role === 'ADMIN') router.push('/admin')
      else router.push('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'E-mail ou senha incorretos'
      toast.error(msg)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Entrar na plataforma</h1>
        <p className="text-muted-foreground">Continue de onde parou e siga em direção à aprovação.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            className="input"
            placeholder="seu@email.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className="text-danger-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label mb-0">Senha</label>
            <Link href="/esqueci-senha" className="text-xs text-brand-600 hover:underline dark:text-brand-400">
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className="input pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/registro" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>

      {/* Quick access for testing */}
      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3">ACESSO RÁPIDO (TESTES)</p>
        <div className="space-y-2">
          {[
            { label: 'Admin', email: 'admin@gabaritai.com.br', pass: 'Admin@2024!' },
            { label: 'Aluno 1', email: 'teste1@gabaritai.com.br', pass: 'Teste@2024!' },
            { label: 'Aluno 2', email: 'teste2@gabaritai.com.br', pass: 'Teste@2024!' },
          ].map(({ label, email, pass }) => (
            <button
              key={email}
              type="button"
              onClick={() => {
                const form = document.querySelector('form')
                if (form) {
                  const emailInput = form.querySelector<HTMLInputElement>('[type="email"]')
                  const passInput = form.querySelector<HTMLInputElement>('[type="password"], [name="password"]')
                  if (emailInput) { emailInput.value = email; emailInput.dispatchEvent(new Event('input', { bubbles: true })) }
                  if (passInput) { passInput.value = pass; passInput.dispatchEvent(new Event('input', { bubbles: true })) }
                }
              }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg bg-background hover:bg-muted border border-border transition-colors flex justify-between items-center"
            >
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
