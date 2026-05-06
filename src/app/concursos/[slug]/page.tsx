import Link from 'next/link'
import { CheckCircle2, Clock, Users, BookOpen, Target, ChevronRight } from 'lucide-react'

const CONCURSOS: Record<string, {
  name: string; icon: string; banca: string; vagas: string; salario: string
  materias: string[]; descricao: string; dicas: string[]
}> = {
  pmdf: {
    name: 'PMDF — Polícia Militar do DF', icon: '🛡️', banca: 'CESPE/CEBRASPE',
    vagas: '1.200+ vagas previstas', salario: 'R$ 7.500 a R$ 14.000/mês',
    descricao: 'Uma das maiores e mais respeitadas polícias militares do Brasil. O concurso é altamente concorrido, realizado pela CESPE/CEBRASPE, com questões do tipo certo ou errado.',
    materias: ['Direito Constitucional', 'Direito Penal', 'Direito Administrativo', 'Língua Portuguesa', 'Raciocínio Lógico', 'Conhecimentos Policiais'],
    dicas: ['Direito Constitucional representa ~25% da prova', 'CESPE penaliza: 1 errada elimina 1 certa', 'Conhecimentos Policiais é eliminatório'],
  },
  'policia-federal': {
    name: 'Polícia Federal — Agente', icon: '🔵', banca: 'CESPE/CEBRASPE',
    vagas: '1.500 vagas previstas', salario: 'R$ 12.522 a R$ 22.921/mês',
    descricao: 'A Polícia Federal é a principal polícia investigativa do Brasil. Carreira federal de altíssimo prestígio, com subsídios excepcionais e possibilidade de progressão.',
    materias: ['Direito Constitucional', 'Direito Penal', 'Direito Processual Penal', 'Direito Administrativo', 'Informática', 'Língua Portuguesa', 'Legislação Especial'],
    dicas: ['Prova com 120 questões (CESPE C/E)', 'Etapas: objetiva + discursiva + EAF + psicológico', 'Diploma de nível superior obrigatório'],
  },
  'banco-do-brasil': {
    name: 'Banco do Brasil — Escriturário', icon: '🏦', banca: 'CESGRANRIO',
    vagas: '4.000+ vagas previstas', salario: 'R$ 3.622 + benefícios + PLR',
    descricao: 'O maior banco público da América Latina. Concurso com grande quantidade de vagas, banca CESGRANRIO e excelente pacote de benefícios além do salário base.',
    materias: ['Matemática Financeira', 'Língua Portuguesa', 'Atualidades do Mercado Financeiro', 'Informática', 'Raciocínio Lógico', 'Conhecimentos Bancários'],
    dicas: ['CESGRANRIO não penaliza questões erradas', 'Conhecimentos Bancários é matéria eliminatória', 'Benefícios incluem plano de saúde, vale-refeição e PLR'],
  },
  tjdft: {
    name: 'TJDFT — Técnico Judiciário', icon: '⚖️', banca: 'CESPE/CEBRASPE',
    vagas: '300+ vagas previstas', salario: 'R$ 8.529 + benefícios',
    descricao: 'Tribunal de Justiça do Distrito Federal. Carreira estável no Poder Judiciário com excelentes benefícios, ambiente de trabalho tranquilo e ótimas condições.',
    materias: ['Direito Constitucional', 'Direito Administrativo', 'Direito Civil', 'Português', 'Raciocínio Lógico', 'Informática', 'Direito Processual Civil'],
    dicas: ['Prova com 120 questões CESPE', 'Direito Civil tem grande peso no TJDFT', 'Concurso muito disputado — meta de 75%+ de acerto'],
  },
  prf: {
    name: 'PRF — Policial Rodoviário Federal', icon: '🚔', banca: 'CESPE/CEBRASPE',
    vagas: '1.000+ vagas previstas', salario: 'R$ 11.870 a R$ 23.000/mês',
    descricao: 'A PRF fiscaliza e patrulha as rodovias federais. Uma das melhores remunerações entre as polícias, com carreira federal e benefícios excepcionais.',
    materias: ['Legislação de Trânsito (CTB)', 'Direito Constitucional', 'Direito Penal', 'Direito Administrativo', 'Língua Portuguesa', 'Raciocínio Lógico', 'Física', 'Geopolítica', 'Ética'],
    dicas: ['Legislação de Trânsito = 25% da prova (30 questões)', 'Prova com 120 questões certo/errado + redação', 'Exame de aptidão física obrigatório'],
  },
  cef: {
    name: 'Caixa Econômica Federal — Técnico', icon: '💛', banca: 'CESGRANRIO',
    vagas: '2.000+ vagas previstas', salario: 'R$ 3.762 + benefícios',
    descricao: 'A Caixa Econômica Federal é o maior banco de habitação do Brasil. Excelente pacote de benefícios, participação nos lucros e plano de carreira sólido.',
    materias: ['Matemática Financeira', 'Língua Portuguesa', 'Atualidades', 'Informática', 'Conhecimentos Bancários', 'Contabilidade Básica'],
    dicas: ['Banca CESGRANRIO — questões mais objetivas', 'Conhecimentos Bancários é fundamental', 'Benefícios complementam bem a remuneração'],
  },
  cbmdf: {
    name: 'CBMDF — Bombeiro Militar', icon: '🚒', banca: 'CESPE/CEBRASPE',
    vagas: '400+ vagas previstas', salario: 'R$ 6.500 a R$ 12.000/mês',
    descricao: 'O Corpo de Bombeiros Militar do DF é uma das carreiras mais admiradas. Combina serviço público com missão de salvar vidas, com boa remuneração e status.',
    materias: ['Direito Constitucional', 'Língua Portuguesa', 'Raciocínio Lógico', 'Atualidades', 'Conhecimentos sobre o CBMDF'],
    dicas: ['Teste de aptidão física muito exigente — comece já!', 'Prova objetiva + redação + TAF', 'Dedicação exclusiva após nomeação'],
  },
  cnu: {
    name: 'CNU — Concurso Nacional Unificado', icon: '🇧🇷', banca: 'CESPE/CEBRASPE',
    vagas: '6.640 vagas confirmadas', salario: 'R$ 4.100 a R$ 22.921/mês',
    descricao: 'O maior concurso da história do Brasil! Oportunidade de entrar no serviço federal em múltiplos órgãos com uma única prova. Vagas para todos os perfis.',
    materias: ['Língua Portuguesa', 'Realidade Brasileira', 'Tecnologia e Inovação', 'Desenvolvimento de Competências', 'Conhecimentos Específicos por Bloco'],
    dicas: ['8 blocos temáticos — escolha o que combina com você', 'Prova em etapa única para todos os órgãos', 'Blocos 1, 2 e 3 têm os melhores salários'],
  },
}

