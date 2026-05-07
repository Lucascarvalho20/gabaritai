export interface Materia { id: string; nome: string; topicos: string[] }
export interface SimuladoFormat {
  totalQuestoes: number; tempoMinutos: number; banca: string
  tipo: 'certo_errado' | 'multipla_escolha'; cancelamento: boolean
  temRedacao: boolean; alternativas?: number; notaCorteEstimada?: number
}
export interface CursoData {
  id: string; label: string; icon: string; orgao: string; cargo: string
  banca: string; cor: string; materias: Materia[]; simuladoFormat: SimuladoFormat; descricao: string
}

const CE: SimuladoFormat = { totalQuestoes: 120, tempoMinutos: 480, banca: 'CEBRASPE', tipo: 'certo_errado', cancelamento: false, temRedacao: false }
const AOCP5: SimuladoFormat = { totalQuestoes: 80, tempoMinutos: 300, banca: 'AOCP', tipo: 'multipla_escolha', cancelamento: false, temRedacao: true, alternativas: 5 }
const VUNESP: SimuladoFormat = { totalQuestoes: 100, tempoMinutos: 300, banca: 'Vunesp', tipo: 'multipla_escolha', cancelamento: false, temRedacao: false, alternativas: 5 }
const FGV80: SimuladoFormat = { totalQuestoes: 80, tempoMinutos: 240, banca: 'FGV', tipo: 'multipla_escolha', cancelamento: false, temRedacao: false, alternativas: 5 }
const CESQ: SimuladoFormat = { totalQuestoes: 78, tempoMinutos: 210, banca: 'CESGRANRIO', tipo: 'multipla_escolha', cancelamento: false, temRedacao: false, alternativas: 5 }

// ─── MATÉRIAS COMUNS ────────────────────────────────────────────
const PT: Materia = { id: 'pt', nome: 'Língua Portuguesa', topicos: ['Interpretação textual', 'Gramática normativa', 'Ortografia e pontuação', 'Concordância e regência', 'Coesão e coerência'] }
const RL: Materia = { id: 'rl', nome: 'Raciocínio Lógico e Matemática', topicos: ['Lógica proposicional', 'Conjuntos e probabilidade', 'Porcentagem e razão', 'Progressões e sequências', 'Análise combinatória'] }
const DC: Materia = { id: 'dc', nome: 'Direito Constitucional', topicos: ['Direitos fundamentais (Art. 5º)', 'Organização do Estado', 'Segurança pública (Art. 144)', 'Poder Executivo e Legislativo', 'Controle de constitucionalidade'] }
const DA: Materia = { id: 'da', nome: 'Direito Administrativo', topicos: ['Princípios da Adm. Pública', 'Atos administrativos', 'Licitação (Lei 14.133/2021)', 'Servidores públicos', 'Improbidade administrativa'] }
const DP: Materia = { id: 'dp', nome: 'Direito Penal', topicos: ['Teoria geral do crime', 'Excludentes de ilicitude', 'Crimes em espécie (CP)', 'Crimes hediondos (Lei 8.072)', 'Legislação penal especial'] }
const DPP: Materia = { id: 'dpp', nome: 'Direito Processual Penal', topicos: ['Inquérito policial', 'Ação penal e denúncia', 'Prisão em flagrante e cautelares', 'Prova no processo penal', 'Recursos e habeas corpus'] }
const INFO: Materia = { id: 'info', nome: 'Noções de Informática', topicos: ['Sistemas operacionais', 'Pacote Office / LibreOffice', 'Redes e internet', 'Segurança da informação', 'Banco de dados básico'] }
const EN: Materia = { id: 'en', nome: 'Língua Inglesa', topicos: ['Compreensão de texto (reading)', 'Gramática essencial', 'Vocabulário técnico'] }
const AT: Materia = { id: 'at', nome: 'Atualidades', topicos: ['Política nacional e internacional', 'Economia brasileira', 'Meio ambiente e sustentabilidade', 'Ciência e tecnologia'] }
const DH: Materia = { id: 'dh', nome: 'Direitos Humanos e Cidadania', topicos: ['Declaração Universal DH', 'Pacto de São José da Costa Rica', 'Convenção contra Tortura', 'Regras de Mandela', 'Lei de Acesso à Informação'] }
const CRIM: Materia = { id: 'crim', nome: 'Criminologia', topicos: ['Teorias criminológicas', 'Cifras ocultas', 'Vitimologia', 'Escola de Chicago', 'Controle social'] }
const ML: Materia = { id: 'ml', nome: 'Medicina Legal', topicos: ['Tanatologia forense', 'Traumatologia forense', 'Toxicologia forense', 'Identificação humana'] }
const CRIN: Materia = { id: 'crin', nome: 'Criminalística', topicos: ['Local de crime', 'Vestígios e evidências', 'Cadeia de custódia', 'Exames periciais'] }
const DPM: Materia = { id: 'dpm', nome: 'Direito Penal Militar', topicos: ['Código Penal Militar', 'Crimes militares', 'Penas militares', 'Deserção e insubordinação'] }
const DPPM: Materia = { id: 'dppm', nome: 'Direito Processual Penal Militar', topicos: ['CPPM', 'Inquérito policial militar', 'Processo ordinário militar', 'Recursos militares'] }
const MB: Materia = { id: 'mb', nome: 'Matemática Financeira', topicos: ['Juros simples e compostos', 'Desconto e amortização', 'Análise de investimentos', 'Taxas equivalentes'] }
const CB: Materia = { id: 'cb', nome: 'Conhecimentos Bancários', topicos: ['Sistema Financeiro Nacional', 'Produtos bancários', 'Mercado de capitais', 'BACEN e CMN'] }
const DPC: Materia = { id: 'dpc', nome: 'Direito Processual Civil', topicos: ['CPC/2015', 'Petição inicial e resposta', 'Recursos cíveis', 'Execução de sentença'] }
const DCIV: Materia = { id: 'dciv', nome: 'Direito Civil', topicos: ['Parte geral', 'Obrigações e contratos', 'Responsabilidade civil', 'Direito de família'] }
const DT: Materia = { id: 'dt', nome: 'Legislação de Trânsito', topicos: ['CTB (Lei 9.503/1997)', 'Crimes de trânsito (Lei 9.503)', 'Infrações e penalidades', 'Habilitação e licenciamento'] }
const FIS: Materia = { id: 'fis', nome: 'Física e Primeiros Socorros', topicos: ['Cinemática e dinâmica', 'Primeiros socorros e RCP', 'Atendimento pré-hospitalar', 'Combate a incêndio básico'] }
const CONT: Materia = { id: 'cont', nome: 'Contabilidade Geral', topicos: ['Patrimônio e atos contábeis', 'Escrituração e lançamentos', 'Balanço patrimonial (BP)', 'Demonstração do Resultado (DRE)', 'CPC 00 (R2)'] }

