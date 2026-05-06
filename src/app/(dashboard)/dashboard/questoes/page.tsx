'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, ChevronRight, Filter, Brain, X, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { CURSOS_DISPONIVEIS } from '@/lib/demo-users'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

type Questao = {
  id: number; banca: string; ano: number; orgao: string; cursoId: string
  materia: string; topico: string; dificuldade: string; enunciado: string
  alternativas: { letra: string; texto: string }[]
  gabarito: string; explicacao: string
}

const BANCO: Questao[] = [
  {
    id: 1, banca: 'CESPE/CEBRASPE', ano: 2023, orgao: 'PMDF', cursoId: 'pmdf-soldado',
    materia: 'Direito Constitucional', topico: 'Direitos Fundamentais', dificuldade: 'Médio',
    enunciado: 'Acerca dos direitos e garantias fundamentais previstos na Constituição Federal de 1988, assinale a opção correta.',
    alternativas: [
      { letra: 'A', texto: 'A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.' },
      { letra: 'B', texto: 'É livre a manifestação do pensamento, sendo vedado o anonimato somente em matéria eleitoral.' },
      { letra: 'C', texto: 'A inviolabilidade do sigilo das comunicações telefônicas pode ser afastada mediante autorização do Ministério Público.' },
      { letra: 'D', texto: 'O direito de propriedade é absoluto e não admite restrições.' },
      { letra: 'E', texto: 'Todo o poder emana do povo, exercido somente por representantes eleitos.' },
    ],
    gabarito: 'A',
    explicacao: 'O art. 5º, XI, CF/88 estabelece exatamente essa disposição. **B** é errada pois o anonimato é vedado em toda manifestação. **C** é errada pois exige autorização judicial, não do MP. **D** é errada pois o direito de propriedade não é absoluto. **E** é errada pois o poder também pode ser exercido diretamente.',
  },
  {
    id: 2, banca: 'CESPE/CEBRASPE', ano: 2022, orgao: 'PF', cursoId: 'pf-agente',
    materia: 'Direito Penal', topico: 'Crimes contra a Pessoa', dificuldade: 'Difícil',
    enunciado: 'Acerca dos crimes contra a pessoa no Código Penal Brasileiro, julgue o item.',
    alternativas: [
      { letra: 'A', texto: 'O homicídio privilegiado e o qualificado são absolutamente incompatíveis entre si, nunca podendo coexistir no mesmo fato.' },
      { letra: 'B', texto: 'É possível o homicídio privilegiado-qualificado, quando a qualificadora for de natureza objetiva.' },
      { letra: 'C', texto: 'As qualificadoras do homicídio são todas de natureza subjetiva, referindo-se ao estado mental do agente.' },
      { letra: 'D', texto: 'O motivo torpe e o relevante valor moral são compatíveis entre si.' },
      { letra: 'E', texto: 'A premeditação é sempre circunstância qualificadora do homicídio.' },
    ],
    gabarito: 'B',
    explicacao: 'O STF e STJ admitem o homicídio privilegiado-qualificado quando a qualificadora for de natureza objetiva (modo de execução: veneno, fogo, emboscada, etc.) e o privilégio for de natureza subjetiva (relevante valor moral, domínio de emoção). **A** é falsa pois há compatibilidade quando qualificadoras são objetivas. **C** é falsa pois há qualificadoras objetivas. **D** é falsa pois são incompatíveis. **E** é falsa pois premeditação não é qualificadora expressa.',
  },
  {
    id: 3, banca: 'CESPE/CEBRASPE', ano: 2023, orgao: 'PRF', cursoId: 'prf-policial',
    materia: 'Legislação de Trânsito', topico: 'CTB — Infração e Penalidades', dificuldade: 'Fácil',
    enunciado: 'Conforme o Código de Trânsito Brasileiro, a penalidade de suspensão do direito de dirigir aplica-se ao infrator que:',
    alternativas: [
      { letra: 'A', texto: 'Cometer a primeira infração gravíssima.' },
      { letra: 'B', texto: 'Atingir 20 pontos na CNH em 12 meses.' },
      { letra: 'C', texto: 'Cometer qualquer infração grave.' },
      { letra: 'D', texto: 'Recusar-se ao teste do bafômetro.' },
      { letra: 'E', texto: 'Estacionar em local proibido.' },
    ],
    gabarito: 'B',
    explicacao: 'O art. 261 do CTB estabelece que a suspensão ocorre quando o infrator atingir **20 pontos** no período de 12 meses. A partir de 2023, motoristas profissionais têm limite de 40 pontos. A recusa ao bafômetro (letra D) gera a penalidade mas é tratada como infração gravíssima separada.',
  },
  {
    id: 4, banca: 'FCC', ano: 2022, orgao: 'BB', cursoId: 'bb-escriturario',
    materia: 'Matemática Financeira', topico: 'Juros Compostos', dificuldade: 'Médio',
    enunciado: 'Um capital de R$ 10.000,00 é aplicado a juros compostos de 2% ao mês. Qual será o montante após 3 meses?',
    alternativas: [
      { letra: 'A', texto: 'R$ 10.600,00' },
      { letra: 'B', texto: 'R$ 10.612,08' },
      { letra: 'C', texto: 'R$ 10.604,00' },
      { letra: 'D', texto: 'R$ 10.800,00' },
      { letra: 'E', texto: 'R$ 10.606,04' },
    ],
    gabarito: 'B',
    explicacao: 'Usando a fórmula M = C × (1 + i)^n: M = 10.000 × (1,02)³ = 10.000 × 1,061208 = **R$ 10.612,08**. Note que juros compostos diferem dos simples (que dariam R$ 10.600): a cada período, o juro incide sobre o montante acumulado, não apenas sobre o capital inicial.',
  },
  {
    id: 5, banca: 'CESPE/CEBRASPE', ano: 2023, orgao: 'TJDFT', cursoId: 'tjdft-tecnico',
    materia: 'Direito Administrativo', topico: 'Princípios da Administração Pública', dificuldade: 'Fácil',
    enunciado: 'Acerca dos princípios da administração pública, é correto afirmar que:',
    alternativas: [
      { letra: 'A', texto: 'O princípio da legalidade permite à Administração fazer tudo que a lei não proíbe.' },
      { letra: 'B', texto: 'O princípio da impessoalidade proíbe a Administração de favorecer ou prejudicar pessoas por critérios subjetivos.' },
      { letra: 'C', texto: 'O princípio da publicidade permite que atos administrativos sejam mantidos em sigilo permanente.' },
      { letra: 'D', texto: 'O princípio da eficiência é meramente programático e não vincula a Administração.' },
      { letra: 'E', texto: 'O princípio da moralidade se confunde com o da legalidade.' },
    ],
    gabarito: 'B',
    explicacao: 'O **princípio da impessoalidade** veda favoritismos e perseguições. A Administração deve tratar todos os administrados com isonomia. **A** é errada: o princípio da legalidade para a Adm. Pública significa fazer SOMENTE o que a lei autoriza (diferente dos particulares). **C** é errada: publicidade é a regra, sigilo é exceção. **D** é errada: eficiência é norma jurídica vinculante. **E** é errada: são princípios distintos.',
  },
  {
    id: 6, banca: 'CESPE/CEBRASPE', ano: 2022, orgao: 'CBMDF', cursoId: 'cbmdf-soldado',
    materia: 'Conhecimentos Gerais', topico: 'Atividade Bombeiro Militar', dificuldade: 'Fácil',
    enunciado: 'Quanto às atribuições do Corpo de Bombeiros Militar do DF, assinale a opção correta:',
    alternativas: [
      { letra: 'A', texto: 'O CBMDF tem competência exclusiva para investigar incêndios criminosos.' },
      { letra: 'B', texto: 'A prevenção e combate a incêndios, busca e salvamento fazem parte das atribuições do CBMDF.' },
      { letra: 'C', texto: 'O CBMDF é subordinado à Polícia Militar do Distrito Federal.' },
      { letra: 'D', texto: 'A Defesa Civil não integra as atribuições do CBMDF.' },
      { letra: 'E', texto: 'O CBMDF só atua em edificações, não em acidentes de trânsito.' },
    ],
    gabarito: 'B',
    explicacao: 'As atribuições do CBMDF incluem: prevenção e combate a incêndios, busca e salvamento aquático e terrestre, atendimento pré-hospitalar, Defesa Civil e perícia de incêndio. **A** é errada: investigação criminal é atribuição da Polícia Civil. **C** é errada: o CBMDF tem autonomia própria. **D** é errada: Defesa Civil é atribuição do CBMDF. **E** é errada: atua em acidentes de trânsito.',
  },
  {
    id: 7, banca: 'CESGRANRIO', ano: 2023, orgao: 'CEF', cursoId: 'cef-tecnico',
    materia: 'Atualidades do Mercado Financeiro', topico: 'Produtos Bancários', dificuldade: 'Médio',
    enunciado: 'O Certificado de Depósito Bancário (CDB) é um título de renda fixa emitido pelos bancos. Acerca do CDB, é INCORRETO afirmar que:',
    alternativas: [
      { letra: 'A', texto: 'O rendimento pode ser prefixado ou pós-fixado.' },
      { letra: 'B', texto: 'Possui cobertura do FGC até R$ 250.000,00 por CPF por instituição.' },
      { letra: 'C', texto: 'O prazo mínimo é de 30 dias para CDB prefixado.' },
      { letra: 'D', texto: 'É isento de Imposto de Renda para pessoas físicas.' },
      { letra: 'E', texto: 'Pode ser negociado antes do vencimento no mercado secundário.' },
    ],
    gabarito: 'D',
    explicacao: 'O CDB **NÃO é isento de IR** — esta afirmativa é incorreta (é a resposta). O IR incide de forma regressiva: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720, e 15% acima de 720 dias. As demais alternativas estão corretas: o CDB tem cobertura do FGC, pode ser pré ou pós-fixado, tem prazo mínimo de 30 dias e pode ser negociado no mercado secundário.',
  },
  {
    id: 8, banca: 'CESPE/CEBRASPE', ano: 2024, orgao: 'CNU', cursoId: 'cnu-bloco1',
    materia: 'Língua Portuguesa', topico: 'Compreensão e Interpretação de Texto', dificuldade: 'Médio',
    enunciado: 'Leia o fragmento: "A resiliência organizacional não é apenas a capacidade de resistir a crises, mas de se transformar por meio delas." O termo "resiliência" no contexto refere-se a:',
    alternativas: [
      { letra: 'A', texto: 'A resistência passiva diante de adversidades.' },
      { letra: 'B', texto: 'A capacidade de se adaptar e se fortalecer mediante desafios.' },
      { letra: 'C', texto: 'A imunidade total a crises organizacionais.' },
      { letra: 'D', texto: 'O retorno ao estado original após uma crise.' },
      { letra: 'E', texto: 'A prevenção de situações adversas por meio de planejamento.' },
    ],
    gabarito: 'B',
    explicacao: 'No contexto do fragmento, "resiliência" vai além da mera resistência passiva (letra A) ou do simples retorno ao estado original (letra D). O texto enfatiza a **transformação** — portanto, a resposta é B: adaptação e fortalecimento diante dos desafios. A letra D (retorno ao estado original) seria o conceito mais básico/físico de resiliência, mas o contexto indica evolução, não mera recuperação.',
  },
  {
    id: 9, banca: 'CESPE/CEBRASPE', ano: 2023, orgao: 'PMDF', cursoId: 'pmdf-soldado',
    materia: 'Direito Penal', topico: 'Teoria do Crime', dificuldade: 'Difícil',
    enunciado: 'Sobre a teoria da imputação objetiva no Direito Penal, assinale a opção correta:',
    alternativas: [
      { letra: 'A', texto: 'A imputação objetiva dispensa completamente a análise do nexo causal.' },
      { letra: 'B', texto: 'O risco permitido exclui a imputação objetiva, mesmo que o resultado ocorra.' },
      { letra: 'C', texto: 'O princípio do risco proibido é irrelevante para a teoria da imputação objetiva.' },
      { letra: 'D', texto: 'A imputação objetiva aplica-se apenas aos crimes dolosos.' },
      { letra: 'E', texto: 'Qualquer nexo de causalidade é suficiente para a imputação objetiva.' },
    ],
    gabarito: 'B',
    explicacao: 'A teoria da imputação objetiva (Roxin) acrescenta ao nexo causal físico um nexo normativo. Segundo ela, **o risco permitido exclui a imputação**: se o agente age dentro dos riscos permitidos pela sociedade, mesmo que o resultado ocorra, não há imputação. Ex: quem dirige respeitando todas as normas não responde por acidente. **A** é errada: a imputação objetiva pressupõe, não dispensa, o nexo causal. **D** é errada: aplica-se também a crimes culposos.',
  },
  {
    id: 10, banca: 'FGV', ano: 2023, orgao: 'TJDFT', cursoId: 'tjdft-analista',
    materia: 'Direito Processual Civil', topico: 'Recursos', dificuldade: 'Difícil',
    enunciado: 'Sobre os recursos no Código de Processo Civil de 2015, é correto afirmar que:',
    alternativas: [
      { letra: 'A', texto: 'O recurso de agravo de instrumento é cabível contra todas as decisões interlocutórias.' },
      { letra: 'B', texto: 'O princípio da singularidade recursal impede a interposição de dois recursos diferentes contra a mesma decisão.' },
      { letra: 'C', texto: 'A apelação suspende sempre os efeitos da sentença, sem exceção.' },
      { letra: 'D', texto: 'O prazo para interposição de recursos é sempre de 15 dias.' },
      { letra: 'E', texto: 'O recurso especial é julgado pelo STF.' },
    ],
    gabarito: 'B',
    explicacao: 'O **princípio da singularidade (unirrecorribilidade)** determina que para cada decisão cabe apenas um tipo de recurso. **A** é errada: o agravo de instrumento só cabe nas hipóteses taxativas do art. 1.015 do CPC. **C** é errada: há exceções ao efeito suspensivo (art. 1.012 CPC). **D** é errada: o embargo de declaração tem prazo de 5 dias. **E** é errada: o REsp é julgado pelo STJ; o STF julga o Recurso Extraordinário.',
  },
  {
    id: 11, banca: 'CESPE/CEBRASPE', ano: 2022, orgao: 'PF', cursoId: 'pf-agente',
    materia: 'Informática', topico: 'Segurança da Informação', dificuldade: 'Médio',
    enunciado: 'Acerca de segurança da informação e proteção de dados, julgue a assertiva: "O protocolo HTTPS garante confidencialidade, integridade e autenticidade na comunicação, sendo suficiente por si só para garantir a segurança total de um sistema."',
    alternativas: [
      { letra: 'A', texto: 'A assertiva está completamente correta.' },
      { letra: 'B', texto: 'A assertiva está correta apenas quanto à confidencialidade.' },
      { letra: 'C', texto: 'A assertiva está errada pois HTTPS não garante autenticidade.' },
      { letra: 'D', texto: 'A assertiva está errada pois HTTPS, apesar de garantir confidencialidade, integridade e autenticidade, não é suficiente por si só para a segurança total.' },
      { letra: 'E', texto: 'HTTPS não garante qualquer tipo de segurança.' },
    ],
    gabarito: 'D',
    explicacao: 'O HTTPS (HTTP + TLS/SSL) **SIM garante** confidencialidade (criptografia), integridade (hash) e autenticidade (certificados digitais). No entanto, ele **NÃO é suficiente sozinho** para a segurança total do sistema — são necessários outros controles: firewall, controle de acesso, patches de segurança, prevenção de SQL Injection, XSS, etc. A segurança é um conjunto de camadas.',
  },
  {
    id: 12, banca: 'VUNESP', ano: 2023, orgao: 'BB', cursoId: 'bb-escriturario',
    materia: 'Português', topico: 'Concordância Verbal', dificuldade: 'Fácil',
    enunciado: 'Assinale a alternativa em que a concordância verbal está CORRETA:',
    alternativas: [
      { letra: 'A', texto: 'Fazem dez anos que ele partiu.' },
      { letra: 'B', texto: 'Haviam muitos candidatos na fila.' },
      { letra: 'C', texto: 'Mais de um aluno faltou à prova.' },
      { letra: 'D', texto: 'A maioria dos alunos chegaram cedo.' },
      { letra: 'E', texto: 'Faz anos que nos conhecemos, portanto nos conhecemos bastantes.' },
    ],
    gabarito: 'C',
    explicacao: 'Em "Mais de um aluno faltou", o verbo fica no singular quando a expressão "mais de um" aparece isolada — regra de concordância atrativa. **A** é errada: verbos que indicam fenômenos (fazer, ser, estar) são impessoais — correto: "Faz dez anos". **B** é errada: "haver" no sentido de existir é impessoal — correto: "Havia muitos candidatos". **D** é errada: com "a maioria de + plural", o verbo pode ir para o plural ou singular; mas "chegaram" com "a maioria" sem complemento está errado — seria "A maioria chegou".',
  },
]

