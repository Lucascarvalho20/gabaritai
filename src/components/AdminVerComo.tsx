'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Barra do admin no painel do aluno: "você está vendo como admin (tudo
 * liberado) — ver como um aluno de 1 curso, 2 cursos, todos, gratuita".
 * Um clique entra na conta de teste (api/admin/impersonate); a faixa amarela
 * traz de volta para cá. Não aparece para aluno nem dentro de uma conta de teste.
 */

type Conta = { id: string; name: string; situacao: string; padrao: number | null }

export function AdminVerComo() {
  const setUser = useAuthStore((s) => s.setUser)
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [faltando, setFaltando] = useState(0)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    if (document.cookie.includes('gabaritai_impersonating=')) return // já está vendo como alguém
    let vivo = true
    api.get('/auth/me')
      .then(({ data }) => {
        if (!vivo || data?.role !== 'ADMIN') return
        return api.get('/admin/contas-teste').then(({ data: d }) => {
          if (!vivo) return
          setContas(d.contas ?? [])
          setFaltando(d.padraoFaltando ?? 0)
        })
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  if (!contas) return null
  // As 4 padrão, em ordem, quando existem; as outras ficam no painel "Contas de teste".
  const padrao = contas.filter((c) => c.padrao !== null).sort((a, b) => a.padrao! - b.padrao!)
  const visiveis = padrao.length ? padrao : contas

  async function entrar(c: Conta) {
    setOcupado(c.id)
    try {
      const { data } = await api.post(`/admin/impersonate/${c.id}`)
      localStorage.setItem('gabaritai_token', data.token)
      try { sessionStorage.setItem('gabaritai:voltar-admin', window.location.pathname) } catch { /* sem armazenamento */ }
      setUser(data.user)
      window.location.href = window.location.pathname // recarrega a mesma tela, já como a conta de teste
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível entrar')
      setOcupado(null)
    }
  }

  async function criarPadrao() {
    setOcupado('padrao')
    try {
      await api.post('/admin/contas-teste/padrao')
      const { data } = await api.get('/admin/contas-teste')
      setContas(data.contas ?? [])
      setFaltando(data.padraoFaltando ?? 0)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível criar')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-brand-500/30 bg-brand-50/60 dark:bg-brand-900/15 px-4 py-3 text-sm flex flex-wrap items-center gap-2">
      <Eye className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
      <span className="font-semibold">Você está como admin (tudo liberado).</span>
      <span className="text-muted-foreground">Ver como:</span>
      {visiveis.map((c) => (
        <button key={c.id} type="button" onClick={() => entrar(c)} disabled={!!ocupado} title={c.situacao}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          {ocupado === c.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : c.name.replace(/^Aluno teste — /, '')}
        </button>
      ))}
      {faltando > 0 && (
        <button type="button" onClick={criarPadrao} disabled={!!ocupado}
          className="rounded-lg bg-brand-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1">
          {ocupado === 'padrao' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {contas.length ? 'Criar as contas padrão que faltam' : 'Criar contas de teste (1 curso, 2 cursos, todos, gratuita)'}
        </button>
      )}
      <Link href="/admin/contas-teste" className="ml-auto text-xs text-brand-600 dark:text-brand-400 hover:underline">Gerenciar contas de teste</Link>
    </div>
  )
}