// ─── CURSOS ─────────────────────────────────────────────────────
const CURSOS_DATA: Record<string, CursoData> = {

  // ════════ POLÍCIA FEDERAL ════════
  'pf-agente': {
    id: 'pf-agente', label: 'PF — Agente de Polícia Federal', icon: '🔵',
    orgao: 'Departamento de Polícia Federal', cargo: 'Agente de Polícia Federal',
    banca: 'CEBRASPE', cor: '#1d4ed8', descricao: 'CEBRASPE · 120 questões (Certo/Errado) · 3 blocos',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DP, DPP, DH, INFO,
      { id: 'leg-pf', nome: 'Legislação Policial Federal', topicos: ['Lei 9.266/1996 (carreira PF)', 'Lei 12.830/2013 (investigação)', 'Lei 13.445/2017 (migração)', 'Lei 11.343/2006 (drogas)', 'Lei 10.826/2003 (armas)'] },
      CONT,
    ],
  },
  'pf-delegado': {
    id: 'pf-delegado', label: 'PF — Delegado de Polícia Federal', icon: '🏅',
    orgao: 'Departamento de Polícia Federal', cargo: 'Delegado de Polícia Federal',
    banca: 'CEBRASPE', cor: '#1e3a8a', descricao: 'CEBRASPE · 120q · prova discursiva obrigatória',
    simuladoFormat: { ...CE, temRedacao: true },
    materias: [PT, DC, DA, DP, DPP, DCIV,
      { id: 'dtrib', nome: 'Direito Tributário', topicos: ['CTN', 'Impostos federais', 'Lançamento tributário', 'Processo tributário'] },
      { id: 'dint', nome: 'Direito Internacional e DH', topicos: ['Tratados internacionais', 'Extradição', 'Interpol', 'Refugiados e migração'] },
      { id: 'leg-pf', nome: 'Legislação Policial Federal', topicos: ['Lei 12.830/2013', 'Lei 9.455/1997 (tortura)', 'Lei 8.069/1990 (ECA)', 'Lei 9.605/1998 (ambiental)'] },
    ],
  },
  'pf-escrivao': {
    id: 'pf-escrivao', label: 'PF — Escrivão de Polícia Federal', icon: '✍️',
    orgao: 'Departamento de Polícia Federal', cargo: 'Escrivão de Polícia Federal',
    banca: 'CEBRASPE', cor: '#2563eb', descricao: 'CEBRASPE · 120q (Certo/Errado)',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DP, DPP, INFO, DH,
      { id: 'redacao-of', nome: 'Redação Oficial', topicos: ['Manual da Presidência', 'Ofício e memorando', 'Correio eletrônico oficial', 'Pronomes de tratamento'] },
    ],
  },
  'pf-perito': {
    id: 'pf-perito', label: 'PF — Perito Criminal Federal', icon: '🔬',
    orgao: 'Departamento de Polícia Federal', cargo: 'Perito Criminal Federal',
    banca: 'CEBRASPE', cor: '#1d4ed8', descricao: 'CEBRASPE · 120q · + prova específica da área',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, CRIN, ML,
      { id: 'pericia', nome: 'Criminalística e Perícia', topicos: ['Balística forense', 'Documentoscopia', 'Informática forense', 'Química forense', 'Biologia forense'] },
      { id: 'leg-penal', nome: 'Legislação Penal Especial', topicos: ['Cadeia de custódia', 'Lei 12.654/2012 (DNA)', 'CPP — prova pericial', 'Resolução SENASP perícia'] },
    ],
  },

  // ════════ PRF ════════
  'prf-policial': {
    id: 'prf-policial', label: 'PRF — Policial Rodoviário Federal', icon: '🚔',
    orgao: 'Polícia Rodoviária Federal', cargo: 'Policial Rodoviário Federal',
    banca: 'CEBRASPE', cor: '#0369a1', descricao: 'CEBRASPE · 120q (Certo/Errado)',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DP, DPP, INFO, DT,
      FIS,
      { id: 'quim', nome: 'Química Ambiental', topicos: ['Poluentes atmosféricos', 'Combustíveis e derivados', 'Reações de oxidação', 'Legislação ambiental (Lei 9.605)'] },
    ],
  },

  // ════════ POLÍCIA LEGISLATIVA ════════
  'pol-legislativa-camara': {
    id: 'pol-legislativa-camara', label: 'Pol. Legislativa — Câmara dos Deputados', icon: '🏛️',
    orgao: 'Câmara dos Deputados', cargo: 'Policial Legislativo Federal',
    banca: 'CEBRASPE', cor: '#1e40af', descricao: 'CEBRASPE · Proteção de autoridades e instalações',
    simuladoFormat: { ...CE, totalQuestoes: 90 },
    materias: [PT, RL, DC, DA, DP, DPP, INFO,
      { id: 'leg-camara', nome: 'Organização da Câmara dos Deputados', topicos: ['Regimento interno', 'Processo legislativo', 'Estatuto dos servidores', 'Lei 13.834/2019'] },
      { id: 'seg-institucional', nome: 'Segurança Institucional', topicos: ['Técnicas de escolta', 'Proteção de autoridades', 'Segurança física e eletrônica', 'Gestão de crises'] },
    ],
  },
  'pol-legislativa-senado': {
    id: 'pol-legislativa-senado', label: 'Pol. Legislativa — Senado Federal', icon: '🏛️',
    orgao: 'Senado Federal', cargo: 'Policial Legislativo Federal',
    banca: 'CEBRASPE', cor: '#1e3a8a', descricao: 'CEBRASPE · Proteção do Senado Federal',
    simuladoFormat: { ...CE, totalQuestoes: 90 },
    materias: [PT, RL, DC, DA, DP, DPP, INFO,
      { id: 'leg-senado', nome: 'Organização do Senado Federal', topicos: ['Regimento interno do Senado', 'Processo legislativo federal', 'Estatuto dos servidores', 'Ética no serviço público'] },
    ],
  },

  // ════════ CNU ════════
  'cnu-bloco1': {
    id: 'cnu-bloco1', label: 'CNU — Bloco 1 (Infraestrutura)', icon: '🇧🇷',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Infraestrutura e Exatas',
    banca: 'CEBRASPE', cor: '#0284c7', descricao: 'CNU Bloco 1 · Engenharias e Ciências Exatas · 80q + redação',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'pol-pub', nome: 'Políticas Públicas e Gestão', topicos: ['Planejamento governamental', 'Orçamento público (LOA, LDO, PPA)', 'Gestão por resultados', 'Avaliação de políticas'] },
      { id: 'espec1', nome: 'Conhecimentos Específicos — Infraestrutura', topicos: ['Infraestrutura de transportes', 'Engenharia civil e obras', 'Saneamento básico', 'Sustentabilidade e meio ambiente'] },
    ],
  },
  'cnu-bloco2': {
    id: 'cnu-bloco2', label: 'CNU — Bloco 2 (Tecnologia e Dados)', icon: '🇧🇷',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — TI e Ciência de Dados',
    banca: 'CEBRASPE', cor: '#0369a1', descricao: 'CNU Bloco 2 · TI, Ciência de Dados · 80q + redação',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'ti-gov', nome: 'TI e Governo Digital', topicos: ['Segurança da informação', 'Arquitetura de dados', 'LGPD', 'Transformação digital no governo', 'Cloud computing pública'] },
      { id: 'dados', nome: 'Ciência de Dados e IA', topicos: ['Machine learning aplicado', 'Big Data e analytics', 'Python e SQL para dados', 'Visualização de dados'] },
    ],
  },
  'cnu-bloco3': {
    id: 'cnu-bloco3', label: 'CNU — Bloco 3 (Ambiental e Agrário)', icon: '🌿',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Meio Ambiente',
    banca: 'CEBRASPE', cor: '#15803d', descricao: 'CNU Bloco 3 · Meio Ambiente e Agrárias · 80q + redação',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'dir-amb', nome: 'Direito Ambiental', topicos: ['Lei 9.605/1998 (crimes ambientais)', 'PNMA (Lei 6.938/1981)', 'SNUC', 'Licenciamento ambiental', 'Código Florestal'] },
      { id: 'espec3', nome: 'Gestão Ambiental e Agrária', topicos: ['Mudanças climáticas', 'Biodiversidade e ecossistemas', 'Agricultura familiar', 'Reforma agrária (INCRA)'] },
    ],
  },
  'cnu-bloco4': {
    id: 'cnu-bloco4', label: 'CNU — Bloco 4 (Trabalho e Previdência)', icon: '🇧🇷',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Trabalho e Previdência',
    banca: 'CEBRASPE', cor: '#7c3aed', descricao: 'CNU Bloco 4 · Trabalho, Previdência e Assistência Social',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'dt-trab', nome: 'Direito do Trabalho', topicos: ['CLT — contratos de trabalho', 'Jornada e remuneração', 'Rescisão e FGTS', 'Direito coletivo do trabalho'] },
      { id: 'prev', nome: 'Direito Previdenciário', topicos: ['RGPS e RPPS', 'Benefícios previdenciários', 'Custeio da previdência', 'Reforma previdenciária (EC 103/2019)'] },
    ],
  },
  'cnu-bloco5': {
    id: 'cnu-bloco5', label: 'CNU — Bloco 5 (Educação)', icon: '📚',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Educação',
    banca: 'CEBRASPE', cor: '#0891b2', descricao: 'CNU Bloco 5 · Educação, Saúde e Desenvolvimento Social',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'educ', nome: 'Políticas de Educação', topicos: ['LDB (Lei 9.394/1996)', 'PNE', 'Educação básica e superior', 'FUNDEB', 'PNLD'] },
      { id: 'saude', nome: 'Políticas de Saúde', topicos: ['SUS (Lei 8.080/1990)', 'Atenção básica', 'Vigilância epidemiológica', 'Lei 8.142/1990'] },
    ],
  },
  'cnu-bloco6': {
    id: 'cnu-bloco6', label: 'CNU — Bloco 6 (Administração Pública)', icon: '🇧🇷',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Gestão Governamental',
    banca: 'CEBRASPE', cor: '#b45309', descricao: 'CNU Bloco 6 · Administração e Gestão Pública',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'gest-pub', nome: 'Gestão e Finanças Públicas', topicos: ['Lei de Responsabilidade Fiscal', 'Orçamento público', 'Contabilidade pública', 'Auditoria governamental'] },
      { id: 'adm-org', nome: 'Administração e Organização', topicos: ['Estruturas organizacionais', 'Gestão de processos (BPM)', 'Licitação e contratos', 'Gestão de pessoas no setor público'] },
    ],
  },
  'cnu-bloco7': {
    id: 'cnu-bloco7', label: 'CNU — Bloco 7 (Regulação)', icon: '⚖️',
    orgao: 'Governo Federal', cargo: 'Analista Técnico — Regulação e Fiscalização',
    banca: 'CEBRASPE', cor: '#9333ea', descricao: 'CNU Bloco 7 · Regulação Econômica e Jurídica',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: true },
    materias: [PT, RL, DC, DA,
      { id: 'dir-econ', nome: 'Direito Econômico e Regulatório', topicos: ['CADE e defesa da concorrência', 'Agências reguladoras', 'Concessões e PPP', 'Ordem econômica na CF/88'] },
      { id: 'com-ext', nome: 'Comércio Exterior', topicos: ['Importação e exportação', 'Tarifa aduaneira', 'Acordos internacionais', 'Receita Federal e SISCOMEX'] },
    ],
  },
  'cnu-bloco8': {
    id: 'cnu-bloco8', label: 'CNU — Bloco 8 (Nível Intermediário)', icon: '🇧🇷',
    orgao: 'Governo Federal', cargo: 'Técnico Federal — Nível Médio',
    banca: 'CEBRASPE', cor: '#64748b', descricao: 'CNU Bloco 8 · Cargos de nível médio · 80q',
    simuladoFormat: { ...CE, totalQuestoes: 80, temRedacao: false },
    materias: [PT, RL, DC, DA, INFO, AT,
      { id: 'leg-serv', nome: 'Legislação do Serviço Público', topicos: ['Lei 8.112/1990', 'Regime disciplinar', 'Deveres e proibições', 'Processo administrativo (Lei 9.784/1999)'] },
    ],
  },

  // ════════ PMDF ════════
  'pmdf-soldado': {
    id: 'pmdf-soldado', label: 'PMDF — Soldado PM', icon: '🛡️',
    orgao: 'Polícia Militar do Distrito Federal', cargo: 'Soldado Policial Militar (QPPMC)',
    banca: 'Instituto AOCP', cor: '#2563eb', descricao: 'AOCP · 80q múltipla escolha (5 alt.) + redação · nível superior',
    simuladoFormat: { ...AOCP5 },
    materias: [PT, EN, RL, AT,
      { id: 'leg-pmdf', nome: 'Legislação PMDF', topicos: ['Lei 6.450/1977', 'Lei 12.086/2009', 'Lei 7.289/1984 (estatuto)', 'Decreto 41.167/2020', 'R-200 (Dec. 88.777/1983)'] },
      DC, DA, DP, DPP, DPM, DPPM, CRIM,
    ],
  },
  'pmdf-oficial': {
    id: 'pmdf-oficial', label: 'PMDF — Oficial PM', icon: '⭐',
    orgao: 'Polícia Militar do Distrito Federal', cargo: 'Oficial PM',
    banca: 'Instituto AOCP', cor: '#7c3aed', descricao: 'AOCP · 100q + redação · nível superior',
    simuladoFormat: { ...AOCP5, totalQuestoes: 100 },
    materias: [PT, RL, DC, DA, DP, DPM, DPPM,
      { id: 'leg-pmdf', nome: 'Legislação PMDF', topicos: ['Lei 6.450/1977', 'Lei 12.086/2009', 'Estatuto dos PM-DF', 'Decreto 41.167/2020'] },
      { id: 'lider', nome: 'Liderança e Gestão Policial', topicos: ['Teorias de liderança', 'Gestão de pessoas', 'Planejamento operacional', 'Ética policial militar'] },
    ],
  },

  // ════════ PMs ESTADUAIS ════════
  'pm-sp-soldado': {
    id: 'pm-sp-soldado', label: 'PMESP — Soldado PM (São Paulo)', icon: '🛡️',
    orgao: 'Polícia Militar do Estado de São Paulo', cargo: 'Soldado PM 2ª Classe',
    banca: 'Vunesp', cor: '#1d4ed8', descricao: 'Vunesp · 100q múltipla escolha · nível médio',
    simuladoFormat: { ...VUNESP },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-sp', nome: 'Legislação PM-SP', topicos: ['Dec. 14.002/1944 (Regulamento PM-SP)', 'Lei Complementar 893/2001 (Estatuto)', 'Regulamento disciplinar (Dec. 64.701/2019)', 'ROA (Regulamento Ostensivo Adolfo Pinto)'] },
      { id: 'geo-sp', nome: 'Geografia e História de SP', topicos: ['História e cultura paulista', 'Regiões metropolitanas SP', 'Estrutura do estado de SP', 'Municípios e regionais'] },
    ],
  },
  'pm-rj-soldado': {
    id: 'pm-rj-soldado', label: 'PMERJ — Soldado PM (Rio de Janeiro)', icon: '🛡️',
    orgao: 'Polícia Militar do Estado do Rio de Janeiro', cargo: 'Soldado PM',
    banca: 'FGV', cor: '#1e40af', descricao: 'FGV · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-rj', nome: 'Legislação PM-RJ', topicos: ['Lei 443/1981 (Estatuto PM-RJ)', 'Dec. 6.579/1983 (regulamento)', 'Regulamento disciplinar PM-RJ', 'Lei Complementar 261/2004'] },
    ],
  },
  'pm-mg-soldado': {
    id: 'pm-mg-soldado', label: 'PMMG — Soldado PM (Minas Gerais)', icon: '🛡️',
    orgao: 'Polícia Militar de Minas Gerais', cargo: 'Soldado PM 2ª Classe',
    banca: 'Fundação João Pinheiro / Ibade', cor: '#2563eb', descricao: 'FJP/Ibade · 100q · nível médio',
    simuladoFormat: { ...VUNESP, banca: 'Ibade' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-mg', nome: 'Legislação PM-MG', topicos: ['Lei 5.301/1969 (organização PM-MG)', 'Estatuto PM-MG', 'Regulamento disciplinar', 'Regimento interno'] },
    ],
  },
  'pm-rs-soldado': {
    id: 'pm-rs-soldado', label: 'BM-RS — Soldado (Brigada Militar RS)', icon: '🛡️',
    orgao: 'Brigada Militar do Rio Grande do Sul', cargo: 'Soldado BM 2ª Classe',
    banca: 'FAURGS', cor: '#1e3a8a', descricao: 'FAURGS · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'FAURGS' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-bm-rs', nome: 'Legislação BM-RS', topicos: ['Lei 10.990/1997 (estatuto BM)', 'Regulamento disciplinar', 'Atividade de polícia ostensiva', 'Lei Complementar 10.304/1994'] },
    ],
  },
  'pm-ba-soldado': {
    id: 'pm-ba-soldado', label: 'PMBA — Soldado PM (Bahia)', icon: '🛡️',
    orgao: 'Polícia Militar da Bahia', cargo: 'Soldado PM',
    banca: 'IBFC', cor: '#2563eb', descricao: 'IBFC · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'IBFC' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-ba', nome: 'Legislação PM-BA', topicos: ['Lei 7.990/2001 (estatuto)', 'Regulamento disciplinar PM-BA', 'Lei de Organização Básica PM-BA'] },
    ],
  },
  'pm-ce-soldado': {
    id: 'pm-ce-soldado', label: 'PMCE — Soldado PM (Ceará)', icon: '🛡️',
    orgao: 'Polícia Militar do Estado do Ceará', cargo: 'Soldado PM',
    banca: 'CEBRASPE', cor: '#0369a1', descricao: 'CEBRASPE · certo/errado · nível médio',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-ce', nome: 'Legislação PM-CE', topicos: ['Lei 13.407/2003 (estatuto PM-CE)', 'Regulamento disciplinar', 'Lei Orgânica da PMCE'] },
    ],
  },
  'pm-go-soldado': {
    id: 'pm-go-soldado', label: 'PMGO — Soldado PM (Goiás)', icon: '🛡️',
    orgao: 'Polícia Militar do Estado de Goiás', cargo: 'Soldado PM',
    banca: 'UEG / Ibade', cor: '#16a34a', descricao: 'UEG · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'UEG' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-go', nome: 'Legislação PM-GO', topicos: ['Lei 8.033/1975 (organização PM-GO)', 'Estatuto dos militares de GO', 'Regulamento disciplinar'] },
    ],
  },
  'pm-pe-soldado': {
    id: 'pm-pe-soldado', label: 'PMPE — Soldado PM (Pernambuco)', icon: '🛡️',
    orgao: 'Polícia Militar de Pernambuco', cargo: 'Soldado PM',
    banca: 'CEBRASPE', cor: '#1d4ed8', descricao: 'CEBRASPE · certo/errado · nível médio',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-pe', nome: 'Legislação PM-PE', topicos: ['Lei 11.817/2000 (estatuto PM-PE)', 'Regulamento disciplinar', 'Organização básica PM-PE'] },
    ],
  },
  'pm-pr-soldado': {
    id: 'pm-pr-soldado', label: 'PMPR — Soldado PM (Paraná)', icon: '🛡️',
    orgao: 'Polícia Militar do Paraná', cargo: 'Soldado PM 2ª Classe',
    banca: 'NUCEPE / Ibade', cor: '#1e40af', descricao: 'Ibade · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'Ibade' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-pr', nome: 'Legislação PM-PR', topicos: ['Lei 1.943/1954 (código PM-PR)', 'Estatuto dos militares-PR', 'Regulamento disciplinar'] },
    ],
  },
  'pm-sc-soldado': {
    id: 'pm-sc-soldado', label: 'PMSC — Soldado PM (Santa Catarina)', icon: '🛡️',
    orgao: 'Polícia Militar de Santa Catarina', cargo: 'Soldado PM',
    banca: 'IBFC', cor: '#0284c7', descricao: 'IBFC · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'IBFC' },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-pm-sc', nome: 'Legislação PM-SC', topicos: ['Lei 6.218/1983 (estatuto PM-SC)', 'Regulamento disciplinar', 'Organização PM-SC'] },
    ],
  },

  // ════════ POLÍCIA CIVIL — DF ════════
  'pc-df-agente': {
    id: 'pc-df-agente', label: 'PCDF — Agente de Polícia Civil', icon: '🔍',
    orgao: 'Polícia Civil do Distrito Federal', cargo: 'Agente de Polícia',
    banca: 'CEBRASPE', cor: '#1d4ed8', descricao: 'CEBRASPE · 120q certo/errado · nível superior',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM, ML, CRIN,
      { id: 'leg-pcdf', nome: 'Legislação PCDF', topicos: ['Lei 4.878/1965', 'Decreto 22.257/2001', 'Lei 12.830/2013', 'Estatuto dos policiais civis do DF'] },
    ],
  },
  'pc-df-delegado': {
    id: 'pc-df-delegado', label: 'PCDF — Delegado de Polícia Civil', icon: '🏅',
    orgao: 'Polícia Civil do Distrito Federal', cargo: 'Delegado de Polícia',
    banca: 'CEBRASPE', cor: '#1e3a8a', descricao: 'CEBRASPE · 120q + prova oral · nível superior',
    simuladoFormat: { ...CE, temRedacao: true },
    materias: [PT, DC, DA, DP, DPP, DCIV, CRIM, ML,
      { id: 'dint-pc', nome: 'Direito Internacional Privado', topicos: ['LINDB', 'Conflito de leis no espaço', 'Cooperação jurídica internacional'] },
    ],
  },
  'pc-df-escrivao': {
    id: 'pc-df-escrivao', label: 'PCDF — Escrivão de Polícia Civil', icon: '✍️',
    orgao: 'Polícia Civil do Distrito Federal', cargo: 'Escrivão de Polícia',
    banca: 'CEBRASPE', cor: '#2563eb', descricao: 'CEBRASPE · 120q certo/errado',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DP, DPP, INFO,
      { id: 'leg-pcdf', nome: 'Legislação PCDF', topicos: ['Lei 4.878/1965', 'Dec. 22.257/2001', 'Lei 12.830/2013'] },
    ],
  },

  // ════════ POLÍCIA CIVIL — ESTADOS ════════
  'pc-sp-agente': {
    id: 'pc-sp-agente', label: 'PCSP — Investigador de Polícia (SP)', icon: '🔍',
    orgao: 'Polícia Civil do Estado de São Paulo', cargo: 'Investigador de Polícia',
    banca: 'Vunesp', cor: '#1d4ed8', descricao: 'Vunesp · 100q múltipla escolha · nível médio',
    simuladoFormat: { ...VUNESP },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-sp', nome: 'Legislação PC-SP', topicos: ['Lei Complementar 207/1979', 'Dec. 22.970/1984', 'Lei 4.923/1985', 'Estatuto dos delegados PC-SP'] },
    ],
  },
  'pc-rj-agente': {
    id: 'pc-rj-agente', label: 'PCRJ — Inspetor de Polícia (Rio de Janeiro)', icon: '🔍',
    orgao: 'Polícia Civil do Estado do Rio de Janeiro', cargo: 'Inspetor de Polícia',
    banca: 'FGV', cor: '#1e40af', descricao: 'FGV · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80 },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-rj', nome: 'Legislação PC-RJ', topicos: ['Lei 2.182/1993', 'Dec. 6.491/1983', 'Estatuto dos funcionários PC-RJ'] },
    ],
  },
  'pc-mg-agente': {
    id: 'pc-mg-agente', label: 'PCMG — Investigador de Polícia (Minas Gerais)', icon: '🔍',
    orgao: 'Polícia Civil do Estado de Minas Gerais', cargo: 'Investigador de Polícia',
    banca: 'Fumarc', cor: '#2563eb', descricao: 'Fumarc · 100q múltipla escolha · nível médio',
    simuladoFormat: { ...VUNESP, banca: 'Fumarc' },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-mg', nome: 'Legislação PC-MG', topicos: ['Lei 5.406/1969', 'Dec. 36.301/1994', 'Regulamento disciplinar PC-MG'] },
    ],
  },
  'pc-rs-agente': {
    id: 'pc-rs-agente', label: 'PC-RS — Delegado / Agente (Rio Grande do Sul)', icon: '🔍',
    orgao: 'Polícia Civil do Estado do Rio Grande do Sul', cargo: 'Agente de Polícia / Delegado',
    banca: 'FAURGS', cor: '#1e3a8a', descricao: 'FAURGS · 80q múltipla escolha',
    simuladoFormat: { ...FGV80, banca: 'FAURGS' },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM, ML,
      { id: 'leg-pc-rs', nome: 'Legislação PC-RS', topicos: ['Dec. 43.245/2004', 'Estatuto dos servidores PC-RS'] },
    ],
  },
  'pc-ba-agente': {
    id: 'pc-ba-agente', label: 'PC-BA — Investigador de Polícia (Bahia)', icon: '🔍',
    orgao: 'Polícia Civil do Estado da Bahia', cargo: 'Investigador de Polícia',
    banca: 'AOCP / IBFC', cor: '#2563eb', descricao: 'AOCP · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...AOCP5 },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-ba', nome: 'Legislação PC-BA', topicos: ['Lei 7.435/1998', 'Estatuto dos policiais civis da BA', 'Código de Ética PC-BA'] },
    ],
  },
  'pc-ce-agente': {
    id: 'pc-ce-agente', label: 'PC-CE — Inspetor de Polícia (Ceará)', icon: '🔍',
    orgao: 'Polícia Civil do Estado do Ceará', cargo: 'Inspetor de Polícia',
    banca: 'CEBRASPE', cor: '#0369a1', descricao: 'CEBRASPE · certo/errado · nível médio',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-ce', nome: 'Legislação PC-CE', topicos: ['Lei 12.124/1993', 'Estatuto dos servidores PC-CE'] },
    ],
  },
  'pc-pe-agente': {
    id: 'pc-pe-agente', label: 'PC-PE — Agente de Polícia (Pernambuco)', icon: '🔍',
    orgao: 'Polícia Civil do Estado de Pernambuco', cargo: 'Agente de Polícia',
    banca: 'CEBRASPE', cor: '#1d4ed8', descricao: 'CEBRASPE · certo/errado · nível médio',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-pe', nome: 'Legislação PC-PE', topicos: ['Lei 6.123/1968', 'Dec. 28.809/2006', 'Código de Ética da Polícia Civil de PE'] },
    ],
  },
  'pc-go-agente': {
    id: 'pc-go-agente', label: 'PC-GO — Investigador de Polícia (Goiás)', icon: '🔍',
    orgao: 'Polícia Civil do Estado de Goiás', cargo: 'Investigador de Polícia',
    banca: 'UEG', cor: '#16a34a', descricao: 'UEG · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'UEG' },
    materias: [PT, RL, DC, DA, DP, DPP, CRIM,
      { id: 'leg-pc-go', nome: 'Legislação PC-GO', topicos: ['Lei 16.904/2010', 'Estatuto PC-GO', 'Código de Ética PC-GO'] },
    ],
  },
  'pc-agente-custodia': {
    id: 'pc-agente-custodia', label: 'PC — Agente de Custódia / Socioeducativo', icon: '🔐',
    orgao: 'Polícia Civil (vários estados)', cargo: 'Agente de Custódia / Agente Socioeducativo',
    banca: 'CEBRASPE / IBFC', cor: '#64748b', descricao: 'Concurso para agente de custódia — sistema prisional',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'exec-penal', nome: 'Execução Penal', topicos: ['LEP (Lei 7.210/1984)', 'Regimes prisionais', 'Direitos dos presos', 'Regras de Mandela', 'Benefícios de execução'] },
      { id: 'cust', nome: 'Segurança e Custódia', topicos: ['Técnicas de custódia', 'Controle de cela e pavilhão', 'Saúde no sistema prisional', 'Prevenção a fugas e motins'] },
    ],
  },

  // ════════ BOMBEIROS ════════
  'cbmdf-soldado': {
    id: 'cbmdf-soldado', label: 'CBMDF — Soldado Bombeiro Militar', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do DF', cargo: 'Soldado Bombeiro Militar',
    banca: 'Instituto AOCP', cor: '#dc2626', descricao: 'AOCP · 80q + redação + TAF',
    simuladoFormat: { ...AOCP5 },
    materias: [PT, EN, RL, AT, DC, DA, DP,
      { id: 'leg-cbmdf', nome: 'Legislação CBMDF', topicos: ['Lei 8.255/1991', 'Estatuto dos militares DF', 'Regulamento disciplinar CBMDF', 'Dec. 10.024/2019'] },
      FIS,
    ],
  },
  'cbmdf-oficial': {
    id: 'cbmdf-oficial', label: 'CBMDF — Oficial Bombeiro Militar', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do DF', cargo: 'Oficial Bombeiro Militar',
    banca: 'Instituto AOCP', cor: '#b91c1c', descricao: 'AOCP · 100q + redação · nível superior',
    simuladoFormat: { ...AOCP5, totalQuestoes: 100 },
    materias: [PT, RL, DC, DA, DP,
      { id: 'leg-cbmdf', nome: 'Legislação CBMDF', topicos: ['Lei 8.255/1991', 'Estatuto militares DF', 'Regulamento disciplinar'] },
      { id: 'tec-bomb', nome: 'Técnicas de Bombeiro', topicos: ['Combate a incêndio', 'Resgate veicular', 'Materiais perigosos (Hazmat)', 'Defesa civil e PPCI'] },
      { id: 'lider', nome: 'Gestão e Liderança', topicos: ['Administração pública', 'Liderança situacional', 'Planejamento de operações'] },
    ],
  },
  'cbm-sp-soldado': {
    id: 'cbm-sp-soldado', label: 'CBMSP — Soldado Bombeiro (São Paulo)', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do Estado de São Paulo', cargo: 'Soldado de 2ª Classe CB',
    banca: 'Vunesp', cor: '#dc2626', descricao: 'Vunesp · 100q múltipla escolha · nível médio',
    simuladoFormat: { ...VUNESP },
    materias: [PT, RL, DC, DA, DP, FIS,
      { id: 'leg-cbm-sp', nome: 'Legislação CBMSP', topicos: ['Lei Complementar 1.036/2008', 'Regulamento disciplinar CB-SP', 'Decreto 50.412/1968'] },
    ],
  },
  'cbm-rj-soldado': {
    id: 'cbm-rj-soldado', label: 'CBMRJ — Soldado Bombeiro (Rio de Janeiro)', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar do Estado do Rio de Janeiro', cargo: 'Soldado BM',
    banca: 'FGV', cor: '#dc2626', descricao: 'FGV · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80 },
    materias: [PT, RL, DC, DA, DP, FIS,
      { id: 'leg-cbm-rj', nome: 'Legislação CBM-RJ', topicos: ['Lei 443/1981 (aplicada CBMERJ)', 'Dec. 3.302/1980', 'Regulamento geral CBMERJ'] },
    ],
  },
  'cbm-mg-soldado': {
    id: 'cbm-mg-soldado', label: 'CBMMG — Soldado Bombeiro (Minas Gerais)', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar de Minas Gerais', cargo: 'Soldado BM',
    banca: 'Ibade', cor: '#b91c1c', descricao: 'Ibade · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'Ibade' },
    materias: [PT, RL, DC, DA, DP, FIS,
      { id: 'leg-cbm-mg', nome: 'Legislação CBMMG', topicos: ['Lei 14.310/2002 (código militar MG)', 'Estatuto CBM-MG', 'Regulamento disciplinar'] },
    ],
  },
  'cbm-ba-soldado': {
    id: 'cbm-ba-soldado', label: 'CBMBA — Soldado Bombeiro (Bahia)', icon: '🚒',
    orgao: 'Corpo de Bombeiros Militar da Bahia', cargo: 'Soldado BM',
    banca: 'IBFC', cor: '#dc2626', descricao: 'IBFC · 80q múltipla escolha · nível médio',
    simuladoFormat: { ...FGV80, banca: 'IBFC' },
    materias: [PT, RL, DC, DA, DP, FIS,
      { id: 'leg-cbm-ba', nome: 'Legislação CBM-BA', topicos: ['Estatuto CBM-BA', 'Regulamento disciplinar', 'Lei de organização CBM-BA'] },
    ],
  },

  // ════════ BANCOS ════════
  'bb-escriturario': {
    id: 'bb-escriturario', label: 'Banco do Brasil — Escriturário', icon: '🏦',
    orgao: 'Banco do Brasil S.A.', cargo: 'Escriturário — Agente Comercial',
    banca: 'CESGRANRIO', cor: '#f59e0b', descricao: 'CESGRANRIO · 78q múltipla escolha (5 alt.)',
    simuladoFormat: { ...CESQ },
    materias: [PT, RL, EN, INFO, MB, CB,
      { id: 'atualidades-mf', nome: 'Atualidades do Mercado Financeiro', topicos: ['Tendências digitais em bancos', 'Open Banking e PIX', 'Fintechs e inovação', 'Sustentabilidade ESG'] },
    ],
  },
  'cef-tecnico': {
    id: 'cef-tecnico', label: 'Caixa Econômica Federal — Técnico', icon: '💛',
    orgao: 'Caixa Econômica Federal', cargo: 'Técnico Bancário Novo',
    banca: 'CESGRANRIO', cor: '#ca8a04', descricao: 'CESGRANRIO · 70q múltipla escolha',
    simuladoFormat: { ...CESQ, totalQuestoes: 70 },
    materias: [PT, RL, INFO, MB, CB,
      { id: 'hab-cef', nome: 'Habitação e Programas Sociais', topicos: ['Crédito imobiliário', 'FGTS e habitação', 'Minha Casa Minha Vida', 'SBPE e SFH'] },
    ],
  },
  'bndes-analista': {
    id: 'bndes-analista', label: 'BNDES — Analista', icon: '🏛️',
    orgao: 'Banco Nacional de Desenvolvimento Econômico e Social', cargo: 'Analista de Sistemas / Economia',
    banca: 'CESGRANRIO', cor: '#0369a1', descricao: 'CESGRANRIO · 70q · nível superior',
    simuladoFormat: { ...CESQ, totalQuestoes: 70 },
    materias: [PT, RL, EN, INFO, MB, CB,
      { id: 'econ-dev', nome: 'Economia e Desenvolvimento', topicos: ['Macroeconomia brasileira', 'Política monetária e fiscal', 'Comércio exterior', 'Desenvolvimento regional'] },
    ],
  },
  'bacen-analista': {
    id: 'bacen-analista', label: 'Banco Central — Analista', icon: '🏛️',
    orgao: 'Banco Central do Brasil', cargo: 'Analista — Área 1 (Economia)',
    banca: 'CEBRASPE', cor: '#1e40af', descricao: 'CEBRASPE · 120q certo/errado · nível superior',
    simuladoFormat: { ...CE },
    materias: [PT, RL, EN, DC, DA, MB, CB,
      { id: 'bacen-espec', nome: 'Conhecimentos Específicos BACEN', topicos: ['Política monetária', 'Sistema de pagamentos brasileiro', 'Regulação bancária (Basileia III)', 'Supervisão do sistema financeiro'] },
    ],
  },

  // ════════ JUDICIÁRIO ════════
  'tjdft-tecnico': {
    id: 'tjdft-tecnico', label: 'TJDFT — Técnico Judiciário', icon: '⚖️',
    orgao: 'Tribunal de Justiça do DF e Territórios', cargo: 'Técnico Judiciário — Área Judiciária',
    banca: 'CEBRASPE', cor: '#6d28d9', descricao: 'CEBRASPE · 90q certo/errado',
    simuladoFormat: { ...CE, totalQuestoes: 90 },
    materias: [PT, RL, DC, DA, DPC, INFO,
      { id: 'leg-tjdft', nome: 'Legislação Judiciária', topicos: ['LOMAN (LC 35/1979)', 'Regimento interno TJDFT', 'Estatuto dos servidores do TJDFT', 'Resolução CNJ 67/2009'] },
    ],
  },
  'tjdft-analista': {
    id: 'tjdft-analista', label: 'TJDFT — Analista Judiciário', icon: '⚖️',
    orgao: 'Tribunal de Justiça do DF e Territórios', cargo: 'Analista Judiciário — Área Judiciária',
    banca: 'CEBRASPE', cor: '#5b21b6', descricao: 'CEBRASPE · 120q certo/errado · nível superior',
    simuladoFormat: { ...CE },
    materias: [PT, RL, DC, DA, DPC, DCIV,
      { id: 'leg-tjdft', nome: 'Legislação Judiciária', topicos: ['LOMAN', 'CPC/2015 completo', 'Regimento TJDFT', 'Ética no serviço público'] },
    ],
  },
  'stj-tecnico': {
    id: 'stj-tecnico', label: 'STJ — Técnico Judiciário', icon: '⚖️',
    orgao: 'Superior Tribunal de Justiça', cargo: 'Técnico Judiciário',
    banca: 'CEBRASPE', cor: '#4c1d95', descricao: 'CEBRASPE · 90q certo/errado',
    simuladoFormat: { ...CE, totalQuestoes: 90 },
    materias: [PT, RL, DC, DA, DPC, INFO,
      { id: 'leg-stj', nome: 'Regimento Interno STJ', topicos: ['Competência do STJ', 'Recursos especiais', 'Organização do STJ', 'Resolução STJ 19/2014'] },
    ],
  },
  'trf-tecnico': {
    id: 'trf-tecnico', label: 'TRF — Técnico Judiciário Federal', icon: '⚖️',
    orgao: 'Tribunal Regional Federal', cargo: 'Técnico Judiciário',
    banca: 'CEBRASPE', cor: '#3b0764', descricao: 'CEBRASPE · 90q certo/errado',
    simuladoFormat: { ...CE, totalQuestoes: 90 },
    materias: [PT, RL, DC, DA, DPC, INFO,
      { id: 'dir-federal', nome: 'Legislação Federal', topicos: ['Competência da Justiça Federal', 'Lei 5.010/1966 (organização JF)', 'Processo federal', 'Súmulas do STJ e TRFs'] },
    ],
  },
  'tj-sp-escrevente': {
    id: 'tj-sp-escrevente', label: 'TJ-SP — Escrevente Técnico Judiciário', icon: '⚖️',
    orgao: 'Tribunal de Justiça do Estado de São Paulo', cargo: 'Escrevente Técnico Judiciário',
    banca: 'Vunesp', cor: '#6d28d9', descricao: 'Vunesp · 100q múltipla escolha · nível médio',
    simuladoFormat: { ...VUNESP },
    materias: [PT, RL, DC, DA, DPC, INFO,
      { id: 'leg-tj-sp', nome: 'Organização Judiciária SP', topicos: ['Lei Complementar 35/1979 (LOMAN)', 'Regimento interno TJ-SP', 'Normas da Corregedoria', 'LC 1.318/2018 (Estatuto servidores SP)'] },
    ],
  },

  // ════════ DETRAN ════════
  'detran-df-agente': {
    id: 'detran-df-agente', label: 'DETRAN-DF — Agente de Trânsito', icon: '🚦',
    orgao: 'Departamento de Trânsito do Distrito Federal', cargo: 'Agente de Trânsito',
    banca: 'CEBRASPE', cor: '#f59e0b', descricao: 'CEBRASPE · 80q certo/errado',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DT, INFO,
      { id: 'eng-traf', nome: 'Engenharia de Tráfego e Sinalização', topicos: ['Sinalização horizontal e vertical', 'Semáforos e controle de fluxo', 'Projeto geométrico', 'Acessibilidade viária'] },
    ],
  },
  'detran-sp-agente': {
    id: 'detran-sp-agente', label: 'DETRAN-SP — Agente de Trânsito', icon: '🚦',
    orgao: 'Departamento Estadual de Trânsito de São Paulo', cargo: 'Agente de Trânsito',
    banca: 'Vunesp', cor: '#d97706', descricao: 'Vunesp · 80q múltipla escolha',
    simuladoFormat: { ...VUNESP, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DT, INFO,
      { id: 'vistoria', nome: 'Habilitação, Vistoria e Registro', topicos: ['Habilitação (categorias CNH)', 'Registro e licenciamento', 'Infrações e penalidades', 'Recursos de multa (JARI)'] },
    ],
  },

  // ════════ GUARDA CIVIL / MUNICIPAL ════════
  'gcm-sp': {
    id: 'gcm-sp', label: 'GCM — Guarda Civil Metropolitano (São Paulo)', icon: '🏙️',
    orgao: 'Prefeitura de São Paulo — SMSU', cargo: 'Guarda Civil Metropolitano',
    banca: 'Vunesp', cor: '#0891b2', descricao: 'Vunesp · 100q · proteção do patrimônio municipal',
    simuladoFormat: { ...VUNESP },
    materias: [PT, RL, DC, DA, DP, DPP, AT,
      { id: 'leg-gcm-sp', nome: 'Legislação GCM-SP', topicos: ['Lei 14.879/2009 (Estatuto GCM-SP)', 'Dec. 50.990/2009', 'Regulamento disciplinar GCM', 'Estatuto do Desarmamento (arts. 6º-7º)'] },
      { id: 'seg-pub', nome: 'Segurança Pública Municipal', topicos: ['Competência da guarda municipal', 'Poder de polícia administrativo', 'Armamento e uso da força', 'Ronda Ostensiva Municipal'] },
    ],
  },
  'gcm-rj': {
    id: 'gcm-rj', label: 'GM — Guarda Municipal (Rio de Janeiro)', icon: '🏙️',
    orgao: 'Prefeitura do Rio de Janeiro', cargo: 'Guarda Municipal',
    banca: 'FGV', cor: '#0284c7', descricao: 'FGV · 80q múltipla escolha',
    simuladoFormat: { ...FGV80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-gm-rj', nome: 'Legislação GM-RJ', topicos: ['Lei Municipal 5.346/2011 (GM-RJ)', 'Estatuto dos guardas municipais RJ', 'Dec. Municipal 38.722/2014'] },
    ],
  },
  'guarda-df': {
    id: 'guarda-df', label: 'GCM-DF — Guarda Civil Metropolitana do DF', icon: '🏙️',
    orgao: 'Governo do Distrito Federal', cargo: 'Agente de Polícia Cidadã / GCM',
    banca: 'CEBRASPE', cor: '#2563eb', descricao: 'CEBRASPE · 80q certo/errado',
    simuladoFormat: { ...CE, totalQuestoes: 80 },
    materias: [PT, RL, DC, DA, DP, DPP,
      { id: 'leg-gcm-df', nome: 'Legislação GCM-DF', topicos: ['Lei Distrital 4.230/2008', 'Estatuto GCM-DF', 'Regulamento disciplinar', 'Lei Orgânica do DF — segurança'] },
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
