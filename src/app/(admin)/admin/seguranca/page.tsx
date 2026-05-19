'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

export default function AdminSecurityPage() {
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle')
  const [setup, setSetup] = useState<{ secret: string; qrUrl: string; otpauthUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  // Carrega audit logs
  useEffect(() => {
    api.get('/admin/audit-logs?pageSize=20').then((res) => setLogs(res.data.logs)).catch(() => {})
  }, [])

  async function startSetup() {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/2fa/setup')
      setSetup(data)
      setStep('verify')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    if (code.length !== 6) return toast.error('Digite os 6 dígitos')
    setLoading(true)
    try {
      await api.post('/auth/2fa/verify', { code })
      toast.success('2FA ativado!')
      setStep('idle')
      setSetup(null)
      setCode('')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  async function disable() {
    const c = prompt('Digite o código atual do app autenticador pra desativar 2FA:')
    if (!c) return
    setLoading(true)
    try {
      await api.post('/auth/2fa/disable', { code: c })
      toast.success('2FA desativado')
      setStep('idle')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function copySecret() {
    if (!setup) return
    await navigator.clipboard.writeText(setup.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Segurança</h1>
        <p className="text-muted-foreground text-sm mt-0.5">2FA, logs de acesso e auditoria.</p>
      </div>

      {/* 2FA TOTP */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Autenticação em dois fatores (2FA)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adicione uma camada extra de segurança usando Google Authenticator, Authy ou 1Password.
              </p>
            </div>
          </div>
        </div>

        {step === 'idle' && (
          <button
            onClick={startSetup}
            disabled={loading}
            className="rounded-xl bg-purple-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <ShieldCheck className="w-4 h-4 inline mr-1.5" />}
            Ativar 2FA
          </button>
        )}

        {step === 'verify' && setup && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center">
                <img src={setup.qrUrl} alt="QR Code 2FA" className="mx-auto rounded-lg border border-border bg-white p-2" width={200} height={200} />
                <p className="text-[10px] text-muted-foreground mt-2">Escaneie com seu app autenticador</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Ou digite manualmente:</label>
                  <div className="mt-1 flex gap-1.5">
                    <code className="flex-1 text-xs px-3 py-2 bg-muted rounded-lg font-mono break-all">{setup.secret}</code>
                    <button onClick={copySecret} className="px-2 rounded-lg border border-border bg-background hover:bg-muted">
                      {copied ? <Check className="w-3 h-3 text-success-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Código de 6 dígitos do app:</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-xl tracking-widest font-mono"
                  />
                </div>
                <button
                  onClick={verify}
                  disabled={loading || code.length !== 6}
                  className="w-full rounded-xl bg-purple-500 text-white py-2.5 text-sm font-semibold hover:bg-purple-600 disabled:opacity-50"
                >
                  {loading ? 'Verificando…' : 'Confirmar e ativar'}
                </button>
                <button
                  onClick={() => { setStep('idle'); setSetup(null); setCode('') }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="card p-5">
        <h2 className="font-bold text-foreground mb-3">Atividade recente</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem registros ainda.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{new Date(l.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="font-semibold">{l.action}</span>
                  {l.actor && <span className="text-muted-foreground">— {l.actor.name}</span>}
                </div>
                {l.ip && <span className="text-muted-foreground font-mono">{l.ip}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
