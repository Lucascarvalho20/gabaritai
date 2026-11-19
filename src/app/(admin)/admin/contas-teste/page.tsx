'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Loader2, LogIn, Pause, Play, Plus, Trash2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

/**
 * Contas de teste: ver o site como cada tipo de aluno — um curso, dois, todos,
 * conta gratuita — entrando na conta pelo "entrar como" (1 hora; a faixa no
 * topo do painel do aluno traz de volta). Só mexe em contas @exemplo.invalid.
 */

type Conta = {
  id: string
  name: string
  email: string
  hasFullAccess: boolean
  situacao: string
  enrollments: Array<{ courseId: string; isActive: boolean; isPrimary: boolean; source: string | null; course: { name: string; slug: string } }>
}
type Curso = { id: string; name: string; slug: string }

export default function ContasTestePage() {
  const setAuthUser = useAuthStore((s) => s.setUser)
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [padraoFaltando, setPadraoFaltando] = useState(0)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [apagar, setApagar] = useState<string | null>(null) // conta esperando a confirmação

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/contas-teste')
      setContas(data.contas)
      setCursos(data.cursos)
      setPadraoFaltando(data.padraoFaltando ?? 0)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao carregar as contas de teste')
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function mudar(conta: Conta, corpo: Record<string, unknown>, chave: string) {
    setOcupado(chave)
    try {
      await api.patch(`/admin/contas-teste/${conta.id}`, corpo)
      await carregar()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível mudar')
    } finally {
      setOcupado(null)
    }
  }

  async function entrarComo(conta: Conta) {
    setOcupado(`entrar:${conta.id}`)
    try {
      const { data } = await api.post(`/admin/impersonate/${conta.id}`)
      localStorage.setItem('gabaritai_token', data.token)
      try { sessionStorage.setItem('gabaritai:voltar-admin', '/admin/contas-teste') } catch { /* sem armazenamento */ }
      setAuthUser(data.user)
      // Recarrega tudo: cada tela busca os dados de novo, já como a conta de teste.
      window.location.href = '/dashboard'
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível entrar')
      setOcupado(null)
    }
  }

  async function apagarConta(conta: Conta) {
    setOcupado(`apagar:${conta.id}`)
    try {
      await api.delete(`/admin/contas-teste/${conta.id}`)
      setApagar(null)
      await carregar()
      toast.success('Conta de teste apagada')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível apagar')
    } finally {
      setOcupado(null)
    }
  }

  async function criarPadrao() {
    setOcupado('padrao')
    try {
      const { data } = await api.post('/admin/contas-teste/padrao')
      await carregar()
      toast.success(`${data.criadas.length} ${data.criadas.length === 1 ? 'conta criada' : 'contas criadas'}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível criar')
    } finally {
      setOcupado(null)
    }
  }

  async function criar(ev: React.FormEvent) {
    ev.preventDefault()
    setOcupado('criar')
    try {
      await api.post('/admin/contas-teste', { nome })
      setNome('')
      await carregar()
      toast.success('Conta de teste criada')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Não foi possível criar')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><UserCheck className="w-6 h-6 text-brand-500" /> Contas de teste</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Alunos de mentira para ver o site como cada tipo de aluno. <strong>Entrar como</strong> abre o painel do aluno como
          aquela conta por 1 hora; a faixa no topo tem o botão de voltar ao admin. Liberar, pausar ou tirar um curso muda
          o que a conta vê na hora — só nestas contas (e-mail <code>@exemplo.invalid</code>), nunca num aluno real.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3 text-sm">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 min-w-[12rem]">Quer o painel do aluno com a sua própria conta de admin (acesso a tudo)?</span>
        <Link href="/dashboard" className="btn-ghost btn-sm">Ver como aluno (admin)</Link>
      </div>

      {padraoFaltando > 0 && (
        <div className="card p-5 flex flex-wrap items-center gap-3 border-brand-500/40">
          <div className="flex-1 min-w-[14rem]">
            <p className="font-semibold">Criar as contas padrão</p>
            <p className="text-sm text-muted-foreground">
              Um aluno de 1 curso (PF Agente), um de 2 cursos parecidos (PF Agente e PF Escrivão), um com todos os
              cursos e uma conta gratuita — prontos para "Entrar como".
            </p>
          </div>
          <button type="button" onClick={criarPadrao} disabled={!!ocupado} className="btn-primary btn-md">
            {ocupado === 'padrao' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar {padraoFaltando === 4 ? 'as 4 contas' : `as ${padraoFaltando} que faltam`}
          </button>
        </div>
      )}

      {!contas ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contas.map((c) => {
            const semEsses = cursos.filter((k) => !c.enrollments.some((e) => e.courseId === k.id))
            return (
              <div key={c.id} className="card p-5 space-y-3 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    <p className="text-xs font-semibold mt-1 text-brand-600 dark:text-brand-400">{c.situacao}</p>
                  </div>
                  <button type="button" onClick={() => entrarComo(c)} disabled={!!ocupado} className="btn-primary btn-sm shrink-0">
                    {ocupado === `entrar:${c.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />} Entrar como
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-brand-500" checked={c.hasFullAccess} disabled={!!ocupado}
                    onChange={(ev) => mudar(c, { acao: 'todos', ligado: ev.target.checked }, `todos:${c.id}`)} />
                  Acesso a todos os cursos
                </label>

                {!c.hasFullAccess && (
                  <>
                    <ul className="space-y-1.5">
                      {c.enrollments.length === 0 && <li className="text-xs text-muted-foreground">Nenhum curso.</li>}
                      {c.enrollments.map((e) => {
                        const cortesia = e.source === 'CORTESIA'
                        return (
                          <li key={e.courseId} className="flex flex-wrap items-center gap-2 text-sm rounded-lg border border-border px-2.5 py-1.5">
                            <span className={cn('min-w-0 flex-1 truncate', !e.isActive && 'line-through text-muted-foreground')}>{e.course.name}</span>
                            <span className={cn('text-[11px] font-semibold', !e.isActive ? 'text-warning-600' : cortesia ? 'text-success-600' : 'text-muted-foreground')}>
                              {!e.isActive ? 'pausado' : cortesia ? 'liberado' : 'só matrícula (sem acesso)'}
                            </span>
                            {cortesia && (
                              <button type="button" disabled={!!ocupado} title={e.isActive ? 'Pausar (stand-by)' : 'Reativar'}
                                onClick={() => mudar(c, { acao: e.isActive ? 'pausar' : 'reativar', courseId: e.courseId }, `c:${c.id}:${e.courseId}`)}
                                className="btn-ghost btn-sm px-2">
                                {e.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {!cortesia && (
                              <button type="button" disabled={!!ocupado} onClick={() => mudar(c, { acao: 'liberar', courseId: e.courseId }, `c:${c.id}:${e.courseId}`)}
                                className="btn-ghost btn-sm text-xs">Liberar</button>
                            )}
                            <button type="button" disabled={!!ocupado} title="Tirar o curso"
                              onClick={() => mudar(c, { acao: 'tirar', courseId: e.courseId }, `c:${c.id}:${e.courseId}`)}
                              className="btn-ghost btn-sm px-2 text-danger-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </li>
                        )
                      })}
                    </ul>
                    {semEsses.length > 0 && (
                      <select className="input text-sm" value="" disabled={!!ocupado}
                        onChange={(ev) => ev.target.value && mudar(c, { acao: 'liberar', courseId: ev.target.value }, `liberar:${c.id}`)}>
                        <option value="">+ Liberar um curso para esta conta…</option>
                        {semEsses.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                    )}
                  </>
                )}

                <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2 text-xs">
                  {apagar === c.id ? (
                    <>
                      <span className="flex-1 min-w-[10rem]">Apagar esta conta, com as tentativas, anotações e matrículas dela?</span>
                      <button type="button" onClick={() => setApagar(null)} disabled={!!ocupado} className="btn-ghost btn-sm">Cancelar</button>
                      <button type="button" onClick={() => apagarConta(c)} disabled={!!ocupado} className="btn-sm rounded-lg bg-danger-600 hover:bg-danger-700 text-white px-3">
                        {ocupado === `apagar:${c.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, apagar'}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setApagar(c.id)} disabled={!!ocupado} className="text-muted-foreground hover:text-danger-600 inline-flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Apagar conta
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={criar} className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[14rem]">
          <label htmlFor="nova-conta" className="label">Nova conta de teste</label>
          <input id="nova-conta" className="input" placeholder="Ex.: Aluno teste — 3 cursos" value={nome} maxLength={60}
            onChange={(ev) => setNome(ev.target.value)} />
        </div>
        <button type="submit" disabled={!!ocupado || nome.trim().length < 3} className="btn-primary btn-md">
          {ocupado === 'criar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
        </button>
      </form>
    </div>
  )
}
