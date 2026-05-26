'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, UserPlus, Mail, CheckCircle2, Gift } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// Valida CPF no client (mesma lógica do backend, pra UX em tempo real)
function isValidCpfClient(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0
  return d2 === parseInt(c[10])
}

function formatCpfInput(v: string): string {
  const c = v.replace(/\D/g, '').slice(0, 11)
  if (c.length <= 3) return c
  if (c.length <= 6) return `${c.slice(0, 3)}.${c.slice(3)}`
  if (c.length <= 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().refine((v) => isValidCpfClient(v), 'CPF inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Precisa de uma maiúscula').regex(/[0-9]/, 'Precisa de um número'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <RegistroInner />
    </Suspense>
  )
}

function RegistroInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [registered, setRegistered] = useState<{ email: string; devVerifyUrl?: string } | null>(null)
  const [refCode, setRefCode] = useState<string | null>(null)

  // Captura ?ref=CODE do URL e persiste em localStorage por 30d
  // (caso o usuário visite a landing primeiro e depois volte pra cá direto)
  useEffect(() => {
    const fromUrl = searchParams.get('ref')
    if (fromUrl) {
      const clean = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
      if (clean) {
        setRefCode(clean)
        try {
          localStorage.setItem('gabaritai_ref', JSON.stringify({ code: clean, ts: Date.now() }))
        } catch {}
        return
      }
    }
    try {
      const stored = localStorage.getItem('gabaritai_ref')
      if (stored) {
        const { code, ts } = JSON.parse(stored)
        // Expira em 30 dias
        if (code && ts && Date.now() - ts < 30 * 24 * 60 * 60 * 1000) {
          setRefCode(code)
        } else {
          localStorage.removeItem('gabaritai_ref')
        }
      }
    } catch {}
  }, [searchParams])

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const cpfValue = watch('cpf') ?? ''
  const cpfClean = cpfValue.replace(/\D/g, '')
  const cpfStatus = cpfClean.length === 0 ? 'idle' : cpfClean.length < 11 ? 'typing' : isValidCpfClient(cpfValue) ? 'valid' : 'invalid'

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ''),
        password: data.password,
        ...(refCode && { ref: refCode }),
      })
      setRegistered({ email: data.email, devVerifyUrl: res.data?.devVerifyUrl })
      try { localStorage.removeItem('gabaritai_ref') } catch {}
      toast.success('Conta criada! Verifique seu e-mail.')
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao criar conta'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    }
  }

  if (registered) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-success-600" />
        </div>
        <h1 className="text-2xl font-black mb-2">Confirme seu e-mail</h1>
        <p className="text-muted-foreground mb-2">
          Enviamos um link de verificação para
        </p>
        <p className="font-semibold text-foreground mb-6">{registered.email}</p>
        <div className="card p-4 text-left text-sm text-muted-foreground space-y-2 mb-6">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
            Abra seu e-mail e clique no botão de verificação
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
            Não está aí? Confira a caixa de spam
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
            O link expira em <strong>48 horas</strong>
          </p>
        </div>
        {registered.devVerifyUrl && (
          <div className="card p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40 text-left">
            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🛠 MODO DEV — Link de verificação (não vai email real):
            </p>
            <a href={registered.devVerifyUrl} className="text-xs break-all text-brand-600 dark:text-brand-400 underline">
              {registered.devVerifyUrl}
            </a>
          </div>
        )}
        <Link href="/login" className="btn-primary inline-flex">Voltar ao login</Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Criar conta</h1>
        <p className="text-muted-foreground">7 dias grátis, sem cartão de crédito.</p>
        {refCode && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <Gift className="w-3.5 h-3.5" />
            Indicado por <span className="font-mono tracking-widest">{refCode}</span>
          </div>
        )}
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
          <label className="label">CPF</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              className="input pr-10"
              placeholder="000.000.000-00"
              maxLength={14}
              {...register('cpf', {
                onChange: (e) => setValue('cpf', formatCpfInput(e.target.value), { shouldValidate: true }),
              })}
            />
            {cpfStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-success-500 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>
          {errors.cpf && <p className="text-danger-500 text-xs mt-1">{errors.cpf.message}</p>}
          {!errors.cpf && cpfStatus === 'invalid' && <p className="text-danger-500 text-xs mt-1">CPF inválido — verifique os dígitos</p>}
          <p className="text-[10px] text-muted-foreground mt-1">Usado pra evitar trial duplicado · armazenado de forma criptografada</p>
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
