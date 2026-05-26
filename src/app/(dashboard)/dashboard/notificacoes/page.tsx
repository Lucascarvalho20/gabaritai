'use client'

import { useEffect, useState } from 'react'
import {
  Bell, Mail, MessageCircle, Send, Loader2, CheckCircle2, AlertTriangle, ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Prefs = {
  notifyEmail: boolean
  notifyTelegram: boolean
  notifyWhatsapp: boolean
  whatsappPhone: string | null
  telegramChatId: string | null
  email: string | null
}

export default function NotificacoesPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    api.get('/me/notifications/preferences')
      .then(({ data }) => {
        setPrefs(data.preferences)
        setWhatsapp(data.preferences?.whatsappPhone ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function toggle(field: 'notifyEmail' | 'notifyTelegram' | 'notifyWhatsapp') {
    if (!prefs) return
    const novo = !prefs[field]
    setSaving(true)
    try {
      const { data } = await api.patch('/me/notifications/preferences', { [field]: novo })
      setPrefs((p) => p ? { ...p, ...data.preferences } : data.preferences)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function saveWhatsapp() {
    setSaving(true)
    try {
      const { data } = await api.patch('/me/notifications/preferences', { whatsappPhone: whatsapp })
      setPrefs((p) => p ? { ...p, ...data.preferences } : data.preferences)
      toast.success('WhatsApp salvo')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !prefs) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-black inline-flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-500" /> Notificações
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Como você quer ser lembrado? Escolha os canais por onde a gente te avisa pra estudar, revisar
          flashcards atrasados e fazer simulado.
        </p>
      </div>

      {/* Canais */}
      <div className="space-y-3">
        <ChannelToggle
          icon={Mail}
          name="Email"
          desc={prefs.email ? `Lembrete diário no email ${prefs.email}` : 'Lembrete diário no seu email cadastrado'}
          active={prefs.notifyEmail}
          onToggle={() => toggle('notifyEmail')}
          saving={saving}
        />
        <ChannelToggle
          icon={MessageCircle}
          name="WhatsApp"
          desc="Lembretes diretos no WhatsApp (em breve)"
          active={prefs.notifyWhatsapp}
          onToggle={() => toggle('notifyWhatsapp')}
          saving={saving}
          extra={
            prefs.notifyWhatsapp && (
              <div className="mt-3 flex gap-2">
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(61) 99999-9999"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
                <button
                  onClick={saveWhatsapp}
                  disabled={saving}
                  className="rounded-lg bg-brand-500 text-white px-3 py-2 text-xs font-bold hover:bg-brand-600 disabled:opacity-50 shrink-0"
                >
                  Salvar
                </button>
              </div>
            )
          }
        />
        <ChannelToggle
          icon={Send}
          name="Telegram"
          desc="Bot no Telegram (em breve)"
          active={prefs.notifyTelegram}
          onToggle={() => toggle('notifyTelegram')}
          saving={saving}
        />
      </div>

      {/* O que a gente envia */}
      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> O que enviamos
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-brand-500 font-bold">•</span>
            <span><strong className="text-foreground">Lembrete diário</strong> de estudo com o plano do dia (1× por dia, no horário que você combinar)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">•</span>
            <span><strong className="text-foreground">Revisão SRS atrasada</strong> quando tem flashcard pra revisar há mais de 24h</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold">•</span>
            <span><strong className="text-foreground">Lembrete de simulado</strong> sábado à noite e domingo cedo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">•</span>
            <span><strong className="text-foreground">Edital novo do seu cargo</strong> quando sai atualização e seu cronograma é rebalanceado</span>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
        <span>
          Sem spam. Você nunca recebe mais de 2 mensagens por dia, e pode pausar/cancelar a qualquer momento
          aqui mesmo.
        </span>
      </div>
    </div>
  )
}

function ChannelToggle({
  icon: Icon, name, desc, active, onToggle, saving, extra,
}: {
  icon: any; name: string; desc: string; active: boolean
  onToggle: () => void; saving: boolean; extra?: React.ReactNode
}) {
  return (
    <div className={cn(
      'card p-4 transition-colors',
      active && 'border-brand-500/40 bg-brand-50/30 dark:bg-brand-900/10',
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          active ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400' : 'bg-muted text-muted-foreground',
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <button
          onClick={onToggle}
          disabled={saving}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
            active ? 'bg-brand-500' : 'bg-muted',
          )}
          aria-pressed={active}
        >
          <span className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
            active ? 'translate-x-6' : 'translate-x-1',
          )} />
        </button>
      </div>
      {extra}
    </div>
  )
}
