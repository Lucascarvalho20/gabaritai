'use client'

import { useState } from 'react'
import { Shield, Check, Edit2, Save, X, Users, DollarSign, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Plano {
  id: string
  nome: string
  descricao: string
  precoMensal: number
  precoAnual: number
  precoVitalicio: number | null
  cor: string
  destaque: boolean
  features: string[]
  alunos: number
  ativo: boolean
}

const initialPlanos: Plano[] = [
  {
    id: 'free',
    nome: 'Trial Gratuito',
    descricao: '7 dias para experimentar',
    precoMensal: 0, precoAnual: 0, precoVitalicio: null,
    cor: 'from-slate-400 to-slate-500',
    destaque: false, ativo: true, alunos: 2,
    features: ['1 concurso à escolha', 'Cronograma básico', 'Banco de questões limitado (50/dia)', 'Flashcards IA (20/dia)', 'Dashboard de progresso'],
  },
  {
    id: 'basic',
    nome: 'Básico',
    descricao: 'Para quem está começando',
    precoMensal: 59, precoAnual: 497, precoVitalicio: null,
    cor: 'from-slate-500 to-slate-600',
    destaque: false, ativo: true, alunos: 2,
    features: ['1 concurso à escolha', 'Cronograma inteligente IA', 'Questões ilimitadas', 'Flashcards IA ilimitados', 'Simulados semanais', 'Mentor IA básico', 'Dashboard completo'],
  },
  {
    id: 'premium',
    nome: 'Premium',
    descricao: 'O mais completo — mais escolhido',
    precoMensal: 97, precoAnual: 797, precoVitalicio: null,
    cor: 'from-brand-600 to-purple-600',
    destaque: true, ativo: true, alunos: 4,
    features: ['Cursos ilimitados', 'Mentor IA avançado 24/7', 'Análise preditiva de aprovação', 'Simulados adaptativos por banca', 'PDF resumido por IA', 'Edital verticalizado interativo', 'Relatórios detalhados', 'Comunidade exclusiva', 'Suporte prioritário'],
  },
  {
    id: 'lifetime',
    nome: 'Vitalício',
    descricao: 'Pague uma vez, acesso para sempre',
    precoMensal: 0, precoAnual: 0, precoVitalicio: 897,
    cor: 'from-yellow-500 to-orange-500',
    destaque: false, ativo: true, alunos: 1,
    features: ['Tudo do Premium', 'Acesso permanente', 'Todas as atualizações futuras', 'IA com memória permanente do aluno', 'Beta tester privilégios', 'Acesso antecipado a novos cursos', 'Mentorias ao vivo mensais'],
  },
]

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>(initialPlanos)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVals, setEditVals] = useState<{ mensal: string; anual: string; vitalicio: string }>({ mensal: '', anual: '', vitalicio: '' })
  const [savedId, setSavedId] = useState<string | null>(null)

  function startEdit(p: Plano) {
    setEditingId(p.id)
    setEditVals({
      mensal: String(p.precoMensal),
      anual: String(p.precoAnual),
      vitalicio: String(p.precoVitalicio ?? ''),
    })
  }

  function saveEdit(id: string) {
    setPlanos(prev => prev.map(p => p.id === id ? {
      ...p,
      precoMensal: Number(editVals.mensal) || p.precoMensal,
      precoAnual: Number(editVals.anual) || p.precoAnual,
      precoVitalicio: editVals.vitalicio ? Number(editVals.vitalicio) : p.precoVitalicio,
    } : p))
    setEditingId(null)
    setSavedId(id)
    setTimeout(() => setSavedId(null), 2000)
  }

  const totalAlunos = planos.reduce((a, p) => a + p.alunos, 0)
  const receitaMRR = planos.reduce((a, p) => a + p.alunos * p.precoMensal, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gerenciar Planos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure preços e funcionalidades de cada plano</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total assinantes', value: totalAlunos, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'MRR estimado', value: `R$ ${receitaMRR.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-600/10' },
          { label: 'Planos ativos', value: planos.filter(p => p.ativo).length, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-xl font-black text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Cards de planos */}
      <div className="grid sm:grid-cols-2 gap-5">
        {planos.map(p => (
          <div key={p.id} className={cn('card p-5', p.destaque && 'ring-2 ring-brand-500')}>
            {p.destaque && (
              <div className="badge bg-brand-600 text-white mb-3">Mais popular</div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.cor} flex items-center justify-center`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{p.alunos} alunos</span>
                {savedId === p.id && <span className="badge-green text-xs">✓ Salvo</span>}
              </div>
            </div>

            <h2 className="font-black text-foreground text-lg">{p.nome}</h2>
            <p className="text-sm text-muted-foreground mb-4">{p.descricao}</p>

            {/* Preços */}
            {editingId === p.id ? (
              <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Editar preços</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Mensal (R$)</label>
                    <input className="input py-1 text-sm mt-1" value={editVals.mensal} onChange={e => setEditVals(v => ({ ...v, mensal: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Anual (R$)</label>
                    <input className="input py-1 text-sm mt-1" value={editVals.anual} onChange={e => setEditVals(v => ({ ...v, anual: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Vitalício (R$)</label>
                    <input className="input py-1 text-sm mt-1" value={editVals.vitalicio} placeholder="N/A" onChange={e => setEditVals(v => ({ ...v, vitalicio: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(p.id)} className="btn-primary btn-sm flex-1">
                    <Save className="w-3.5 h-3.5" /> Salvar preços
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-4 mb-4">
                {p.precoMensal > 0 && (
                  <div>
                    <span className="text-2xl font-black text-foreground">R$ {p.precoMensal}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                )}
                {p.precoAnual > 0 && (
                  <div className="text-sm text-muted-foreground">
                    ou <strong className="text-foreground">R$ {p.precoAnual}</strong>/ano
                  </div>
                )}
                {p.precoVitalicio && (
                  <div>
                    <span className="text-2xl font-black text-foreground">R$ {p.precoVitalicio}</span>
                    <span className="text-sm text-muted-foreground"> único</span>
                  </div>
                )}
                {p.precoMensal === 0 && !p.precoVitalicio && (
                  <span className="text-2xl font-black text-foreground">Grátis</span>
                )}
                <button onClick={() => startEdit(p)} className="btn-ghost btn-sm p-1.5 ml-auto">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Features */}
            <ul className="space-y-1.5">
              {p.features.slice(0, 5).map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-success-500 shrink-0" /> {f}
                </li>
              ))}
              {p.features.length > 5 && (
                <li className="text-xs text-brand-600 dark:text-brand-400">+{p.features.length - 5} funcionalidades</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Nota sobre integração de pagamento */}
      <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
        <div className="flex items-start gap-3">
          <DollarSign className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Integração com Mercado Pago</p>
            <p className="text-xs text-muted-foreground mt-1">
              Para ativar cobranças reais, adicione <code className="bg-muted px-1 rounded">MERCADOPAGO_ACCESS_TOKEN</code> e <code className="bg-muted px-1 rounded">MERCADOPAGO_PUBLIC_KEY</code> no arquivo <code className="bg-muted px-1 rounded">apps/web/.env.local</code>. Veja o arquivo <strong>COMO_INSTALAR.md</strong> para instruções.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
