'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Gate forte de cadastro:
 *
 * 1. PROFILE GATE (alta prioridade): aluno PRECISA ter CPF + telefone preenchidos.
 *    Se faltar qualquer um, redireciona pra /completar-cadastro IMEDIATAMENTE.
 *    Isso fecha a brecha onde aluno via Google OAuth podia criar conta sem
 *    preencher e cadastrar com mesmo CPF/phone em outro email depois.
 *
 * 2. ENROLLMENT GATE: aluno precisa de pelo menos 1 enrollment ativo OU plano.
 *    Sem isso, redireciona pra /dashboard/comecar.
 *
 * Decisão de produto (2026-05-31): gate forte total. Aluno sem CPF/phone
 * não vê NADA além de /completar-cadastro e /configuracoes.
 *
 * Rotas LIBERADAS de profile gate (sem CPF/phone funciona):
 *  - /dashboard/configuracoes (perfil/conta — onde aluno preenche)
 *
 * Rotas LIBERADAS de enrollment gate (com CPF/phone mas sem curso/plano):
 *  - /dashboard/comecar, /dashboard/meus-cursos, /dashboard/configuracoes,
 *    /dashboard/notificacoes, /dashboard/indicacoes, /dashboard/comunidade
 *
 * Admin sempre passa em ambos.
 */

const ROTAS_LIBERADAS_SEM_CURSO = [
  '/dashboard/comecar',
  '/dashboard/meus-cursos',
  '/dashboard/configuracoes',
  '/dashboard/notificacoes',
  '/dashboard/indicacoes',
  '/dashboard/comunidade',
]

// Só essas funcionam sem CPF/phone (pra aluno conseguir mudar dados e voltar)
const ROTAS_LIBERADAS_SEM_PROFILE = [
  '/dashboard/configuracoes',
]

export function EnrollmentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirecting'>('checking')

  const isEnrollmentLiberated = ROTAS_LIBERADAS_SEM_CURSO.some((r) => pathname.startsWith(r))
  const isProfileLiberated = ROTAS_LIBERADAS_SEM_PROFILE.some((r) => pathname.startsWith(r))
  const isAdmin = user?.role === 'ADMIN'
  const isAdminArea = pathname.startsWith('/admin')

  useEffect(() => {
    if (!user) { setStatus('ok'); return }
    if (isAdmin || isAdminArea) { setStatus('ok'); return }

    let alive = true
    api.get('/auth/me')
      .then(({ data }) => {
        if (!alive) return
        const hasCpf = !!data.hasCpf
        const hasPhone = !!data.hasPhone

        // PROFILE GATE: bloqueia se faltar CPF ou phone
        if (!hasCpf || !hasPhone) {
          if (isProfileLiberated) {
            setStatus('ok')
            return
          }
          setStatus('redirecting')
          router.replace('/completar-cadastro')
          return
        }

        // ENROLLMENT GATE: rotas liberadas sem curso passam
        if (isEnrollmentLiberated) {
          setStatus('ok')
          return
        }

        // Checa enrollment/plano
        api.get('/me/enrollments')
          .then(({ data: enrollData }) => {
            if (!alive) return
            const ativos = (enrollData.enrollments ?? []).filter((e: any) => e.isActive)
            const hasPlan = enrollData.plan?.hasPlan ?? false
            if (ativos.length > 0 || hasPlan) {
              setStatus('ok')
            } else {
              setStatus('redirecting')
              router.replace('/dashboard/comecar')
            }
          })
          .catch(() => {
            if (alive) setStatus('ok')
          })
      })
      .catch(() => {
        if (alive) setStatus('ok')
      })

    return () => { alive = false }
  }, [pathname, user?.id, isAdmin, isAdminArea, isEnrollmentLiberated, isProfileLiberated, router])

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <p className="text-xs text-muted-foreground">
          {status === 'redirecting' ? 'Redirecionando…' : 'Verificando seu acesso…'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
