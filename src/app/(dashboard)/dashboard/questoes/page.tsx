'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight, Filter, Brain, BookOpen, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOCK_QUESTAO = {
  id: 1,
  numero: 1,
  banca: 'CESPE/CEBRASPE',
  ano: 2023,
  orgao: 'PMDF',
  materia: 'Direito Constitucional',
  topico: 'Direitos Fundamentais',
  dificuldade: 'Médio',
  enunciado: 'Acerca dos direitos e garantias fundamentais previstos na Constituição Federal de 1988, assinale a opção correta.',
  alternativas: [
    { letra: 'A', texto: 'A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.' },
    { letra: 'B', texto: 'É livre a manifestação do pensamento, sendo vedado o anonimato somente em matéria eleitoral.' },
    { letra: 'C', texto: 'A inviolabilidade do sigilo das comunicações telefônicas pode ser afastada, para fins de investigação criminal, mediante autorização do Ministério Público.' },
    { letra: 'D', texto: 'O direito de propriedade é absoluto e não admite restrições, salvo nos casos de desapropriação por utilidade pública.' },
    { letra: 'E', texto: 'Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos desta Constituição.' },
  ],
  gabarito: 'A',
  explicacao: `**Gabarito: A — CORRETO**

O art. 5º, XI, da CF/88 dispõe exatamente isso: *"a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial"*.

**Por que as demais estão erradas:**

- **B)** Errada. O anonimato é vedado em toda manifestação de pensamento (art. 5º, IV), não apenas na matéria eleitoral.

- **C)** Errada. A interceptação telefônica exige autorização **judicial** (não do MP), por ordem do juiz competente (art. 5º, XII e Lei 9.296/96).

- **D)** Errada. O direito de propriedade NÃO é absoluto. A CF prevê várias formas de relativização: função social, desapropriação, requisição, usucapião, etc.

- **E)** Errada. Embora o conteúdo seja correto (art. 1º, parágrafo único), esta afirmação refere-se à soberania popular, não especificamente a direitos fundamentais.

**Dica de prova:** A banca CESPE adora cobrar as hipóteses de violação domiciliar. Memorize: FLAGRANTE, DESASTRE, SOCORRO (a qualquer hora) e DETERMINAÇÃO JUDICIAL (só durante o dia).`,
}

type Estado = 'pendente' | 'respondida' | 'gabarito'

export default function QuestoesPage() {
  const [estado, setEstado] = useState<Estado>('pendente')
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false)

  function responder() {
    if (!selecionada) return
    setEstado('respondida')
    setTimeout(() => setEstado('gabarito'), 600)
  }

  function proximaQuestao() {
    setEstado('pendente')
    setSelecionada(null)
    setMostrarExplicacao(false)
  }

  const corAlternativa = (letra: string) => {
    if (estado !== 'gabarito') {
      return selecionada === letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-border hover:border-brand-300 hover:bg-muted'
    }
    if (letra === MOCK_QUESTAO.gabarito) return 'border-success-500 bg-success-50 dark:bg-success-900/20'
    if (letra === selecionada && letra !== MOCK_QUESTAO.gabarito) return 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
    return 'border-border opacity-60'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Banco de Questões</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Questão 1 de 30 da sessão de hoje</p>
        </div>
        <button className="btn-outline btn-sm">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </button>
      </div>

      {/* Questão metadata */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="badge-blue">{MOCK_QUESTAO.banca}</span>
        <span className="badge-purple">{MOCK_QUESTAO.orgao} {MOCK_QUESTAO.ano}</span>
        <span className="badge-yellow">{MOCK_QUESTAO.materia}</span>
        <span className="badge py-0.5 px-2 bg-muted text-muted-foreground">{MOCK_QUESTAO.topico}</span>
        <span className={cn('badge', MOCK_QUESTAO.dificuldade === 'Fácil' ? 'badge-green' : MOCK_QUESTAO.dificuldade === 'Médio' ? 'badge-yellow' : 'badge-red')}>{MOCK_QUESTAO.dificuldade}</span>
      </div>

      {/* Progresso da sessão */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-[3.3%] bg-gradient-to-r from-brand-500 to-purple-500 rounded-full" />
      </div>

      {/* Enunciado */}
      <div className="card p-5">
        <div className="flex items-start gap-2 mb-4">
          <span className="badge-blue shrink-0">Q{MOCK_QUESTAO.numero}</span>
          <p className="text-foreground font-medium leading-relaxed">{MOCK_QUESTAO.enunciado}</p>
        </div>

        {/* Alternativas */}
        <div className="space-y-2.5">
          {MOCK_QUESTAO.alternativas.map(alt => (
            <button
              key={alt.letra}
              disabled={estado === 'gabarito'}
              onClick={() => estado === 'pendente' && setSelecionada(alt.letra)}
              className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left', corAlternativa(alt.letra))}
            >
              <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                estado === 'gabarito' && alt.letra === MOCK_QUESTAO.gabarito ? 'border-success-500 bg-success-500 text-white' :
                estado === 'gabarito' && alt.letra === selecionada && alt.letra !== MOCK_QUESTAO.gabarito ? 'border-danger-500 bg-danger-500 text-white' :
                selecionada === alt.letra ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground'
              )}>
                {estado === 'gabarito' && alt.letra === MOCK_QUESTAO.gabarito ? <CheckCircle2 className="w-4 h-4" /> :
                 estado === 'gabarito' && alt.letra === selecionada && alt.letra !== MOCK_QUESTAO.gabarito ? <XCircle className="w-4 h-4" /> :
                 alt.letra}
              </span>
              <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          {estado === 'pendente' ? (
            <button onClick={responder} disabled={!selecionada} className="btn-primary btn-md flex-1">
              Confirmar resposta
            </button>
          ) : (
            <>
              <button onClick={() => setMostrarExplicacao(v => !v)} className="btn-outline btn-md flex-1">
                <Brain className="w-4 h-4" />
                {mostrarExplicacao ? 'Ocultar' : 'Ver'} explicação da IA
              </button>
              <button onClick={proximaQuestao} className="btn-primary btn-md flex-1">
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Explicação */}
      {mostrarExplicacao && estado === 'gabarito' && (
        <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm text-foreground">Explicação do Mentor IA</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1 prose-strong:text-foreground text-muted-foreground">
            {MOCK_QUESTAO.explicacao.split('\n').map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
