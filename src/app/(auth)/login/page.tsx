'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const schema = z.object({
  identifier: z.string().min(3, 'Informe seu email ou username'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

const QUICK_ACCESS = [
  { label: '👑 Admin',        identifier: 'admin@gabaritai.com.br',      pass: 'Admin@2024!' },
  { label: '⭐ Acesso total',  identifier: 'teste-full@gabaritai.com.br', pass: 'Teste@2024!' },
  { label: '🛡️ Só PMDF',     identifier: 'teste-pmdf@gabaritai.com.br', pass: 'Teste@2024!' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore(s => s.setUser)
  const [showPass, setShowPass] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')

  const showDevPanel = searchParams.get('dev') === 'gabaritai'

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const payload: any = { ...data }
      if (needs2FA && totpCode) payload.totpCode = totpCode
      const res = await api.post('/auth/login', payload)

      // Se backend pediu 2FA, mostra input
      if (res.data?.requires2FA && !res.data?.token) {
        setNeeds2FA(true)
        toast('Informe o código de 6 dígitos do app autenticador')
        return
      }

      const { token, user } = res.data
      localStorage.setItem('gabaritai_token', token)
      setUser(user)
      toast.success(`Bem-vindo, ${user.name.split(' ')[0]}! 🎯`)
      if (user.role === 'ADMIN') router.push('/admin')
      else router.push('/dashboard')
    } catch (err: any) {
      const data = err.response?.data
      if (data?.requires2FA) {
        setNeeds2FA(true)
        toast.error(data.message ?? 'Código 2FA inválido')
        return
      }
      const msg = data?.message ?? 'Credenciais inválidas'
      toast.error(msg)
    }
  }

  function quickLogin(identifier: string, pass: string) {
    setValue('identifier', identifier)
    setValue('password', pass)
    handleSubmit(onSubmit)()
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Entrar na plataforma</h1>
        <p className="text-muted-foreground">Continue de onde parou e siga em direção à aprovação.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">E-mail ou username</label>
          <input
            type="text"
            className="input"
            placeholder="seu@email.com ou seu-username"
            autoComplete="username"
            autoCapitalize="off"
            {...register('identifier')}
          />
          {errors.identifier && <p className="text-danger-500 text-xs mt-1">{errors.identifier.message}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label mb-0">Senha</label>
            <Link href="#" className="text-xs text-brand-600 hover:underline dark:text-brand-400">Esqueci minha senha</Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className="input pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {needs2FA && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
            <label className="text-xs font-semibold text-foreground">Código do app autenticador (6 dígitos)</label>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-widest font-mono"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Abra Google Authenticator, Authy ou 1Password e digite o código atual.
            </p>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          {isSubmitting ? 'Entrando...' : needs2FA ? 'Confirmar código' : 'Entrar'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
      </div>

      <a
        href="/api/auth/google"
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-sm transition"
      >
        <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
          <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
          <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
          <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
        </svg>
        Entrar com Google
      </a>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/registro" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Criar conta grátis</Link>
        </p>
      </div>

      {showDevPanel && (
        <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3">ACESSO RÁPIDO — PERFIS DE TESTE</p>
          <div className="grid grid-cols-1 gap-1.5">
            {QUICK_ACCESS.map(({ label, identifier, pass }) => (
              <button
                key={identifier}
                type="button"
                onClick={() => quickLogin(identifier, pass)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-background hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-border hover:border-brand-300 transition-colors flex justify-between items-center group"
              >
                <span className="font-semibold text-foreground">{label}</span>
                <span className="text-muted-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate ml-2">{identifier}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Clique em qualquer perfil para entrar automaticamente
          </p>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-fade-in"><div className="mb-8"><div className="h-8 bg-muted rounded w-64 mb-2" /><div className="h-4 bg-muted rounded w-80" /></div></div>}>
      <LoginForm />
    </Suspense>
  )
}
