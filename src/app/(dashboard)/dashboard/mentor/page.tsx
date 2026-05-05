'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Loader2, Sparkles, RefreshCw, BookOpen, Target, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

const SUGESTOES = [
  'Qual é meu maior ponto fraco hoje?',
  'Crie um plano de revisão para amanhã',
  'Como está minha chance de aprovação?',
  'Explique inviolabilidade domiciliar com exemplos',
  'Quais matérias devo priorizar essa semana?',
  'Me dê 5 dicas para melhorar minha concentração',
]

export default function MentorPage() {
  const user = useAuthStore(s => s.user)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Olá, ${user?.name?.split(' ')[0] ?? 'concurseiro'}! 👋 Sou seu **Mentor IA** personalizado.\n\nEstou analisando seu histórico de estudos e desempenho. Posso te ajudar com:\n\n- 📊 **Análise do seu desempenho** e pontos fracos\n- 📅 **Ajuste do seu cronograma** de estudos\n- 📝 **Explicações detalhadas** de qualquer matéria\n- 🎯 **Planos de revisão** personalizados\n- 💡 **Dicas e estratégias** para melhorar\n\nO que você precisa hoje?`,
      createdAt: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content?: string) {
    const text = (content ?? input).trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, createdAt: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/ai/chat', { message: text, history })
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.response,
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Erro ao conectar com o mentor. Verifique se a chave de API de IA está configurada no servidor.',
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Conversa reiniciada! Como posso te ajudar, ${user?.name?.split(' ')[0]}?`,
      createdAt: new Date(),
    }])
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-foreground text-lg">Mentor IA</h1>
            <div className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400">
              <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
              Online • Analisando seu perfil
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge-blue text-xs">
            <Sparkles className="w-3 h-3 mr-1" /> Powered by Claude
          </div>
          <button onClick={clearChat} className="btn-ghost btn-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>
      </div>

      {/* Sugestões rápidas */}
      {messages.length <= 1 && (
        <div className="mb-4 shrink-0">
          <p className="text-xs text-muted-foreground mb-2 font-medium">SUGESTÕES RÁPIDAS</p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-all font-medium text-muted-foreground">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-3 animate-slide-up', msg.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold', msg.role === 'assistant' ? 'bg-gradient-to-br from-brand-500 to-purple-500 text-white' : 'bg-muted text-foreground')}>
              {msg.role === 'assistant' ? <Brain className="w-4 h-4" /> : (user?.name?.[0] ?? 'U')}
            </div>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-card border border-border text-foreground'
                : 'bg-brand-600 text-white'
            )}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              <div className={cn('text-xs mt-2 opacity-60', msg.role === 'user' ? 'text-right' : '')}>
                {msg.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-sm text-muted-foreground">Mentor IA está pensando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-border">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte qualquer coisa sobre seus estudos... (Enter para enviar)"
              rows={1}
              className="input resize-none pr-4 py-3 min-h-[48px] max-h-32 overflow-y-auto"
              style={{ fieldSizing: 'content' } as any}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary w-12 h-12 p-0 rounded-xl shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          O Mentor IA usa seu histórico de estudos para respostas personalizadas
        </p>
      </div>
    </div>
  )
}
