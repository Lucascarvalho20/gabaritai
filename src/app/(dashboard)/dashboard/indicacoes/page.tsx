'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Gift, Copy, CheckCircle2, Loader2, Users, Banknote, TrendingUp, ChevronLeft, Share2,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Stats = {
  referralCode: string
  referralLink: string
  totalReferrals: number
  payingReferrals: number
  totalCommissionCents: number
  pendingCommissionCents: number
  recentPayments: Array<{
    payerName: string
    amountCents: number
    commissionCents: number
    paidAt: string | null
  }>
}

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function IndicacoesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    api.get('/me/referral')
      .then(({ data }) => setStats(data))
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro'))
      .finally(() => setLoading(false))
  }, [])

  async function copy(text: string, kind: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text)
      if (kind === 'code') {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
    } catch {
      toast.error('Não consegui copiar')
    }
  }

  async function share() {
    if (!stats) return
    const msg = `Tô estudando pelo Gabaritai e tá funcionando demais. Cronograma adaptativo, simulados no formato da banca, mentor 24h. Usa meu link e ganha 7 dias grátis: ${stats.referralLink}`
    if (navigator.share) {
      await navigator.share({ title: 'Gabaritai', text: msg, url: stats.referralLink }).catch(() => {})
    } else {
      await copy(msg, 'link')
      toast.success('Mensagem copiada — cola onde quiser compartilhar')
    }
  }

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-black inline-flex items-center gap-2">
          <Gift className="w-6 h-6 text-brand-500" /> Programa de indicações
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Ganhe <strong className="text-foreground">30% recorrente</strong> de tudo que cada pessoa que você
          indica paga, enquanto a assinatura dela continuar ativa.
        </p>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Users} label="Indicados" value={stats.totalReferrals.toString()} />
        <Stat icon={CheckCircle2} label="Pagantes" value={stats.payingReferrals.toString()} />
        <Stat icon={TrendingUp} label="Comissão total" value={fmtMoney(stats.totalCommissionCents)} />
        <Stat icon={Banknote} label="Pra receber" value={fmtMoney(stats.pendingCommissionCents)} highlight />
      </div>

      {/* Link e código */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-sm">Seu link de indicação</h2>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Código</label>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 px-4 py-3 rounded-lg border border-border bg-muted/30 font-mono text-2xl font-bold tracking-widest text-center text-brand-600">
              {stats.referralCode}
            </div>
            <button
              onClick={() => copy(stats.referralCode, 'code')}
              className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-3 text-xs font-bold inline-flex items-center gap-1 shrink-0"
            >
              {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Link completo</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={stats.referralLink}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs font-mono truncate"
            />
            <button
              onClick={() => copy(stats.referralLink, 'link')}
              className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-bold inline-flex items-center gap-1 shrink-0"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <button
          onClick={share}
          className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-3 text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Compartilhar
        </button>
      </div>

      {/* Como funciona */}
      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3">Como funciona</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <div>Você compartilha seu link com alguém que tá estudando pra concurso.</div>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <div>Ela se cadastra pelo seu link (trial de 7 dias, sem cartão).</div>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
            <div>Quando ela vira pagante, você começa a receber <strong className="text-foreground">30%</strong> de tudo que ela paga, mês a mês.</div>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">4</div>
            <div>Pagamento via Pix quando acumular <strong className="text-foreground">R$ 100</strong>. Você pode pedir o saque pelo email contato@gabaritai.com.br.</div>
          </div>
        </div>
      </div>

      {/* Pagamentos recentes */}
      {stats.recentPayments.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-sm mb-3">Pagamentos recentes dos seus indicados</h2>
          <div className="space-y-2">
            {stats.recentPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.payerName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '—'}
                    {' · pagou '}
                    {fmtMoney(p.amountCents)}
                  </div>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shrink-0">
                  + {fmtMoney(p.commissionCents)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalReferrals === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <Gift className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold mb-1">Você ainda não indicou ninguém</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Compartilhe seu link com colegas concurseiros. Quando assinarem, você começa a ganhar comissão
            recorrente todo mês.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({
  icon: Icon, label, value, highlight,
}: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-900/15' : ''}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  )
}
