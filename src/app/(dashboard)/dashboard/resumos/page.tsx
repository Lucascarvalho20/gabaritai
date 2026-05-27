'use client'

import { useEffect, useState } from 'react'
import { Brain, Loader2, Copy, Check, Sparkles, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const MAX_CHARS = 30_000

const EXEMPLOS = [
  'Artigo 5º da Constituição Federal de 1988 — Dos Direitos e Deveres Individuais e Coletivos',
  'Lei 12.830/2013 — Dispõe sobre a investigação criminal conduzida pelo Delegado de Polícia',
  'Princípios da Administração Pública — LIMPE (Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência)',
]

export default function ResumosPage() {
  const user = useAuthStore(s => s.user)
  const [conteudo, setConteudo]   = useState('')
  const [resultado, setResultado] = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [quota, setQuota]         = useState<{ used: number; limit: number } | null>(null)

  // Busca quota do dia logo de cara
  useEffect(() => {
    api.get('/ai/resumo/quota').then(({ data }) => setQuota(data)).catch(() => {})
  }, [])

  async function gerar() {
    if (!conteudo.trim()) { toast.error('Cole um texto ou edital para resumir'); return }
    if (conteudo.length > MAX_CHARS) {
      toast.error(`Texto muito longo (máx ${MAX_CHARS.toLocaleString('pt-BR')} caracteres). Quebra em pedaços menores.`)
      return
    }
    setLoading(true)
    setResultado('')
    try {
      const res = await api.post('/ai/resumo', {
        conteudo,
        concurso: user?.concursoAlvo ?? '',
      })
      setResultado(res.data.resultado)
      if (res.data.quota) setQuota(res.data.quota)
    } catch (err: any) {
      const status = err.response?.status
      const msg = err.response?.data?.message ?? 'Erro ao gerar. Tente novamente.'
      if (status === 429) {
        toast.error(msg, { duration: 6000 })
        if (err.response?.data?.quota) setQuota(err.response.data.quota)
      } else {
        toast.error(msg)
      }
    } finally { setLoading(false) }
  }

  function copyResult() {
    navigator.clipboard.writeText(resultado)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const charsLeft = MAX_CHARS - conteudo.length
  const overLimit = conteudo.length > MAX_CHARS
  const quotaUsed = quota ? quota.used : 0
  const quotaLimit = quota ? quota.limit : 5
  const quotaLeft = Math.max(0, quotaLimit - quotaUsed)
  const quotaPct = quota ? Math.min(100, (quotaUsed / quotaLimit) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-500" />
          Resumo Inteligente
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cole qualquer texto, lei, artigo ou edital. A IA destaca os pontos que mais caem na prova,
          legislação importante, exceções e pegadinhas comuns.
        </p>
      </div>

      {/* Banner de quota */}
      {quota && (
        <div className={cn(
          'card p-3 flex items-center justify-between gap-3',
          quotaLeft === 0 && 'border-danger-300 bg-danger-50/50 dark:bg-danger-900/10',
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <Brain className="w-4 h-4 text-brand-500 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-foreground">
                {quotaLeft} de {quotaLimit} resumos restantes hoje
              </div>
              <div className="text-muted-foreground">
                {quotaLeft === 0
                  ? 'Volta amanhã ou faz upgrade pra ter mais resumos por dia.'
                  : 'A quota reseta toda meia-noite.'}
              </div>
            </div>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
            <div
              className={cn(
                'h-full transition-all',
                quotaPct < 70 ? 'bg-brand-500' : quotaPct < 100 ? 'bg-warning-500' : 'bg-danger-500',
              )}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="label">Cole o texto, lei ou edital</label>
            <textarea
              className="input min-h-64 resize-none font-mono text-xs"
              placeholder="Cole aqui o artigo de lei, trecho do edital, resumo de aula, texto de livro... A IA vai destacar o que cai na prova."
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn(
                'text-xs',
                overLimit ? 'text-danger-500 font-semibold' : charsLeft < 3000 ? 'text-warning-500' : 'text-muted-foreground',
              )}>
                {conteudo.length.toLocaleString('pt-BR')} / {MAX_CHARS.toLocaleString('pt-BR')} caracteres
                {overLimit && ' — texto muito longo'}
              </span>
              <div className="flex gap-2">
                {EXEMPLOS.map((ex, i) => (
                  <button key={i} onClick={() => setConteudo(ex)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                    Exemplo {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={gerar}
            disabled={loading || !conteudo.trim() || overLimit || quotaLeft === 0}
            className="btn-primary btn-lg w-full"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando resumo...</>
              : quotaLeft === 0
                ? <><AlertCircle className="w-5 h-5" /> Limite diário atingido</>
                : <><Sparkles className="w-5 h-5" /> Gerar resumo</>}
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Resultado</label>
            {resultado && (
              <button onClick={copyResult} className="btn-ghost btn-sm text-xs">
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            )}
          </div>
          <div className={cn(
            'min-h-64 rounded-2xl border border-border p-4 bg-muted/30',
            loading && 'flex items-center justify-center'
          )}>
            {loading ? (
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  A IA está analisando o conteúdo...
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                  Pode levar 10–20 segundos pra textos longos.
                </p>
              </div>
            ) : resultado ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-strong:text-foreground text-muted-foreground">
                <ReactMarkdown>{resultado}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-3">
                <Brain className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  O resumo aparece aqui
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">
                  Cole o texto à esquerda e clica em <strong>Gerar resumo</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Como usar */}
      <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
        <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-500" /> Como aproveitar melhor
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">📄 O que pode colar</p>
            <ul className="space-y-1">
              <li>• Artigos de lei (Constituição, CPP, CP)</li>
              <li>• Trechos de edital</li>
              <li>• Resumo de aula ou apostila</li>
              <li>• Texto de livro doutrinário</li>
              <li>• Súmulas e jurisprudência</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">✨ O que a IA destaca</p>
            <ul className="space-y-1">
              <li>• Pontos mais cobrados em prova</li>
              <li>• Artigos e legislação centrais</li>
              <li>• Exceções e pegadinhas</li>
              <li>• Conceitos que mais confundem</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">💡 Dica</p>
            <ul className="space-y-1">
              <li>• Um artigo por vez = mais detalhe</li>
              <li>• Salva o resumo antes de gerar outro</li>
              <li>• Limite de {MAX_CHARS.toLocaleString('pt-BR')} chars protege a IA</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
