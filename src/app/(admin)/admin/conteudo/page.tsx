'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Star, DollarSign, Users, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULTS = {
  heroTitulo: 'Sua aprovação começa hoje',
  heroSubtitulo: 'Mentoria com IA adaptativa para concursos públicos do DF e Brasil.',
  heroBotao: 'Começar grátis',
  stat1Valor: '17', stat1Label: 'Cursos disponíveis',
  stat2Valor: '94%', stat2Label: 'Satisfação',
  stat3Valor: '3 dias', stat3Label: 'Grátis para testar',
  stat4Valor: '24/7', stat4Label: 'Mentor IA',
  depoimento1Nome: 'Rafael M.', depoimento1Cargo: 'Aprovado — PMDF 2024',
  depoimento1Texto: 'Em 4 meses usando o GabaritAI passei do zero para aprovado no PMDF. A IA sabia exatamente onde eu precisava melhorar.',
  depoimento2Nome: 'Camila R.', depoimento2Cargo: 'Aprovada — Banco do Brasil',
  depoimento2Texto: 'O Mentor IA criou um plano de estudos personalizado. Aprovada em 3 meses!',
  depoimento3Nome: 'Lucas S.', depoimento3Cargo: 'Aprovado — PF Agente',
  depoimento3Texto: 'Os simulados adaptativos foram decisivos. Senti que estava em uma prova real.',
  planFreeNome: 'Free', planFreePreco: 'R$ 0',
  planBasicoNome: 'Básico', planBasicoPreco: 'R$ 29,90',
  planPremiumNome: 'Premium', planPremiumPreco: 'R$ 59,90',
  planVitalicioNome: 'Vitalício', planVitalicioPreco: 'R$ 497,00',
}

type ConteudoKey = keyof typeof DEFAULTS

const SECOES = [
  {
    id: 'hero', label: 'Hero (Início da página)', icon: Globe,
    campos: [
      { key: 'heroTitulo', label: 'Título principal', tipo: 'text' },
      { key: 'heroSubtitulo', label: 'Subtítulo', tipo: 'textarea' },
      { key: 'heroBotao', label: 'Texto do botão CTA', tipo: 'text' },
    ] as { key: ConteudoKey; label: string; tipo: string }[]
  },
  {
    id: 'stats', label: 'Números / Estatísticas', icon: Star,
    campos: [
      { key: 'stat1Valor', label: 'Stat 1 — Valor', tipo: 'text' },
      { key: 'stat1Label', label: 'Stat 1 — Label', tipo: 'text' },
      { key: 'stat2Valor', label: 'Stat 2 — Valor', tipo: 'text' },
      { key: 'stat2Label', label: 'Stat 2 — Label', tipo: 'text' },
      { key: 'stat3Valor', label: 'Stat 3 — Valor', tipo: 'text' },
      { key: 'stat3Label', label: 'Stat 3 — Label', tipo: 'text' },
      { key: 'stat4Valor', label: 'Stat 4 — Valor', tipo: 'text' },
      { key: 'stat4Label', label: 'Stat 4 — Label', tipo: 'text' },
    ] as { key: ConteudoKey; label: string; tipo: string }[]
  },
  {
    id: 'depoimentos', label: 'Depoimentos', icon: Users,
    campos: [
      { key: 'depoimento1Nome', label: 'Depoimento 1 — Nome', tipo: 'text' },
      { key: 'depoimento1Cargo', label: 'Depoimento 1 — Cargo/Status', tipo: 'text' },
      { key: 'depoimento1Texto', label: 'Depoimento 1 — Texto', tipo: 'textarea' },
      { key: 'depoimento2Nome', label: 'Depoimento 2 — Nome', tipo: 'text' },
      { key: 'depoimento2Cargo', label: 'Depoimento 2 — Cargo/Status', tipo: 'text' },
      { key: 'depoimento2Texto', label: 'Depoimento 2 — Texto', tipo: 'textarea' },
      { key: 'depoimento3Nome', label: 'Depoimento 3 — Nome', tipo: 'text' },
      { key: 'depoimento3Cargo', label: 'Depoimento 3 — Cargo/Status', tipo: 'text' },
      { key: 'depoimento3Texto', label: 'Depoimento 3 — Texto', tipo: 'textarea' },
    ] as { key: ConteudoKey; label: string; tipo: string }[]
  },
  {
    id: 'planos', label: 'Planos e Preços', icon: DollarSign,
    campos: [
      { key: 'planFreeNome', label: 'Plano 1 — Nome', tipo: 'text' },
      { key: 'planFreePreco', label: 'Plano 1 — Preço', tipo: 'text' },
      { key: 'planBasicoNome', label: 'Plano 2 — Nome', tipo: 'text' },
      { key: 'planBasicoPreco', label: 'Plano 2 — Preço', tipo: 'text' },
      { key: 'planPremiumNome', label: 'Plano 3 — Nome', tipo: 'text' },
      { key: 'planPremiumPreco', label: 'Plano 3 — Preço', tipo: 'text' },
      { key: 'planVitalicioNome', label: 'Plano 4 — Nome', tipo: 'text' },
      { key: 'planVitalicioPreco', label: 'Plano 4 — Preço', tipo: 'text' },
    ] as { key: ConteudoKey; label: string; tipo: string }[]
  },
]

