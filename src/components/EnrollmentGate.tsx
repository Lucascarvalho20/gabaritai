'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Gate de cadastro: força aluno a ter pelo menos 1 enrollment ativo
 * (ou plano via trial/pagamento) antes de acessar features de estudo.
 *
 * Decisão de produto (2026-05-31): aluno não pode entrar no app sem ter
 * escolhido curso/plano. Cria fricção controlada — pessoa que cadastra
 * é encaminhada direto pro funil de ativação.
 *
 * Rotas LIBERADAS (mesmo sem curso):
 *  - /dashboard/comecar (o wizard de escolha de curso/plano)
 *  - /dashboard/meus-cursos (lista cursos disponíveis pra ativar)
 *  - /dashboard/configuracoes (perfil/conta)
 *  - /dashboard/notificacoes (avisos do sistema)
 *  - /dashboard/indicacoes (referral)
 *  - /dashboard/comunidade (canais externos)
 *
 * Rotas BLOQUEADAS (precisam de curso):
 *  - / (dashboard home), /cronograma, /simulados, /provas, /questoes,
 *    /flashcards, /resumos, /diagnostico, /sessao/*, /mentor, /chat,
 *    /historico, /progresso, /ranking, /edital-verticalizado, /mapas-mentais
 *
 * Admin sempre passa.
 */

const ROTAS_LIBERADAS_SEM_CURSO = [
  '/dashboard/comecar',
  '/dashboard/meus-cursos',
  '/dashboard/configuracoes',
  '/dashboard/notificacoes',
  '/dashboard/indicacoes',
  '/dashboard/comunidade',
]

export function EnrollmentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirecting'>('checking')

  const isLiberated = ROTAS_LIBERADAS_SEM_CURSO.some((r) => pathname.startsWith(r))
  const isAdmin = user?.role === 'ADMIN'
  const isAdminArea = pathname.startsWith('/admin')

  useEffect(() => {
    // Admin sempre passa. Rotas liberadas também.
    if (!user) { setStatus('ok'); return }
    if (isAdmin || isAdminArea || isLiberated) { setStatus('ok'); return }

    let alive = true
    api.get('/me/enrollments')
      .then(({ data }) => {
        if (!alive) return
        const ativos = (data.enrollments ?? []).filter((e: any) => e.isActive)
        const hasPlan = data.plan?.hasPlan ?? false
        // Tem enrollment ativo OU plano (bypass: admin/beta/cortesia)
        if (ativos.length > 0 || hasPlan) {
          setStatus('ok')
        } else {
          setStatus('redirecting')
          router.replace('/dashboard/comecar')
        }
      })
      .catch(() => {
        // Erro de rede — não bloqueia, deixa passar (UX > segurança aqui)
        if (alive) setStatus('ok')
      })

    return () => { alive = false }
  }, [pathname, user?.id, isAdmin, isAdminArea, isLiberated, router])

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <p className="text-xs text-muted-foreground">
          {status === 'redirecting' ? 'Redirecionando…' : 'Verificando seu plano…'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
