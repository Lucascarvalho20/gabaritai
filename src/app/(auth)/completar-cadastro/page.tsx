'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2, ShieldCheck, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }

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

function formatPhoneInput(v: string): string {
  const c = v.replace(/\D/g, '').slice(0, 11)
  if (c.length === 0) return ''
  if (c.length <= 2) return `(${c}`
  if (c.length <= 6) return `(${c.slice(0, 2)}) ${c.slice(2)}`
  if (c.length <= 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`
  return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`
}

const schema = z.object({
  cpf: z.string().refine((v) => isValidCpfClient(v), 'CPF inválido'),
  phone: z.string().refine((v) => v.replace(/\D/g, '').length >= 10, 'Telefone incompleto (DDD + número)'),
  courseSlug: z.string().min(1, 'Escolha um curso'),
})

type FormData = z.infer<typeof schema>

export default function CompletarCadastroPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <CompletarCadastroInner />
    </Suspense>
  )
}

function CompletarCadastroInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [me, setMe] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const cpfValue = watch('cpf') ?? ''
  const cpfClean = cpfValue.replace(/\D/g, '')
  const cpfStatus = cpfClean.length === 0 ? 'idle' : cpfClean.length < 11 ? 'typing' : isValidCpfClient(cpfValue) ? 'valid' : 'invalid'

  // Carrega o user (precisa estar autenticado pra acessar essa página)
  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        // Se já tem CPF e phone, redireciona pro dashboard
        if (data.hasCpf && data.hasPhone) {
          router.replace('/dashboard')
          return
        }
        setMe({ name: data.name, email: data.email })
      })
      .catch(() => {
        // Não autenticado — manda pro login
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  // Carrega cursos disponíveis (filtrados pra militar/policial)
  useEffect(() => {
    api.get('/courses?all=true')
      .then(({ data }) => setCourses(data.courses ?? []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false))
  }, [])

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/me/completar-cadastro', {
        cpf: data.cpf.replace(/\D/g, ''),
        phone: data.phone.replace(/\D/g, ''),
        courseSlug: data.courseSlug,
      })
      if (res.data.courseEnrolled?.studyPlanId) {
        toast.success('Cadastro completo! Seu plano de estudo está pronto.')
      } else {
        toast.success('Cadastro completo! Bem-vindo ao Gabaritai.')
      }
      const next = searchParams.get('next') ?? '/dashboard'
      router.push(next)
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao salvar'
      toast.error(msg)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }
  if (!me) return null

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Falta pouco, {me.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm">
          3 informações pra liberar seu acesso e já montar seu cronograma. Leva 30 segundos.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-500" />
            Qual concurso você vai prestar?
          </label>
          {loadingCourses ? (
            <div className="input flex items-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando concursos…
            </div>
          ) : (
            <select className="input" {...register('courseSlug')}>
              <option value="">— escolha seu concurso —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}{c.cargo ? ` · ${c.cargo}` : ''}{c.orgao ? ` (${c.orgao})` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.courseSlug && <p className="text-danger-500 text-xs mt-1">{errors.courseSlug.message}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">
            Vamos montar um cronograma de estudo automático baseado nesse curso. Você pode trocar depois.
          </p>
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
          <p className="text-[10px] text-muted-foreground mt-1">Criptografado em repouso · usado pra evitar trial duplicado</p>
        </div>

        <div>
          <label className="label">Telefone com DDD</label>
          <input
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="(11) 91234-5678"
            maxLength={16}
            {...register('phone', {
              onChange: (e) => setValue('phone', formatPhoneInput(e.target.value), { shouldValidate: true }),
            })}
          />
          {errors.phone && <p className="text-danger-500 text-xs mt-1">{errors.phone.message}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">Usado só pra recuperar conta · não enviamos spam</p>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full mt-2">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {isSubmitting ? 'Salvando...' : 'Finalizar cadastro'}
        </button>
      </form>
    </div>
  )
}
