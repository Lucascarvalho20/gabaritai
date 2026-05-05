'use client'
import { Settings, User, Bell, Shield, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function ConfiguracoesPage() {
  const user = useAuthStore(s => s.user)
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-black text-foreground">Configurações</h1>
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2"><User className="w-4 h-4" /> Perfil</h2>
        <div className="grid gap-3">
          <div><label className="label">Nome</label><input className="input" defaultValue={user?.name} /></div>
          <div><label className="label">E-mail</label><input className="input" defaultValue={user?.email} disabled /></div>
        </div>
        <button className="btn-primary btn-md">Salvar alterações</button>
      </div>
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" /> Notificações</h2>
        {['Lembrete diário de estudo', 'Flashcards pendentes', 'Novos simulados disponíveis'].map(l => (
          <label key={l} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-muted-foreground">{l}</span>
            <div className="w-10 h-5 bg-brand-500 rounded-full" />
          </label>
        ))}
      </div>
      <div className="card p-5 border-danger-200 dark:border-danger-800/40">
        <h2 className="font-bold text-danger-600 flex items-center gap-2 mb-3"><RotateCcw className="w-4 h-4" /> Zona de perigo</h2>
        <p className="text-sm text-muted-foreground mb-3">Apagar toda a memória da IA e reiniciar seu progresso do zero. Esta ação não pode ser desfeita.</p>
        <button className="btn-danger btn-md">Resetar progresso e memória da IA</button>
      </div>
    </div>
  )
}
