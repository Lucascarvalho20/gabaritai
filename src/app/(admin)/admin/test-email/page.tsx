'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const CURSOS_TESTE = [
  { slug: 'pcdf-delegado', label: 'PCDF Delegado (Cebraspe)', isParent: false },
  { slug: 'pf-delegado', label: 'PF Delegado (Cebraspe)', isParent: false },
  { slug: 'pmdf-soldado', label: 'PMDF Soldado (AOCP)', isParent: false },
  { slug: 'prf-policial', label: 'PRF Policial (Cebraspe)', isParent: false },
  { slug: 'pmgo-soldado', label: 'PMGO Soldado (AOCP)', isParent: false },
  // Mesmo formato que a home manda — parentSlug (grupo do concurso)
  { slug: 'pcdf', label: '🏠 [HOME] PCDF (parent)', isParent: true },
  { slug: 'pf', label: '🏠 [HOME] PF (parent)', isParent: true },
  { slug: 'pmdf', label: '🏠 [HOME] PMDF (parent)', isParent: true },
  { slug: 'prf', label: '🏠 [HOME] PRF (parent)', isParent: true },
]

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [courseSlug, setCourseSlug] = useState('pcdf-delegado')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function enviar() {
    if (!email.trim()) {
      toast.error('Preencha o email')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      // Detecta se é parentSlug (modo home) ou courseSlug (específico)
      const cursoSelecionado = CURSOS_TESTE.find((c) => c.slug === courseSlug)
      const payload = cursoSelecionado?.isParent
        ? { to: email, parentSlug: courseSlug }
        : { to: email, courseSlug }
      const { data } = await api.post('/admin/test-email', payload)
      setResult(data)
      if (data.result?.ok && data.result?.mode === 'resend') {
        toast.success('Email enviado pelo Resend!')
      } else if (data.result?.mode === 'dev') {
        toast.error('Modo DEV — email não foi enviado de verdade')
      } else {
        toast.error('Resend retornou erro — veja diagnóstico')
      }
    } catch (err: any) {
      toast.error('Erro: ' + (err.response?.data?.message ?? err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <header>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Mail className="w-6 h-6 text-brand-500" />
          Teste de Email
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Diagnostica o pipeline de email do edital verticalizado. Resultado mostra status do
          Resend e qualquer problema.
        </p>
      </header>

      <div className="card p-5 space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">
            Enviar para
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">
            Curso (edital verticalizado)
          </label>
          <select
            value={courseSlug}
            onChange={(e) => setCourseSlug(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {CURSOS_TESTE.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={enviar}
          disabled={loading || !email.trim()}
          className="btn-primary btn-md inline-flex items-center gap-2 w-full justify-center"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Testando…' : 'Enviar email de teste'}
        </button>
      </div>

      {result && (
        <>
          {/* Diagnóstico em destaque */}
          <div
            className={cn(
              'card p-4 border-l-4',
              result.result?.mode === 'resend' && result.result?.ok
                ? 'border-l-success-500 bg-success-50/40 dark:bg-success-900/10'
                : result.result?.mode === 'dev'
                ? 'border-l-warning-500 bg-warning-50/40 dark:bg-warning-900/10'
                : 'border-l-danger-500 bg-danger-50/40 dark:bg-danger-900/10'
            )}
          >
            <div className="flex gap-3 items-start">
              {result.result?.ok && result.result?.mode === 'resend' ? (
                <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-warning-500 shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-semibold">{result.diagnostico}</p>
            </div>
          </div>

          {/* Variáveis de ambiente */}
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3">Variáveis do servidor</h2>
            <table className="w-full text-sm">
              <tbody>
                <Row k="RESEND_API_KEY" v={result.env.hasResendApiKey ? '✅ configurada' : '❌ NÃO configurada'} highlight={!result.env.hasResendApiKey} />
                <Row k="EMAIL_FROM" v={result.env.emailFrom} />
                <Row k="NEXT_PUBLIC_SITE_URL" v={result.env.siteUrl} />
                <Row k="GEMINI_API_KEY" v={result.env.hasGeminiKey ? '✅ configurada (análise estratégica funcional)' : '⚠️ não configurada (email vai sem análise IA)'} />
              </tbody>
            </table>
          </div>

          {/* Resultado do envio */}
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3">Resultado do envio</h2>
            <table className="w-full text-sm">
              <tbody>
                <Row k="Modo" v={result.result?.mode === 'resend' ? 'Resend (produção)' : 'Dev (console)'} />
                <Row k="Sucesso" v={result.result?.ok ? '✅ sim' : '❌ não'} highlight={!result.result?.ok} />
                {result.result?.messageId && <Row k="Message ID (Resend)" v={result.result.messageId} />}
                {result.result?.from && <Row k="Enviado por (From)" v={result.result.from} />}
                <Row k="Destinatário" v={result.to} />
                <Row k="Assunto" v={result.rendered.subject} />
                <Row k="Tamanho HTML" v={`${result.rendered.htmlLength.toLocaleString('pt-BR')} caracteres`} />
                {result.result?.error && (
                  <>
                    <Row k="Erro (name)" v={result.result.error.name ?? '—'} highlight />
                    <Row k="Erro (statusCode)" v={String(result.result.error.statusCode ?? '—')} highlight />
                    <Row k="Erro (mensagem)" v={result.result.error.message ?? '—'} highlight />
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Dicas baseadas no erro */}
          {result.result?.error && (
            <div className="card p-5 bg-warning-50/40 dark:bg-warning-900/10 border-l-4 border-l-warning-500">
              <h2 className="text-sm font-bold mb-2 text-warning-700 dark:text-warning-300">
                Possíveis causas
              </h2>
              <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-5">
                {result.result.error.statusCode === 403 && (
                  <li>
                    <strong>403 — Domínio não verificado no Resend.</strong> No plano gratuito do
                    Resend, o sender padrão <code className="px-1 py-0.5 bg-card rounded">onboarding@resend.dev</code> só envia
                    <strong> pro mesmo email cadastrado na conta Resend</strong>. Pra mandar pra qualquer destinatário,
                    você precisa verificar um domínio (ex: gabaritai.com.br) no Resend e atualizar
                    <code className="px-1 py-0.5 bg-card rounded ml-1">EMAIL_FROM</code> no Vercel.
                  </li>
                )}
                {result.result.error.statusCode === 401 && (
                  <li>
                    <strong>401 — API key inválida.</strong> Confira o
                    <code className="px-1 py-0.5 bg-card rounded mx-1">RESEND_API_KEY</code>
                    no Vercel — pode ter sido revogada ou copiada errada.
                  </li>
                )}
                {result.result.error.statusCode === 422 && (
                  <li>
                    <strong>422 — Payload inválido.</strong> Algum campo do email está mal formado.
                    Olhe a mensagem detalhada acima.
                  </li>
                )}
                {result.result.error.statusCode === 429 && (
                  <li>
                    <strong>429 — Limite de envio atingido.</strong> Você passou da quota de
                    3.000 emails/mês do Resend free. Espere o reset ou upgrade.
                  </li>
                )}
                {!result.result.error.statusCode && (
                  <li>
                    <strong>Erro de rede ou timeout</strong> — o Vercel pode ter caído antes
                    de receber resposta do Resend. Tenta de novo.
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Instruções pro user */}
      <div className="card p-5 bg-muted/30">
        <h2 className="text-sm font-bold mb-2">Se aparecer "RESEND_API_KEY não configurada":</h2>
        <ol className="text-xs space-y-1.5 text-muted-foreground list-decimal pl-5">
          <li>Vai em <a href="https://vercel.com/joao-lucas-projects-0440ffb0/gabaritai/settings/environment-variables" target="_blank" rel="noopener" className="text-brand-600 hover:underline">Vercel → Settings → Environment Variables</a></li>
          <li>Adiciona <code className="px-1 py-0.5 bg-card rounded">RESEND_API_KEY</code> com seu token do Resend</li>
          <li>Adiciona <code className="px-1 py-0.5 bg-card rounded">EMAIL_FROM</code> (ex: <code className="px-1 py-0.5 bg-card rounded">Gabaritai &lt;naoresponda@gabaritai.com.br&gt;</code>)</li>
          <li>Faz Redeploy do projeto</li>
          <li>Volta aqui e testa de novo</li>
        </ol>
      </div>
    </div>
  )
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{k}</td>
      <td className={cn('py-2 text-xs', highlight && 'text-warning-700 dark:text-warning-300 font-bold')}>
        {v}
      </td>
    </tr>
  )
}
