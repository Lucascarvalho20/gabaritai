'use client'

import { useEffect, useState } from 'react'
import { LogOut, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

/**
 * Banner que aparece quando admin está logado como outro user (impersonação).
 * Lê o cookie `gabaritai_impersonating` (não httpOnly) pra detectar.
 */
export function ImpersonationBanner() {
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [impersonator, setImpersonator] = useState<string | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('gabaritai_impersonating='))
    if (cookie) setImpersonator(decodeURIComponent(cookie.split('=')[1]))
  }, [])

  async function stop() {
    try {
      const { data } = await api.post('/admin/impersonate/stop')
      localStorage.setItem('gabaritai_token', data.token)
      setUser(data.user)
      toast.success('Voltou pro admin')
      let volta = '/admin/usuarios'
      try { volta = sessionStorage.getItem('gabaritai:voltar-admin') || volta } catch { /* sem armazenamento */ }
      // Recarrega tudo, para cada tela buscar os dados de novo já como admin.
      window.location.href = volta.startsWith('/admin') || volta.startsWith('/dashboard') ? volta : '/admin/usuarios'
    } catch {
      toast.error('Erro ao sair da impersonação')
    }
  }

  if (!impersonator) return null

  return (
    <div className="bg-amber-500 text-amber-950 text-sm font-semibold px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span>
          Você está vendo o site como <strong>{user?.name ?? 'outro usuário'}</strong>
          <span className="font-normal"> · entrou pelo admin <code className="font-mono text-xs">{impersonator}</code></span>
        </span>
      </div>
      <button
        onClick={stop}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950 text-amber-50 text-xs font-bold hover:bg-amber-900"
      >
        <LogOut className="w-3 h-3" />
        Voltar
      </button>
    </div>
  )
}
