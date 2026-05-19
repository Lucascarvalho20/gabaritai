'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Shield, Sparkles, Power, X, Loader2, Copy, Check, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type User = {
  id: string
  name: string
  email: string | null
  username: string | null
  emailVerified: boolean
  role: 'ADMIN' | 'STUDENT'
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'LIFETIME'
  active: boolean
  hasFullAccess: boolean
  isBetaTester: boolean
  accessNote: string | null
  lastLoginAt: string | null
  createdAt: string
  profile?: { concursoLabel?: string | null; lastStudyAt?: string | null; streakDays?: number; totalStudyMin?: number } | null
  _count: { enrollments: number }
}

const PLAN_BADGE: Record<string, string> = {
  FREE: 'badge-yellow',
  BASIC: 'badge-blue',
  PREMIUM: 'badge-purple',
  LIFETIME: 'badge-green',
}

export default function AdminUsersPage() {
  const router = useRouter()
  const setAuthUser = useAuthStore((s) => s.setUser)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)

  async function impersonate(u: User) {
    if (!confirm(`Logar como ${u.name}? Você terá 1h pra navegar como ele.`)) return
    try {
      const { data } = await api.post(`/admin/impersonate/${u.id}`)
      localStorage.setItem('gabaritai_token', data.token)
      setAuthUser(data.user)
      toast.success(`Agora você é ${u.name}`)
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ users: User[] }>('/admin/users', { params: { q, plan, pageSize: 100 } })
      setUsers(data.users)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [q, plan])

  useEffect(() => { load() }, [load])

  async function toggleFullAccess(u: User) {
    try {
      await api.patch(`/admin/users/${u.id}`, { hasFullAccess: !u.hasFullAccess })
      toast.success(!u.hasFullAccess ? 'Acesso total liberado' : 'Acesso total revogado')
      load()
    } catch (e: any) { toast.error('Erro') }
  }

  async function toggleActive(u: User) {
    try {
      await api.patch(`/admin/users/${u.id}`, { active: !u.active })
      toast.success(!u.active ? 'Conta reativada' : 'Conta desativada')
      load()
    } catch (e: any) { toast.error('Erro') }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestão de contas, planos e acesso liberado.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white px-3.5 py-2 text-sm font-semibold hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" /> Criar perfil tester
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-3 flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, e-mail ou username…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="ALL">Todos os planos</option>
          <option value="FREE">Free</option>
          <option value="BASIC">Básico</option>
          <option value="PREMIUM">Premium</option>
          <option value="LIFETIME">Vitalício</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum usuário encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Cursos</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xs font-bold text-brand-600">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            {u.name}
                            {u.role === 'ADMIN' && <Shield className="w-3 h-3 text-amber-500" />}
                            {u.hasFullAccess && (
                              <span title="Acesso total"><Sparkles className="w-3 h-3 text-purple-500" /></span>
                            )}
                            {u.isBetaTester && <span className="badge-yellow text-[10px] px-1.5">BETA</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.username && <span className="font-mono">@{u.username}</span>}
                            {u.username && u.email && <span className="mx-1">·</span>}
                            {u.email && <span>{u.email}</span>}
                            {!u.username && !u.email && <span className="italic">sem identificador</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(PLAN_BADGE[u.plan], 'text-xs')}>{u.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u._count.enrollments}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.profile?.streakDays ?? 0} dias
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', u.active ? 'badge-green' : 'badge-red')}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => toggleFullAccess(u)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition',
                            u.hasFullAccess
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70',
                          )}
                          title={u.hasFullAccess ? 'Revogar acesso total' : 'Liberar acesso total'}
                        >
                          <Sparkles className="w-3 h-3" /> {u.hasFullAccess ? 'Tudo' : 'Liberar'}
                        </button>
                        <button
                          onClick={() => impersonate(u)}
                          disabled={u.role === 'ADMIN'}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={u.role === 'ADMIN' ? 'Não permitido' : 'Logar como este usuário'}
                        >
                          <UserCheck className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-muted/70"
                          title={u.active ? 'Desativar' : 'Reativar'}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => { setShowCreate(false); load() }} />}
    </div>
  )
}

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function suggestUsername(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [useEmail, setUseEmail] = useState(false)
  const [password, setPassword] = useState(() => generatePassword())
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [isBetaTester, setIsBetaTester] = useState(true)
  const [accessNote, setAccessNote] = useState('Amigo do dev — tester')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ identifier: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-sugere username quando digita o nome
  function onNameChange(v: string) {
    setName(v)
    if (!username) setUsername(suggestUsername(v))
  }

  async function submit() {
    if (!name.trim()) return toast.error('Informe o nome')
    if (!password) return toast.error('Informe a senha')
    if (useEmail && !email.trim()) return toast.error('Informe o email ou desmarque a opção')
    if (!useEmail && !username.trim()) return toast.error('Informe o username')
    setCreating(true)
    try {
      await api.post('/admin/users', {
        name,
        ...(useEmail ? { email } : {}),
        username: username.trim() || undefined,
        password,
        hasFullAccess, isBetaTester, accessNote,
        plan: hasFullAccess ? 'LIFETIME' : 'FREE',
      })
      setCreated({ identifier: useEmail ? email : username, password })
      toast.success('Perfil tester criado!')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar')
    } finally {
      setCreating(false)
    }
  }

  async function copyCredentials() {
    if (!created) return
    const text = `Login: ${created.identifier}\nSenha: ${created.password}\nAcesse: https://gabaritai.com.br/login`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Criar perfil tester</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {created ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
              <p className="font-semibold text-success-700 dark:text-success-300 text-sm mb-2">✓ Perfil criado com sucesso</p>
              <pre className="text-xs text-foreground bg-background p-3 rounded-lg whitespace-pre-wrap font-mono">
{`Login: ${created.identifier}
Senha: ${created.password}`}
              </pre>
              <button
                onClick={copyCredentials}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-success-500 text-white text-xs font-semibold hover:bg-success-600"
              >
                {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar credenciais</>}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold hover:bg-brand-600"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-foreground">Nome</label>
              <input
                value={name} onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ex: João Silva"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300">
              💡 Perfil criado pelo admin <strong>NÃO precisa de e-mail real</strong>. Use username (mais simples e privado).
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Username (login)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="joao-silva"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">letras, números, _ . - · mínimo 3 caracteres</p>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={useEmail} onChange={(e) => setUseEmail(e.target.checked)} />
              <span>Também adicionar e-mail (opcional)</span>
            </label>
            {useEmail && (
              <div>
                <input
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  type="email" placeholder="amigo@exemplo.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-foreground">Senha</label>
              <div className="mt-1 flex gap-1.5">
                <input
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="px-3 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted"
                  title="Gerar nova senha"
                >
                  ↻
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={hasFullAccess} onChange={(e) => setHasFullAccess(e.target.checked)} />
                <span className="font-medium">Acesso total (vê todos os cursos sem pagar)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isBetaTester} onChange={(e) => setIsBetaTester(e.target.checked)} />
                <span className="font-medium">Marcar como beta tester</span>
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Anotação (opcional)</label>
              <input
                value={accessNote} onChange={(e) => setAccessNote(e.target.value)}
                placeholder="Ex: amigo, parceiro, professor"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={submit}
              disabled={creating}
              className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
            >
              {creating ? 'Criando…' : 'Criar perfil tester'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