type Estado = 'pendente' | 'respondida' | 'gabarito'

const BANCAS = ['Todas', 'CESPE/CEBRASPE', 'FCC', 'FGV', 'VUNESP', 'CESGRANRIO']
const MATERIAS = ['Todas', 'Direito Constitucional', 'Direito Penal', 'Direito Administrativo', 'Direito Processual Civil', 'Legislação de Trânsito', 'Matemática Financeira', 'Informática', 'Atualidades do Mercado Financeiro', 'Língua Portuguesa', 'Português', 'Conhecimentos Gerais']
const DIFICULDADES = ['Todas', 'Fácil', 'Médio', 'Difícil']
const ANOS = ['Todos', '2024', '2023', '2022']

export default function QuestoesPage() {
  const user = useAuthStore(s => s.user)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [estado, setEstado] = useState<Estado>('pendente')
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [idxAtual, setIdxAtual] = useState(0)
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false)
  const [loadingIA, setLoadingIA] = useState(false)
  const [respostaIA, setRespostaIA] = useState('')
  const [respondidas, setRespondidas] = useState<{ id: number; certo: boolean }[]>([])

  // Filtros
  const [filtBanca, setFiltBanca] = useState('Todas')
  const [filtMateria, setFiltMateria] = useState('Todas')
  const [filtDific, setFiltDific] = useState('Todas')
  const [filtAno, setFiltAno] = useState('Todos')
  const [filtCurso, setFiltCurso] = useState('Todos')

  // Cursos disponíveis para o usuário
  const userCursoIds: string[] = user?.courses === 'all'
    ? CURSOS_DISPONIVEIS.map(c => c.id)
    : Array.isArray(user?.courses) ? (user.courses as string[]) : []

  const questoesFiltradas = useMemo(() => {
    return BANCO.filter(q => {
      if (filtBanca !== 'Todas' && q.banca !== filtBanca) return false
      if (filtMateria !== 'Todas' && q.materia !== filtMateria) return false
      if (filtDific !== 'Todas' && q.dificuldade !== filtDific) return false
      if (filtAno !== 'Todos' && q.ano.toString() !== filtAno) return false
      if (filtCurso !== 'Todos' && q.cursoId !== filtCurso) return false
      return true
    })
  }, [filtBanca, filtMateria, filtDific, filtAno, filtCurso])

  const questao = questoesFiltradas[idxAtual % Math.max(questoesFiltradas.length, 1)]

  function aplicarFiltros() {
    setMostrarFiltros(false)
    setIdxAtual(0)
    setEstado('pendente')
    setSelecionada(null)
    setMostrarExplicacao(false)
    setRespostaIA('')
  }

  function limparFiltros() {
    setFiltBanca('Todas'); setFiltMateria('Todas'); setFiltDific('Todas')
    setFiltAno('Todos'); setFiltCurso('Todos')
  }

  function responder() {
    if (!selecionada) return
    setEstado('respondida')
    setTimeout(() => {
      setEstado('gabarito')
      setRespondidas(r => [...r, { id: questao.id, certo: selecionada === questao.gabarito }])
    }, 500)
  }

  function proximaQuestao() {
    setEstado('pendente'); setSelecionada(null)
    setMostrarExplicacao(false); setRespostaIA('')
    setIdxAtual(i => (i + 1) % Math.max(questoesFiltradas.length, 1))
  }

  async function pedirExplicacaoIA() {
    if (respostaIA) { setMostrarExplicacao(v => !v); return }
    setMostrarExplicacao(true)
    setLoadingIA(true)
    try {
      const prompt = `Explique de forma clara e didática a seguinte questão de concurso público (${questao.banca} ${questao.ano}):

Enunciado: ${questao.enunciado}

Alternativas:
${questao.alternativas.map(a => `${a.letra}) ${a.texto}`).join('\n')}

Gabarito: Letra ${questao.gabarito}

Matéria: ${questao.materia} | Tópico: ${questao.topico}

Por favor:
1. Explique por que a alternativa ${questao.gabarito} está correta
2. Explique por que as outras alternativas estão erradas
3. Dê uma dica para não esquecer esse conteúdo na prova`

      const res = await api.post('/ai/chat', {
        message: prompt,
        history: []
      })
      setRespostaIA(res.data.response)
    } catch {
      setRespostaIA(questao.explicacao)
    } finally {
      setLoadingIA(false)
    }
  }

  const corAlternativa = (letra: string) => {
    if (estado !== 'gabarito') {
      return selecionada === letra ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-border hover:border-brand-300 hover:bg-muted'
    }
    if (letra === questao.gabarito) return 'border-success-500 bg-success-50 dark:bg-success-900/20'
    if (letra === selecionada && letra !== questao.gabarito) return 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
    return 'border-border opacity-60'
  }

  const acertos = respondidas.filter(r => r.certo).length
  const taxa = respondidas.length > 0 ? Math.round((acertos / respondidas.length) * 100) : 0
  const filtrosAtivos = filtBanca !== 'Todas' || filtMateria !== 'Todas' || filtDific !== 'Todas' || filtAno !== 'Todos' || filtCurso !== 'Todos'

  // suppress unused warning — toast is available for future use
  void toast

  if (!questao) return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <p className="text-muted-foreground">Nenhuma questão encontrada com os filtros selecionados.</p>
      <button onClick={limparFiltros} className="btn-primary btn-md mt-4">Limpar filtros</button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Banco de Questões</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {questoesFiltradas.length} questões • {respondidas.length} respondidas • {taxa}% acerto
          </p>
        </div>
        <button
          onClick={() => setMostrarFiltros(v => !v)}
          className={cn('btn-outline btn-sm', filtrosAtivos && 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-900/20')}
        >
          <Filter className="w-3.5 h-3.5" /> Filtros {filtrosAtivos && '●'}
        </button>
      </div>

      {/* Painel de filtros */}
      {mostrarFiltros && (
        <div className="card p-5 space-y-4 border-brand-200 dark:border-brand-800/40 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Filtrar questões</h3>
            <button onClick={() => setMostrarFiltros(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Banca</label>
              <select className="input" value={filtBanca} onChange={e => setFiltBanca(e.target.value)}>
                {BANCAS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Matéria</label>
              <select className="input" value={filtMateria} onChange={e => setFiltMateria(e.target.value)}>
                {MATERIAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dificuldade</label>
              <select className="input" value={filtDific} onChange={e => setFiltDific(e.target.value)}>
                {DIFICULDADES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ano</label>
              <select className="input" value={filtAno} onChange={e => setFiltAno(e.target.value)}>
                {ANOS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            {userCursoIds.length > 1 && (
              <div className="sm:col-span-2">
                <label className="label">Curso</label>
                <select className="input" value={filtCurso} onChange={e => setFiltCurso(e.target.value)}>
                  <option value="Todos">Todos os cursos</option>
                  {CURSOS_DISPONIVEIS.filter(c => userCursoIds.includes(c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={aplicarFiltros} className="btn-primary btn-md flex-1">
              Aplicar filtros ({questoesFiltradas.length} questões)
            </button>
            <button onClick={limparFiltros} className="btn-ghost btn-md">
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Questão metadata */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="badge-blue">{questao.banca}</span>
        <span className="badge-purple">{questao.orgao} {questao.ano}</span>
        <span className="badge-yellow">{questao.materia}</span>
        <span className="badge py-0.5 px-2 bg-muted text-muted-foreground">{questao.topico}</span>
        <span className={cn('badge', questao.dificuldade === 'Fácil' ? 'badge-green' : questao.dificuldade === 'Médio' ? 'badge-yellow' : 'badge-red')}>{questao.dificuldade}</span>
      </div>

      {/* Progresso da sessão */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${Math.max((idxAtual / Math.max(questoesFiltradas.length - 1, 1)) * 100, 3)}%` }} />
      </div>

      {/* Enunciado + Alternativas */}
      <div className="card p-5">
        <div className="flex items-start gap-2 mb-4">
          <span className="badge-blue shrink-0">Q{(idxAtual % questoesFiltradas.length) + 1}</span>
          <p className="text-foreground font-medium leading-relaxed">{questao.enunciado}</p>
        </div>

        <div className="space-y-2.5">
          {questao.alternativas.map(alt => (
            <button
              key={alt.letra}
              disabled={estado === 'gabarito'}
              onClick={() => estado === 'pendente' && setSelecionada(alt.letra)}
              className={cn('w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left', corAlternativa(alt.letra))}
            >
              <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0',
                estado === 'gabarito' && alt.letra === questao.gabarito ? 'border-success-500 bg-success-500 text-white' :
                estado === 'gabarito' && alt.letra === selecionada && alt.letra !== questao.gabarito ? 'border-danger-500 bg-danger-500 text-white' :
                selecionada === alt.letra ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted-foreground'
              )}>
                {estado === 'gabarito' && alt.letra === questao.gabarito ? <CheckCircle2 className="w-4 h-4" /> :
                 estado === 'gabarito' && alt.letra === selecionada && alt.letra !== questao.gabarito ? <XCircle className="w-4 h-4" /> :
                 alt.letra}
              </span>
              <span className="text-sm text-foreground leading-relaxed pt-0.5">{alt.texto}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-3 flex-wrap">
          {estado === 'pendente' ? (
            <button onClick={responder} disabled={!selecionada} className="btn-primary btn-md flex-1">
              Confirmar resposta
            </button>
          ) : (
            <>
              <button onClick={pedirExplicacaoIA} className="btn-outline btn-md flex-1">
                {loadingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {mostrarExplicacao ? 'Ocultar' : 'Explicação'} IA
              </button>
              <button onClick={proximaQuestao} className="btn-primary btn-md flex-1">
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Explicação da IA */}
      {mostrarExplicacao && estado === 'gabarito' && (
        <div className="card p-5 border-brand-200 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-900/10 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm text-foreground">Explicação do Mentor IA</span>
          </div>
          {loadingIA ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-sm text-muted-foreground">Gerando explicação...</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-strong:text-foreground text-muted-foreground">
              <ReactMarkdown>{respostaIA || questao.explicacao}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
