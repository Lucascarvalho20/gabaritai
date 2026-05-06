// Dados reais por concurso — matérias, formato de simulado, edital

export interface Materia {
  id: string
  nome: string
  topicos: string[]
}

export interface SimuladoFormat {
  totalQuestoes: number
  tempoMinutos: number
  banca: string
  tipo: 'certo_errado' | 'multipla_escolha'
  cancelamento: boolean
  temRedacao: boolean
  alternativas?: number
  notaCorteEstimada?: number
}

export interface CursoData {
  id: string
  label: string
  icon: string
  orgao: string
  cargo: string
  banca: string
  cor: string
  materias: Materia[]
  simuladoFormat: SimuladoFormat
  descricao: string
}

const CURSOS_DATA: Record<string, CursoData> = {
  'pmdf-soldado': {
    id: 'pmdf-soldado',
    label: 'PMDF — Soldado PM',
    icon: '🛡️',
    orgao: 'Polícia Militar do Distrito Federal',
    cargo: 'Soldado Policial Militar (QPPMC)',
    banca: 'Instituto AOCP',
    cor: '#2563eb',
    descricao: 'Concurso para Soldado PM do DF — nível superior, 80 questões + redação.',
    simuladoFormat: {
      totalQuestoes: 80,
      tempoMinutos: 300,
      banca: 'Instituto AOCP',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: true,
      alternativas: 5,
      notaCorteEstimada: 50,
    },
    materias: [
      {
        id: 'portugues', nome: 'Língua Portuguesa',
        topicos: ['Interpretação de texto', 'Gramática', 'Ortografia', 'Pontuação', 'Concordância', 'Regência', 'Coesão e coerência', 'Vícios de linguagem', 'Figuras de linguagem'],
      },
      {
        id: 'ingles', nome: 'Língua Inglesa',
        topicos: ['Reading comprehension', 'Grammar', 'Vocabulary', 'False cognates'],
      },
      {
        id: 'matematica', nome: 'Matemática e Raciocínio Lógico',
        topicos: ['Porcentagem', 'Regra de três', 'Probabilidade', 'Geometria', 'Lógica proposicional', 'Conjuntos', 'Sequências'],
      },
      {
        id: 'atualidades', nome: 'Atualidades',
        topicos: ['Política nacional', 'Meio ambiente DF/Ride-DF', 'Economia', 'Segurança pública', 'DF e entorno'],
      },
      {
        id: 'leg-pmdf', nome: 'Legislação PMDF',
        topicos: ['Lei 6.450/1977', 'Lei 12.086/2009', 'Lei 7.289/1984 (Estatuto)', 'Decreto 41.167/2020', 'R-200 (Dec. 88.777/1983)', 'Lei Orgânica DF'],
      },
      {
        id: 'dir-const', nome: 'Noções de Direito Constitucional e Direitos Humanos',
        topicos: ['Direitos fundamentais', 'Estado de defesa e sítio', 'Segurança pública na CF/88', 'Convenção contra Tortura', 'Pacto de São José', 'Remédios constitucionais', 'Direitos políticos'],
      },
      {
        id: 'dir-adm', nome: 'Noções de Direito Administrativo',
        topicos: ['Administração pública', 'Atos administrativos', 'Licitação (Lei 14.133/2021)', 'Bens públicos', 'Processo administrativo (Lei 9.784/1999)', 'Improbidade administrativa'],
      },
      {
        id: 'dir-penal', nome: 'Noções de Direito Penal',
        topicos: ['Princípios do Direito Penal', 'Iter criminis', 'Excludentes', 'Concurso de crimes', 'Crimes hediondos', 'Lei de tortura', 'Lei de abuso de autoridade'],
      },
      {
        id: 'dir-proc-penal', nome: 'Noções de Direito Processual Penal',
        topicos: ['Inquérito policial', 'Prisão em flagrante', 'Lei Maria da Penha', 'Interceptação telefônica', 'Juizados Especiais'],
      },
      {
        id: 'dir-penal-mil', nome: 'Noções de Direito Penal Militar',
        topicos: ['Crimes militares', 'Penas militares', 'Medidas de segurança', 'Conspiração e deserção', 'Estado de necessidade'],
      },
      {
        id: 'dir-proc-mil', nome: 'Noções de Direito Processual Penal Militar',
        topicos: ['Inquérito policial militar', 'Processo ordinário militar', 'Recursos', 'Exceções'],
      },
      {
        id: 'criminologia', nome: 'Criminologia',
        topicos: ['Teorias criminológicas', 'Escola de Chicago', 'Cifras ocultas', 'Vitimologia', 'Lei Maria da Penha aplicada'],
      },
    ],
  },

  'pmdf-oficial': {
    id: 'pmdf-oficial',
    label: 'PMDF — Oficial PM',
    icon: '⭐',
    orgao: 'Polícia Militar do Distrito Federal',
    cargo: 'Oficial da Polícia Militar',
    banca: 'Instituto AOCP',
    cor: '#7c3aed',
    descricao: 'Concurso para Oficial PM do DF — nível superior.',
    simuladoFormat: {
      totalQuestoes: 100,
      tempoMinutos: 360,
      banca: 'Instituto AOCP',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: true,
      alternativas: 5,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação'] },
      { id: 'dir-const', nome: 'Direito Constitucional', topicos: ['CF/88', 'Direitos fundamentais'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Atos', 'Licitação', 'Contratos'] },
      { id: 'dir-penal', nome: 'Direito Penal', topicos: ['Código Penal', 'Crimes específicos'] },
      { id: 'dir-penal-mil', nome: 'Direito Penal Militar', topicos: ['CPM', 'Crimes militares'] },
      { id: 'leg-pmdf', nome: 'Legislação PMDF', topicos: ['Estatuto', 'Organização', 'Hierarquia'] },
      { id: 'lideranca', nome: 'Liderança e Gestão', topicos: ['Teorias de liderança', 'Gestão policial'] },
    ],
  },

  'pf-agente': {
    id: 'pf-agente',
    label: 'Polícia Federal — Agente',
    icon: '🔵',
    orgao: 'Departamento de Polícia Federal',
    cargo: 'Agente de Polícia Federal',
    banca: 'CEBRASPE',
    cor: '#1d4ed8',
    descricao: 'Concurso PF Agente — CEBRASPE, 120 questões em 3 blocos (certo/errado).',
    simuladoFormat: {
      totalQuestoes: 120,
      tempoMinutos: 480,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: false,
      notaCorteEstimada: 60,
    },
    materias: [
      {
        id: 'portugues', nome: 'Língua Portuguesa',
        topicos: ['Interpretação textual', 'Coesão referencial', 'Sintaxe', 'Semântica', 'Ortografia', 'Pontuação', 'Redação oficial (Manual da PR)'],
      },
      {
        id: 'dir-adm', nome: 'Noções de Direito Administrativo',
        topicos: ['Administração pública', 'Princípios', 'Atos administrativos', 'Licitação', 'Contratos', 'Servidores públicos', 'Processo administrativo'],
      },
      {
        id: 'dir-const', nome: 'Noções de Direito Constitucional',
        topicos: ['Direitos fundamentais', 'Organização do Estado', 'Segurança pública', 'Forma e sistema de governo', 'Poder Executivo', 'Poder Legislativo'],
      },
      {
        id: 'dir-penal', nome: 'Noções de Direito Penal',
        topicos: ['Teoria geral do crime', 'Inquérito policial', 'Crimes contra a pessoa', 'Tráfico de drogas (Lei 11.343)', 'Lei de tortura', 'Crimes hediondos'],
      },
      {
        id: 'dir-proc-penal', nome: 'Noções de Direito Processual Penal',
        topicos: ['Inquérito policial', 'Prisão em flagrante', 'Medidas cautelares', 'Prova', 'Sistema internacional de DH', 'Regras de Mandela'],
      },
      {
        id: 'informatica', nome: 'Informática / TI',
        topicos: ['Redes de computadores (OSI, TCP/IP, IPv6)', 'Segurança da informação', 'Banco de dados', 'Machine learning', 'Cloud computing', 'Python', 'Linux'],
      },
      {
        id: 'matematica', nome: 'Matemática e Estatística',
        topicos: ['Distribuição normal', 'Intervalo de confiança', 'Regressão linear', 'Probabilidade', 'Estatística descritiva'],
      },
      {
        id: 'logica', nome: 'Raciocínio Lógico e Argumentação',
        topicos: ['Proposições', 'Conectivos lógicos', 'Tabela verdade', 'Lógica de argumentação', 'Probabilidade combinatória'],
      },
      {
        id: 'contabilidade', nome: 'Contabilidade (Específico Agente)',
        topicos: ['Patrimônio', 'Atos e fatos administrativos', 'Escrituração contábil', 'Balanço patrimonial', 'DRE', 'CPC 00 (R2)', 'Depreciação'],
      },
      {
        id: 'legislacao', nome: 'Legislação Especial',
        topicos: ['Lei 14.967/2024 (Segurança privada)', 'Lei 13.445/2017 (Migração)', 'Lei 11.343/2006 (Drogas)', 'Lei 9.455/1997 (Tortura)', 'Lei 8.069/1990 (ECA)', 'Lei 10.826/2003 (Armas)', 'Lei 9.605/1998 (Ambiental)'],
      },
    ],
  },

  'pf-delegado': {
    id: 'pf-delegado',
    label: 'Polícia Federal — Delegado',
    icon: '🏅',
    orgao: 'Departamento de Polícia Federal',
    cargo: 'Delegado de Polícia Federal',
    banca: 'CEBRASPE',
    cor: '#1e3a8a',
    descricao: 'Concurso PF Delegado — CEBRASPE, nível superior, provas específicas de Direito.',
    simuladoFormat: {
      totalQuestoes: 120,
      tempoMinutos: 480,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: false,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação oficial'] },
      { id: 'dir-const', nome: 'Direito Constitucional', topicos: ['CF/88 completa', 'Controle de constitucionalidade', 'Direitos fundamentais'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Atos', 'Licitação', 'Responsabilidade civil do Estado'] },
      { id: 'dir-penal', nome: 'Direito Penal', topicos: ['Teoria geral', 'Crimes em espécie', 'Legislação penal especial'] },
      { id: 'dir-proc-penal', nome: 'Direito Processual Penal', topicos: ['Inquérito', 'Ação penal', 'Prova', 'Prisões'] },
      { id: 'dir-civil', nome: 'Direito Civil', topicos: ['Parte geral', 'Obrigações', 'Responsabilidade civil'] },
      { id: 'dir-tributario', nome: 'Direito Tributário', topicos: ['CTN', 'Impostos federais', 'Processo tributário'] },
    ],
  },

  'prf-policial': {
    id: 'prf-policial',
    label: 'PRF — Policial Rodoviário',
    icon: '🚔',
    orgao: 'Polícia Rodoviária Federal',
    cargo: 'Policial Rodoviário Federal',
    banca: 'CEBRASPE',
    cor: '#0369a1',
    descricao: 'Concurso PRF — CEBRASPE, 120 questões (certo/errado).',
    simuladoFormat: {
      totalQuestoes: 120,
      tempoMinutos: 480,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: false,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Coesão'] },
      { id: 'matematica', nome: 'Matemática e Raciocínio Lógico', topicos: ['Porcentagem', 'Progressões', 'Lógica', 'Estatística'] },
      { id: 'informatica', nome: 'Informática', topicos: ['Hardware e software', 'Redes', 'Segurança', 'Office'] },
      { id: 'dir-const', nome: 'Noções de Direito Constitucional', topicos: ['Direitos fundamentais', 'Segurança pública', 'CF/88'] },
      { id: 'dir-adm', nome: 'Noções de Direito Administrativo', topicos: ['Princípios', 'Atos', 'Servidores'] },
      { id: 'dir-penal', nome: 'Noções de Direito Penal', topicos: ['Teoria geral', 'Crimes em espécie'] },
      { id: 'dir-transito', nome: 'Legislação de Trânsito', topicos: ['CTB (Código de Trânsito Brasileiro)', 'Crimes de trânsito', 'Infrações', 'Licenciamento'] },
      { id: 'fisica', nome: 'Física (Mecânica / Cinemática)', topicos: ['Cinemática', 'Dinâmica', 'Energia', 'Hidrostática'] },
      { id: 'quimica', nome: 'Química (Ambiental)', topicos: ['Poluição', 'Reações químicas', 'Combustíveis'] },
      { id: 'primeiros-socorros', nome: 'Primeiros Socorros', topicos: ['RCP', 'Atendimento a acidentados', 'Imobilização'] },
    ],
  },

  'bb-escriturario': {
    id: 'bb-escriturario',
    label: 'Banco do Brasil — Escriturário',
    icon: '🏦',
    orgao: 'Banco do Brasil',
    cargo: 'Escriturário — Agente Comercial',
    banca: 'CESGRANRIO / FCC',
    cor: '#f59e0b',
    descricao: 'Concurso BB Escriturário — questões de múltipla escolha, foco em banco.',
    simuladoFormat: {
      totalQuestoes: 78,
      tempoMinutos: 210,
      banca: 'CESGRANRIO',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: false,
      alternativas: 5,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Vocabulário'] },
      { id: 'matematica', nome: 'Matemática Financeira', topicos: ['Juros simples e compostos', 'Desconto', 'Taxas equivalentes', 'Amortização'] },
      { id: 'atualidades-mercado', nome: 'Atualidades do Mercado Financeiro', topicos: ['Sistema financeiro nacional', 'BB produtos', 'Câmbio', 'Crédito'] },
      { id: 'conhecimentos-bancarios', nome: 'Conhecimentos Bancários', topicos: ['Produtos bancários', 'Mercado de capitais', 'Seguros', 'Previdência'] },
      { id: 'informatica', nome: 'Informática', topicos: ['Office', 'Internet', 'Segurança digital', 'Sistemas operacionais'] },
      { id: 'logica', nome: 'Raciocínio Lógico', topicos: ['Proposições', 'Tabela verdade', 'Analogias', 'Sequências'] },
      { id: 'ingles', nome: 'Inglês', topicos: ['Leitura e interpretação', 'Vocabulário financeiro'] },
    ],
  },

  'cef-tecnico': {
    id: 'cef-tecnico',
    label: 'Caixa Econômica — Técnico',
    icon: '💛',
    orgao: 'Caixa Econômica Federal',
    cargo: 'Técnico Bancário — Novo',
    banca: 'CESGRANRIO / FCC',
    cor: '#ca8a04',
    descricao: 'Concurso CEF — múltipla escolha, foco bancário e tecnologia.',
    simuladoFormat: {
      totalQuestoes: 70,
      tempoMinutos: 210,
      banca: 'CESGRANRIO',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: false,
      alternativas: 5,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação'] },
      { id: 'matematica', nome: 'Matemática Financeira', topicos: ['Juros', 'Desconto', 'Probabilidade'] },
      { id: 'conhecimentos-bancarios', nome: 'Conhecimentos Bancários', topicos: ['SFN', 'Crédito imobiliário', 'FGTS', 'Seguro habitacional'] },
      { id: 'informatica', nome: 'Noções de Informática', topicos: ['Office', 'Internet', 'Banco de dados básico'] },
      { id: 'logica', nome: 'Raciocínio Lógico e Quantitativo', topicos: ['Lógica', 'Análise combinatória', 'Estatística'] },
      { id: 'atualidades', nome: 'Atualidades', topicos: ['Economia brasileira', 'Mercado financeiro', 'Tecnologia'] },
    ],
  },

  'tjdft-tecnico': {
    id: 'tjdft-tecnico',
    label: 'TJDFT — Técnico Judiciário',
    icon: '⚖️',
    orgao: 'Tribunal de Justiça do DF e Territórios',
    cargo: 'Técnico Judiciário — Área Judiciária',
    banca: 'CESPE/CEBRASPE',
    cor: '#6d28d9',
    descricao: 'Concurso TJDFT Técnico — CEBRASPE, certo/errado.',
    simuladoFormat: {
      totalQuestoes: 90,
      tempoMinutos: 240,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: false,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Tipologia textual'] },
      { id: 'dir-const', nome: 'Noções de Direito Constitucional', topicos: ['Direitos fundamentais', 'Poder Judiciário', 'CF/88'] },
      { id: 'dir-adm', nome: 'Noções de Direito Administrativo', topicos: ['Atos administrativos', 'Servidores', 'Improbidade'] },
      { id: 'dir-proc-civil', nome: 'Noções de Direito Processual Civil', topicos: ['CPC/2015', 'Petição inicial', 'Recursos', 'Execução'] },
      { id: 'informatica', nome: 'Noções de Informática', topicos: ['Office', 'Sistemas', 'Redes'] },
      { id: 'logica', nome: 'Raciocínio Lógico', topicos: ['Lógica proposicional', 'Diagramas', 'Sequências'] },
      { id: 'leg-judiciaria', nome: 'Legislação Judiciária', topicos: ['Lei Orgânica da Magistratura', 'Regimento TJDFT', 'Estatuto dos Servidores'] },
    ],
  },

  'tjdft-analista': {
    id: 'tjdft-analista',
    label: 'TJDFT — Analista Judiciário',
    icon: '⚖️',
    orgao: 'Tribunal de Justiça do DF e Territórios',
    cargo: 'Analista Judiciário — Área Judiciária',
    banca: 'CESPE/CEBRASPE',
    cor: '#5b21b6',
    descricao: 'Concurso TJDFT Analista — CEBRASPE, nível superior.',
    simuladoFormat: {
      totalQuestoes: 120,
      tempoMinutos: 360,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: false,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação avançada', 'Gramática'] },
      { id: 'dir-const', nome: 'Direito Constitucional', topicos: ['CF/88 aprofundado', 'Jurisprudência STF'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Completo + jurisprudência'] },
      { id: 'dir-proc-civil', nome: 'Direito Processual Civil', topicos: ['CPC/2015 completo', 'Recursos', 'Cumprimento de sentença'] },
      { id: 'dir-civil', nome: 'Direito Civil', topicos: ['Parte geral', 'Obrigações', 'Contratos', 'Família'] },
      { id: 'leg-judiciaria', nome: 'Legislação Judiciária', topicos: ['LOMAN', 'Regimento interno', 'Estatuto'] },
      { id: 'logica', nome: 'Raciocínio Lógico', topicos: ['Lógica formal', 'Probabilidade', 'Análise de dados'] },
    ],
  },

  'cbmdf-soldado': {
    id: 'cbmdf-soldado',
    label: 'CBMDF — Soldado',
    icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do DF',
    cargo: 'Soldado Bombeiro Militar',
    banca: 'Instituto AOCP',
    cor: '#dc2626',
    descricao: 'Concurso CBMDF Soldado — múltipla escolha + redação + TAF.',
    simuladoFormat: {
      totalQuestoes: 80,
      tempoMinutos: 300,
      banca: 'Instituto AOCP',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: true,
      alternativas: 5,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação'] },
      { id: 'matematica', nome: 'Matemática e Raciocínio Lógico', topicos: ['Aritmética', 'Álgebra', 'Geometria', 'Lógica'] },
      { id: 'ingles', nome: 'Língua Inglesa', topicos: ['Leitura e interpretação'] },
      { id: 'dir-const', nome: 'Noções de Direito Constitucional', topicos: ['CF/88 — Segurança pública', 'Defesa civil'] },
      { id: 'leg-cbmdf', nome: 'Legislação CBMDF', topicos: ['Estatuto dos Bombeiros', 'Organização CBMDF', 'Ética profissional'] },
      { id: 'conhecimentos-bombeiro', nome: 'Conhecimentos de Bombeiro', topicos: ['Primeiros socorros', 'Combate a incêndio', 'Salvamento', 'Defesa civil'] },
      { id: 'atualidades', nome: 'Atualidades', topicos: ['DF e entorno', 'Meio ambiente', 'Segurança pública'] },
    ],
  },

  'cbmdf-oficial': {
    id: 'cbmdf-oficial',
    label: 'CBMDF — Oficial',
    icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do DF',
    cargo: 'Oficial Bombeiro Militar',
    banca: 'Instituto AOCP',
    cor: '#b91c1c',
    descricao: 'Concurso CBMDF Oficial — nível superior, múltipla escolha + redação.',
    simuladoFormat: {
      totalQuestoes: 100,
      tempoMinutos: 360,
      banca: 'Instituto AOCP',
      tipo: 'multipla_escolha',
      cancelamento: false,
      temRedacao: true,
      alternativas: 5,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação oficial'] },
      { id: 'dir-const', nome: 'Direito Constitucional', topicos: ['CF/88', 'Direitos fundamentais'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Atos', 'Licitação', 'Servidores'] },
      { id: 'leg-cbmdf', nome: 'Legislação CBMDF', topicos: ['Organização', 'Estatuto', 'Ética'] },
      { id: 'conhecimentos-bombeiro', nome: 'Técnicas de Bombeiro', topicos: ['Combate a incêndio', 'Resgate', 'Defesa civil', 'Materiais perigosos'] },
      { id: 'lideranca', nome: 'Gestão e Liderança', topicos: ['Administração', 'Liderança de equipes', 'Planejamento'] },
    ],
  },

  'cnu-bloco1': {
    id: 'cnu-bloco1',
    label: 'CNU — Bloco 1 (Infra/Engenharia)',
    icon: '🇧🇷',
    orgao: 'Governo Federal (CNU)',
    cargo: 'Analista Técnico — Infraestrutura e Exatas',
    banca: 'CEBRASPE',
    cor: '#0284c7',
    descricao: 'CNU Bloco 1 — Engenharias, Infraestrutura e Ciências Exatas.',
    simuladoFormat: {
      totalQuestoes: 80,
      tempoMinutos: 270,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: true,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática', 'Redação'] },
      { id: 'dir-adm', nome: 'Noções de Direito Administrativo', topicos: ['Princípios', 'Atos', 'Licitação'] },
      { id: 'dir-const', nome: 'Noções de Direito Constitucional', topicos: ['Organização do Estado', 'Direitos fundamentais'] },
      { id: 'politicas-publicas', nome: 'Políticas Públicas', topicos: ['Planejamento público', 'Orçamento', 'Gestão por resultados'] },
      { id: 'matematica', nome: 'Matemática e Estatística', topicos: ['Estatística', 'Probabilidade', 'Análise de dados'] },
      { id: 'conhec-especif', nome: 'Conhecimentos Específicos (Bloco 1)', topicos: ['Infraestrutura', 'Engenharia', 'Sustentabilidade', 'Meio ambiente'] },
    ],
  },

  'cnu-bloco2': {
    id: 'cnu-bloco2',
    label: 'CNU — Bloco 2 (Regulação)',
    icon: '🇧🇷',
    orgao: 'Governo Federal (CNU)',
    cargo: 'Analista Técnico — Regulação',
    banca: 'CEBRASPE',
    cor: '#0369a1',
    descricao: 'CNU Bloco 2 — Regulação, Fiscalização e Comércio Exterior.',
    simuladoFormat: {
      totalQuestoes: 80,
      tempoMinutos: 270,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: true,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Agências reguladoras', 'Atos', 'Concessões'] },
      { id: 'dir-const', nome: 'Direito Constitucional', topicos: ['Ordem econômica', 'Intervenção do Estado'] },
      { id: 'conhec-especif', nome: 'Conhecimentos Específicos (Bloco 2)', topicos: ['Regulação econômica', 'Direito econômico', 'Comércio exterior', 'Defesa do consumidor'] },
    ],
  },

  'cnu-bloco3': {
    id: 'cnu-bloco3',
    label: 'CNU — Bloco 3 (Ambiental)',
    icon: '🇧🇷',
    orgao: 'Governo Federal (CNU)',
    cargo: 'Analista Técnico — Meio Ambiente',
    banca: 'CEBRASPE',
    cor: '#15803d',
    descricao: 'CNU Bloco 3 — Meio Ambiente, Desenvolvimento Sustentável.',
    simuladoFormat: {
      totalQuestoes: 80,
      tempoMinutos: 270,
      banca: 'CEBRASPE',
      tipo: 'certo_errado',
      cancelamento: false,
      temRedacao: true,
    },
    materias: [
      { id: 'portugues', nome: 'Língua Portuguesa', topicos: ['Interpretação', 'Gramática'] },
      { id: 'dir-adm', nome: 'Direito Administrativo', topicos: ['Atos', 'Licitação'] },
      { id: 'dir-ambiental', nome: 'Direito Ambiental', topicos: ['Lei 9.605/1998', 'SNUC', 'PNMA', 'Licenciamento ambiental', 'Política florestal'] },
      { id: 'conhec-especif', nome: 'Conhecimentos Específicos (Bloco 3)', topicos: ['Gestão ambiental', 'Sustentabilidade', 'Mudanças climáticas', 'Biodiversidade'] },
    ],
  },
}

export function getCursoData(courseId: string): CursoData | null {
  return CURSOS_DATA[courseId] ?? null
}

export function getMateriasByContest(courseId: string): Materia[] {
  return CURSOS_DATA[courseId]?.materias ?? []
}

export function getSimuladoFormat(courseId: string): SimuladoFormat | null {
  return CURSOS_DATA[courseId]?.simuladoFormat ?? null
}

export { CURSOS_DATA }
