'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Thread = {
  id: string
  subject: string | null
  unreadByAdmin: number
  lastMessageAt: string | null
  user: { id: string; name: string; email: string | null; avatar: string | null } | null
  messages: Array<{ id: string; body: string; authorRole: string; createdAt: string }>
}

type Message = { id: string; body: string; authorRole: string; createdAt: string }

const FILTERS = [
  { id: 'unread', label: 'Não lidas' },
  { id: 'all', label: 'Todas' },
  { id: 'closed', label: 'Fechadas' },
]

export default function AdminChatPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [active, setActive] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unread')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function loadThreads() {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/chat?filter=${filter}`)
      setThreads(data.threads)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadThreads() }, [filter])

  async function openThread(t: Thread) {
    setActive(t)
    const { data } = await api.get(`/chat/threads/${t.id}/messages`)
    setMessages(data.messages)
    loadThreads()
  }

  async function send() {
    if (!active || !text.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/chat/threads/${active.id}/messages`, { body: text })
      setMessages([...messages, data.message])
      setText('')
    } catch {
      toast.error('Erro')
    } finally { setSending(false) }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-brand-500" /> Caixa de mensagens
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Responda os alunos. Telegram avisa a cada nova mensagem.</p>
      </div>

      <div className="flex gap-1 mb-3">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border',
              filter === f.id ? 'bg-brand-500 text-white border-brand-500' : 'border-border bg-card hover:bg-muted')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-3">
        <div className="card p-2 space-y-1 max-h-[600px] overflow-y-auto">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto my-4" /> :
            threads.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma conversa.</p>
            ) : threads.map((t) => (
              <button key={t.id} onClick={() => openThread(t)}
                className={cn('w-full text-left p-2 rounded-lg hover:bg-muted transition',
                  active?.id === t.id && 'bg-muted',
                  t.unreadByAdmin > 0 && 'border-l-2 border-red-500')}>
                <div className="flex justify-between items-start gap-2 mb-0.5">
                  <span className="font-bold text-xs truncate">{t.user?.name ?? '?'}</span>
                  {t.unreadByAdmin > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{t.unreadByAdmin}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{t.subject ?? '(sem assunto)'}</div>
                {t.messages[0] && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.messages[0].body}</p>
                )}
              </button>
            ))}
        </div>

        <div className="card p-3 flex flex-col" style={{ height: 600 }}>
          {!active ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="border-b border-border pb-2 mb-2">
                <div className="font-bold text-sm">{active.user?.name}</div>
                <div className="text-[10px] text-muted-foreground">{active.user?.email}</div>
                {active.subject && <div className="text-xs text-muted-foreground mt-1">📌 {active.subject}</div>}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn('p-2 rounded-lg max-w-[80%] text-sm',
                    m.authorRole === 'ADMIN' ? 'bg-brand-500 text-white ml-auto' : 'bg-muted')}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <div className={cn('text-[9px] mt-1', m.authorRole === 'ADMIN' ? 'text-brand-100' : 'text-muted-foreground')}>
                      {new Date(m.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Sua resposta..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <button onClick={send} disabled={sending || !text.trim()}
                  className="rounded-lg bg-brand-500 text-white px-3 py-2 disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
