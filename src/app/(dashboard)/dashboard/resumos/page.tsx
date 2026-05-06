'use client'

import { useState } from 'react'
import { Brain, Zap, Map, FileText, HelpCircle, List, Loader2, Copy, Check, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const TIPOS = [
  { id: 'resumo',       label: 'Resumo Inteligente', icon: FileText, desc: 'Pontos principais para prova', color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
  { id: 'mapa_mental',  label: 'Mapa Mental',         icon: Map,      desc: 'Estrutura visual hierárquica', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'flashcards',   label: 'Gerar Flashcards',    icon: Zap,      desc: '10 flashcards prontos para revisar', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'questoes',     label: 'Criar Questões',       icon: HelpCircle, desc: 'Questões estilo CESPE + gabarito', color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
  { id: 'pontos_chave', label: 'Pontos-Chave',         icon: List,     desc: 'Top 10 pontos mais importantes', color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
]

const EXEMPLOS = [
  'Artigo 5º da Constituição Federal de 1988 — Dos Direitos e Deveres Individuais e Coletivos',
  'Lei 12.830/2013 — Dispõe sobre a investigação criminal conduzida pelo Delegado de Polícia',
  'Princípios da Administração Pública — LIMPE (Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência)',
]

export default function ResumosPage() {
  const user = useAuthStore(s => s.user)
  const [conteudo, setConteudo]   = useState('')
  const [tipo, setTipo]           = useState('resumo')
  const [resultado, setResultado] = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)

  async function gerar() {
    if (!conteudo.trim()) { toast.error('Cole um texto ou edital para analisar'); return }
    setLoading(true)
    setResultado('')
    try {
      const res = await api.post('/ai/resumo', {
        conteudo,
        tipo,
        concurso: user?.concursoAlvo ?? '',
      })
      setResultado(res.data.resultado)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao gerar. Verifique as chaves de IA.')
    } finally { setLoading(false) }
  }

  function copyResult() {
    navigator.clipboard.writeText(resultado)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-500" />
          Resumos com IA
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cole qualquer texto, lei, artigo ou edital — a IA gera resumo, mapa mental, flashcards ou questões. Similar ao NotebookLM, mas integrado ao seu estudo.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="label">Tipo de análise</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all text-xs',
                    tipo === t.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                      : 'border-border hover:border-brand-300 hover:bg-muted'
                  )}
                >
                  <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center`}>
                    <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                  </div>
                  <span className={cn('font-semibold', tipo === t.id ? 'text-brand-700 dark:text-brand-300' : 'text-foreground')}>{t.label}</span>
                  <span className="text-muted-foreground text-xs leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Cole o texto, lei ou edital</label>
            <textarea
              className="input min-h-52 resize-none font-mono text-xs"
              placeholder="Cole aqui o artigo de lei, trecho do edital, resumo de aula, texto de livro... A IA vai analisar e transformar no que você escolheu acima."
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{conteudo.length} caracteres</span>
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
            disabled={loading || !conteudo.trim()}
            className="btn-primary btn-lg w-full"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</>
              : <><Sparkles className="w-5 h-5" /> Gerar {TIPOS.find(t => t.id === tipo)?.label}</>
            }
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Resultado da IA</label>
            {resultado && (
              <button onClick={copyResult} className="btn-ghost btn-sm text-xs">
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            )}
          </div>
          <div className={cn(
            'min-h-52 rounded-2xl border border-border p-4 bg-muted/30',
            loading && 'flex items-center justify-center'
          )}>
            {loading ? (
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  A IA está analisando o conteúdo...
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
                  O resultado aparecerá aqui
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">
                  Cole qualquer texto e escolha o tipo de análise que deseja
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Como usar */}
      <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
        <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-500" /> Como usar esta ferramenta
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">📄 O que você pode colar:</p>
            <ul className="space-y-1">
              <li>• Artigos de lei (Constituição, CPP, CP...)</li>
              <li>• Trechos de editais</li>
              <li>• Resumos de aula ou apostila</li>
              <li>• Textos de livros doutrinários</li>
              <li>• Súmulas e jurisprudência</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">✨ O que a IA gera:</p>
            <ul className="space-y-1">
              <li>• Resumo com pontos que caem na prova</li>
              <li>• Mapa mental estruturado</li>
              <li>• Flashcards prontos para revisar</li>
              <li>• Questões no estilo CESPE</li>
              <li>• Top 10 pontos mais importantes</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">💡 Dica de uso:</p>
            <ul className="space-y-1">
              <li>• Cole um artigo por vez para mais detalhes</li>
              <li>• Salve o resultado antes de gerar outro</li>
              <li>• Use os flashcards gerados na seção Flashcards</li>
              <li>• Compare com o edital do seu concurso</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
