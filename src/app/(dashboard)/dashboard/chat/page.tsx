'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2, Plus, Send, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Thread = {
  id: string
  subject: string | null
  isClosed: boolean
  unreadByUser: number
  lastMessageAt: string | null
  messages: Array<{ id: string; body: string; authorRole: string; createdAt: string }>
}

type Message = { id: string; body: string; authorRole: string; createdAt: string }

export default function ChatAlunoPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [active, setActive] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function loadThreads() {
    setLoading(true)
    try {
      const { data } = await api.get('/chat/threads')
      setThreads(data.threads)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadThreads() }, [])

  async function openThread(t: Thread) {
    setActive(t)
    const { data } = await api.get(`/chat/threads/${t.id}/messages`)
    setMessages(data.messages)
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

  async function createNew() {
    if (!newBody.trim()) return toast.error('Escreva uma mensagem')
    try {
      const { data } = await api.post('/chat/threads', { subject: newSubject || null, body: newBody })
      toast.success('Mensagem enviada!')
      setNewOpen(false)
      setNewSubject(''); setNewBody('')
      loadThreads()
      openThread(data.thread)
    } catch {
      toast.error('Erro')
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-brand-500" /> Mensagens
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Fale direto com o suporte. Resposta normalmente em 24h.</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="rounded-xl bg-brand-500 text-white px-3 py-2 text-xs font-bold inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Nova conversa
        </button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-3">
        {/* Lista */}
        <div className="card p-2 space-y-1 max-h-[600px] overflow-y-auto">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto my-4" /> :
            threads.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma conversa ainda.</p>
            ) : threads.map((t) => (
              <button key={t.id} onClick={() => openThread(t)}
                className={cn(
                  'w-full text-left p-2 rounded-lg hover:bg-muted transition',
                  active?.id === t.id && 'bg-muted',
                )}>
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-xs truncate">{t.subject ?? 'Sem assunto'}</span>
                  {t.unreadByUser > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{t.unreadByUser}</span>}
                </div>
                {t.messages[0] && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.messages[0].body}</p>
                )}
                <div className="text-[9px] text-muted-foreground mt-1">
                  {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString('pt-BR') : '—'}
                </div>
              </button>
            ))}
        </div>

        {/* Conversa */}
        <div className="card p-3 flex flex-col" style={{ height: 600 }}>
          {!active ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
              Selecione uma conversa ou inicie uma nova
            </div>
          ) : (
            <>
              <div className="border-b border-border pb-2 mb-2">
                <h2 className="font-bold text-sm">{active.subject ?? 'Conversa'}</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn(
                    'p-2 rounded-lg max-w-[80%] text-sm',
                    m.authorRole === 'STUDENT' ? 'bg-brand-500 text-white ml-auto' : 'bg-muted',
                  )}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <div className={cn('text-[9px] mt-1', m.authorRole === 'STUDENT' ? 'text-brand-100' : 'text-muted-foreground')}>
                      {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Digite sua mensagem..."
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

      {newOpen && (
        <div onClick={() => setNewOpen(false)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Nova conversa</h2>
              <button onClick={() => setNewOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Assunto (opcional)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)}
              rows={5} placeholder="Descreva sua dúvida..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={createNew} className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-bold">
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