export default function ConcursoPage({ params }: { params: { slug: string } }) {
  const concurso = CONCURSOS[params.slug]

  if (!concurso) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h1 className="text-2xl font-black text-foreground">Concurso em breve</h1>
          <p className="text-muted-foreground">Estamos preparando o conteúdo para este concurso.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-brand-600 hover:underline">← Voltar ao início</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-6 inline-block">← Voltar</Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{concurso.icon}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">{concurso.name}</h1>
              <p className="text-white/80 mt-1">Banca: {concurso.banca}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Users, label: 'Vagas previstas', value: concurso.vagas },
              { icon: Clock, label: 'Remuneração', value: concurso.salario },
              { icon: Target, label: 'Banca', value: concurso.banca },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className="w-4 h-4 mb-2 text-white/70" />
                <div className="text-xs text-white/70">{label}</div>
                <div className="font-bold text-sm mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* Descrição */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground mb-3">Sobre o concurso</h2>
          <p className="text-muted-foreground leading-relaxed">{concurso.descricao}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Matérias */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-500" /> Matérias cobradas
            </h2>
            <ul className="space-y-2">
              {concurso.materias.map(m => (
                <li key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Dicas */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-warning-500" /> Dicas importantes
            </h2>
            <ul className="space-y-3">
              {concurso.dicas.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-warning-100 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Por que GabaritAI */}
        <div className="rounded-2xl border border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 p-6">
          <h2 className="font-bold text-foreground mb-4">Por que usar o GabaritAI para o {concurso.name.split('—')[0].trim()}?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              `Questões específicas da banca ${concurso.banca}`,
              'Mentor IA disponível 24h para tirar dúvidas',
              'Cronograma personalizado para sua rotina',
              'Simulados no estilo exato da sua prova',
              'Flashcards com todas as matérias do edital',
              'Resumos inteligentes de artigos e legislação',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black text-foreground">Pronto para começar?</h2>
          <p className="text-muted-foreground">7 dias grátis, sem cartão de crédito. Comece a estudar agora.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/registro" className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              Começar grátis <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/#planos" className="inline-flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-semibold px-8 py-3 rounded-xl transition-colors">
              Ver planos e preços
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
