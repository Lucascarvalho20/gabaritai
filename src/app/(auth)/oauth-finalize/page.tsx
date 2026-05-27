'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Página intermediária pós-OAuth.
 *
 * O backend (callback do Google) redireciona pra cá com ?token=...&next=...
 * Persistimos o token em localStorage (que é o que o resto do app usa) e
 * mandamos o usuário pro próximo destino (/dashboard ou /completar-cadastro).
 */
export default function OAuthFinalizePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OAuthFinalizeInner />
    </Suspense>
  )
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      <p className="text-sm text-muted-foreground">Finalizando login...</p>
    </div>
  )
}

function OAuthFinalizeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const token = searchParams.get('token')
    const next = searchParams.get('next') ?? '/dashboard'
    if (!token) {
      router.replace('/login?error=oauth_missing_token')
      return
    }

    localStorage.setItem('gabaritai_token', token)

    api.get('/auth/me')
      .then(({ data }) => {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          plan: data.plan,
          avatar: data.avatar,
        } as any)
        router.replace(next)
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed')
      })
  }, [router, searchParams, setUser])

  return <Spinner />
}