export default function ConteudoPage() {
  const [secaoAtiva, setSecaoAtiva] = useState('hero')
  const [valores, setValores] = useState<Record<ConteudoKey, string>>(DEFAULTS)
  const [alterado, setAlterado] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gabaritai_conteudo')
    if (saved) setValores(JSON.parse(saved))
  }, [])

  function atualizar(key: ConteudoKey, value: string) {
    setValores(v => ({ ...v, [key]: value }))
    setAlterado(true)
  }

  function salvar() {
    localStorage.setItem('gabaritai_conteudo', JSON.stringify(valores))
    setAlterado(false)
    toast.success('Conteúdo salvo! As alterações aparecem na landing page.')
  }

  function resetar() {
    setValores(DEFAULTS)
    localStorage.removeItem('gabaritai_conteudo')
    setAlterado(false)
    toast.success('Conteúdo resetado para os valores padrão.')
  }

  const secao = SECOES.find(s => s.id === secaoAtiva)!

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gestão de Conteúdo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Edite os textos da landing page, depoimentos, planos e estatísticas.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetar} className="btn-ghost btn-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </button>
          <button onClick={salvar} disabled={!alterado} className="btn-primary btn-sm">
            <Save className="w-3.5 h-3.5" /> Salvar alterações
          </button>
        </div>
      </div>

      {alterado && (
        <div className="rounded-xl bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30 px-4 py-3 text-xs text-warning-700 dark:text-warning-400 font-medium">
          ⚠️ Você tem alterações não salvas. Clique em "Salvar alterações" para aplicar.
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Menu lateral de seções */}
        <div className="space-y-1">
          {SECOES.map(s => (
            <button
              key={s.id}
              onClick={() => setSecaoAtiva(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                secaoAtiva === s.id
                  ? 'bg-brand-600 text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              <span className="leading-tight">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Campos da seção ativa */}
        <div className="lg:col-span-3 card p-5 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <secao.icon className="w-4 h-4 text-brand-500" />
            {secao.label}
          </h2>
          <div className="grid gap-4">
            {secao.campos.map(campo => (
              <div key={campo.key}>
                <label className="label">{campo.label}</label>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    className="input min-h-20 resize-none"
                    value={valores[campo.key]}
                    onChange={e => atualizar(campo.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="input"
                    value={valores[campo.key]}
                    onChange={e => atualizar(campo.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <button onClick={salvar} disabled={!alterado} className="btn-primary btn-md">
              <Save className="w-4 h-4" /> Salvar esta seção
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">ℹ️ Como funciona:</strong>{' '}
          As alterações são salvas localmente. Para publicar no site real, a próxima versão do GabaritAI terá integração com banco de dados para persistência permanente.
        </p>
      </div>
    </div>
  )
}
