'use client'

import { useState, useEffect } from 'react'
import { User, Bell, Shield, RotateCcw, Save, Eye, EyeOff, AlertTriangle, Mail, MessageCircle, Phone } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const logout = useAuthStore(s => s.logout)
  const router = useRouter()

  const [nome, setNome] = useState(user?.name ?? '')
  const [showPass, setShowPass] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [notifs, setNotifs] = useState({
    lembreteDiario: true,
    flashcardsPendentes: true,
    novosSimulados: true,
    relatorioSemanal: false,
    dicasIA: true,
  })

  // Canais de comunicação (in-app sempre on, email/whatsapp opt-in)
  const [channels, setChannels] = useState({
    notifyEmail: true,
    notifyWhatsapp: false,
    whatsappPhone: '',
  })
  const [savingChannels, setSavingChannels] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_notifs')
    if (saved) setNotifs(JSON.parse(saved))
    api.get('/me/preferences').then(({ data }) => {
      setChannels({
        notifyEmail: data.notifyEmail ?? true,
        notifyWhatsapp: data.notifyWhatsapp ?? false,
        whatsappPhone: data.whatsappPhone ?? '',
      })
    }).catch(() => {})
  }, [])

  async function salvarCanais() {
    setSavingChannels(true)
    try {
      await api.patch('/me/preferences', channels)
      toast.success('Preferências salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSavingChannels(false)
    }
  }

  function salvarPerfil() {
    if (!nome.trim()) { toast.error('Nome não pode ser vazio'); return }
    setUser({ ...user!, name: nome })
    toast.success('Perfil atualizado!')
  }

  function salvarSenha() {
    if (!senhaAtual) { toast.error('Digite a senha atual'); return }
    if (novaSenha.length < 6) { toast.error('Nova senha precisa ter ao menos 6 caracteres'); return }
    if (novaSenha !== confirmSenha) { toast.error('Senhas não conferem'); return }
    setSenhaAtual(''); setNovaSenha(''); setConfirmSenha('')
    toast.success('Senha alterada com sucesso!')
  }

  function toggleNotif(key: keyof typeof notifs) {
    const updated = { ...notifs, [key]: !notifs[key] }
    setNotifs(updated)
    localStorage.setItem('gabaritai_notifs', JSON.stringify(updated))
  }

  function resetarProgresso() {
    // Limpa TODOS os dados locais
    const keys = [
      'gabaritai_token', 'gabaritai_flashcards_custom', 'gabaritai_progresso',
      'gabaritai_notifs', 'gabaritai_cronograma_config', 'gabaritai-auth',
      'gabaritai_conteudo', 'gabaritai_simulados_feitos',
    ]
    keys.forEach(k => localStorage.removeItem(k))
    // Limpa TUDO do localStorage com prefixo gabaritai
    Object.keys(localStorage).filter(k => k.startsWith('gabaritai')).forEach(k => localStorage.removeItem(k))
    logout()
    toast.success('Progresso resetado! Redirecionando para login...')
    setTimeout(() => router.push('/login'), 1000)
  }

  const NOTIF_LABELS: Record<keyof typeof notifs, string> = {
    lembreteDiario: 'Lembrete diário de estudo',
    flashcardsPendentes: 'Flashcards pendentes para revisão',
    novosSimulados: 'Novos simulados disponíveis',
    relatorioSemanal: 'Relatório semanal de desempenho',
    dicasIA: 'Dicas personalizadas do Mentor IA',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie seu perfil e preferências</p>
      </div>

      {/* Perfil */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <User className="w-4 h-4" /> Perfil
        </h2>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-black text-xl">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="text-xs text-brand-600 dark:text-brand-400 mt-0.5 font-medium">{user?.plan} • {user?.concursoAlvo}</div>
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" defaultValue={user?.email} disabled />
            <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado nesta versão.</p>
          </div>
          {user?.concursoAlvo && (
            <div>
              <label className="label">Concurso alvo</label>
              <input className="input" defaultValue={user.concursoAlvo} disabled />
            </div>
          )}
        </div>
        <button onClick={salvarPerfil} className="btn-primary btn-md">
          <Save className="w-4 h-4" /> Salvar alterações
        </button>
      </div>

      {/* Senha */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4" /> Alterar Senha
        </h2>
        <div className="grid gap-3">
          <div>
            <label className="label">Senha atual</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className="input pr-11" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nova senha</label>
            <input type="password" className="input" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input type="password" className="input" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} placeholder="Repita a nova senha" />
          </div>
        </div>
        <button onClick={salvarSenha} className="btn-outline btn-md">
          <Shield className="w-4 h-4" /> Alterar senha
        </button>
      </div>

      {/* Canais de comunicação */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4" /> Como você prefere receber as comunicações
        </h2>
        <p className="text-xs text-muted-foreground">
          Notificações dentro do site sempre aparecem. Escolha os canais extras:
        </p>

        <label className="flex items-center justify-between cursor-pointer py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-semibold text-sm">E-mail</div>
              <div className="text-xs text-muted-foreground">Receba avisos no seu email cadastrado</div>
            </div>
          </div>
          <button
            onClick={() => setChannels({ ...channels, notifyEmail: !channels.notifyEmail })}
            className={`w-11 h-6 rounded-full transition-colors relative ${channels.notifyEmail ? 'bg-brand-500' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${channels.notifyEmail ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>

        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer py-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              <div>
                <div className="font-semibold text-sm">WhatsApp <span className="text-[10px] text-yellow-600">em breve</span></div>
                <div className="text-xs text-muted-foreground">Notificações pelo zap</div>
              </div>
            </div>
            <button
              onClick={() => setChannels({ ...channels, notifyWhatsapp: !channels.notifyWhatsapp })}
              className={`w-11 h-6 rounded-full transition-colors relative ${channels.notifyWhatsapp ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${channels.notifyWhatsapp ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
          {channels.notifyWhatsapp && (
            <input
              value={channels.whatsappPhone}
              onChange={(e) => setChannels({ ...channels, whatsappPhone: e.target.value })}
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          )}
        </div>

        <button onClick={salvarCanais} disabled={savingChannels} className="btn-primary btn-md mt-2">
          <Save className="w-4 h-4" /> {savingChannels ? 'Salvando...' : 'Salvar canais'}
        </button>
      </div>

      {/* Notificações */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4" /> Tipos de notificação
        </h2>
        <p className="text-xs text-muted-foreground">Escolha quais tipos quer receber.</p>
        {(Object.keys(notifs) as (keyof typeof notifs)[]).map(key => (
          <label key={key} className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm text-foreground">{NOTIF_LABELS[key]}</span>
            <button
              onClick={() => toggleNotif(key)}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifs[key] ? 'bg-brand-500' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        ))}
      </div>

      {/* Zona de perigo */}
      <div className="card p-5 border-danger-200 dark:border-danger-800/40">
        <h2 className="font-bold text-danger-600 flex items-center gap-2 mb-3 text-sm">
          <AlertTriangle className="w-4 h-4" /> Zona de perigo
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Apaga todo o progresso local (flashcards criados, configurações) e faz logout. Esta ação não pode ser desfeita.
        </p>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="btn-danger btn-md">
            <RotateCcw className="w-4 h-4" /> Resetar progresso e memória da IA
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/40 p-3">
              <p className="text-sm font-semibold text-danger-600">Tem certeza? Esta ação é irreversível.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="btn-outline btn-md flex-1">Cancelar</button>
              <button onClick={resetarProgresso} className="btn-danger btn-md flex-1">
                Confirmar reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
