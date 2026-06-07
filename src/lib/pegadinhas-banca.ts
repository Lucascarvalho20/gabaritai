/**
 * Mapa estático de "pegadinhas" e padrões por banca.
 * Usado no edital verticalizado por email pra dar perspectiva estratégica.
 *
 * Atualizar quando observarmos padrões novos nas provas. NÃO precisa IA —
 * isso aqui é conhecimento curado, mais valioso que análise genérica.
 */

export type BancaInfo = {
  nome: string
  caracteristicas: string[]   // 3-4 padrões diferenciais
  pegadinhas: string[]        // 3-5 armadilhas clássicas
  estrategia: string[]        // 2-3 dicas de estudo direcionadas
  formato: string             // descrição curta do formato de prova
}

const BANCAS: Record<string, BancaInfo> = {
  cebraspe: {
    nome: 'Cebraspe',
    formato: 'Itens Certo/Errado (CE) — errada ANULA certa, então chute custa caro.',
    caracteristicas: [
      'Cobra literalidade da lei seca + jurisprudência consolidada (acima de 1 ano)',
      'Adora trocar UMA palavra do texto legal pra inverter o sentido',
      'Provas longas (4-5h) com 120-180 itens — gestão de tempo é fator decisivo',
      'Recurso bem fundamentado costuma ser deferido (acompanhe gabarito preliminar)',
    ],
    pegadinhas: [
      'Quantificadores absolutos ("todos", "sempre", "nenhum") quando a regra tem exceção',
      'Modalizadores trocados ("deve" no lugar de "pode" e vice-versa)',
      'Inversão de causa/efeito ou de sujeito ativo/passivo',
      'Conclusões extrapoladas — afirma algo que o texto não disse, mesmo sendo verdade',
      '"Errada anula certa" — só marque quando tiver certeza acima de 80%',
    ],
    estrategia: [
      'Treine itens C/E diariamente — a lógica é diferente de múltipla escolha',
      'Decore súmulas vinculantes e jurisprudência consolidada dos tribunais',
      'Resolva pelo menos 2 provas inteiras do mesmo cargo dos últimos 3 anos',
    ],
  },

  'instituto-aocp': {
    nome: 'Instituto AOCP',
    formato: 'Múltipla escolha com 5 alternativas — sem anulação, chute calculado é OK.',
    caracteristicas: [
      'Provas mais objetivas e diretas que Cebraspe, com menos pegadinhas linguísticas',
      'Cobra muito legislação institucional (lei orgânica, regimento interno, estatuto)',
      'Questões em ordem crescente de dificuldade dentro de cada matéria',
      'Provas com 60-80 questões em 4h — ritmo mais tranquilo',
    ],
    pegadinhas: [
      'Alternativas longas com 2-3 informações encadeadas — basta UMA estar errada pra invalidar',
      'Foco em datas, prazos e números exatos das legislações específicas',
      'Confusão entre artigos/incisos próximos (ex: Art 4 × Art 5)',
      'Questões de interpretação textual com 2 alternativas muito próximas',
    ],
    estrategia: [
      'Leia a legislação institucional INTEIRA antes de provas (lei orgânica do órgão)',
      'Treine memorização de prazos e números — flashcards funcionam muito bem',
      'Resolva provas anteriores do mesmo concurso ou de órgãos similares com AOCP',
    ],
  },

  iades: {
    nome: 'IADES',
    formato: 'Múltipla escolha com 5 alternativas — sem anulação. Provas com prazo justo.',
    caracteristicas: [
      'Cobra muito jurisprudência e súmulas — STF, STJ, TST conforme área',
      'Mistura questões padronizadas com questões originais (mais elaboradas)',
      'Costuma colocar texto introdutório longo antes da pergunta — leia primeiro o enunciado da questão',
      'Para concursos do DF: lei orgânica e legislação distrital têm peso alto',
    ],
    pegadinhas: [
      'Súmulas com numeração próxima (Sum 13 × Sum 113) confundem mais do que parece',
      'Conectivos lógicos em alternativas ("contudo", "entretanto", "porém") podem inverter sentido',
      'Datas e prazos com diferença sutil (10 vs 15 dias, 60 vs 90 dias)',
      'Enunciado com "EXCETO" ou "INCORRETO" — risque na hora pra não esquecer',
    ],
    estrategia: [
      'Mantenha tabela atualizada de súmulas mais cobradas (STF/STJ)',
      'Para concursos DF: estude obrigatoriamente Lei Orgânica do DF + LODF',
      'Resolva 1 prova IADES por semana pra calibrar o ritmo de leitura',
    ],
  },

  fgv: {
    nome: 'FGV',
    formato: 'Múltipla escolha com 5 alternativas. Provas com nível de dificuldade acima da média.',
    caracteristicas: [
      'Enunciados longos com informação irrelevante ("noise") pra testar leitura crítica',
      'Cobra raciocínio aplicado em vez de decoreba pura',
      'Lógica e quantitativas em destaque — mesmo em provas jurídicas',
      'Doutrina contemporânea aparece com frequência (não só lei seca)',
    ],
    pegadinhas: [
      'Enunciado com 4-5 linhas onde só metade importa pra resposta',
      'Alternativas que misturam corretos com incorretos no mesmo item',
      'Cálculos com casas decimais pra forçar arredondamento',
      'Questões de RL com pegadinha em quantificadores ("algum" vs "todo")',
    ],
    estrategia: [
      'Treine leitura RÁPIDA de enunciados extensos — sublinhe o que importa',
      'Reforce RL e matemática mesmo em concurso jurídico (FGV cobra)',
      'Estude doutrina recente além da lei seca',
    ],
  },

  fcc: {
    nome: 'FCC',
    formato: 'Múltipla escolha com 5 alternativas. Provas equilibradas em dificuldade.',
    caracteristicas: [
      'Cobra muito letra de lei — quase parafraseia textualmente',
      'Provas com lógica mais matemática (não só proposicional)',
      'Para concursos contábeis e tributários é referência absoluta',
      'Provas previsíveis em estrutura — quem treina FCC sente vantagem',
    ],
    pegadinhas: [
      'Alternativas com troca de termos próximos da lei (ex: "competência privativa" × "exclusiva")',
      'Datas e prazos exatos das leis',
      'Questões de RL com matemática (não só lógica)',
      'Sutil diferença entre redação de Súmula e da Lei sobre o mesmo tema',
    ],
    estrategia: [
      'Decore lei seca PALAVRA POR PALAVRA das mais cobradas',
      'Treine cálculos rápidos sem calculadora',
      'Use provas FCC dos últimos 5 anos — repetem temas',
    ],
  },
}

export function getBancaInfo(bancaSlug: string | null | undefined): BancaInfo | null {
  if (!bancaSlug) return null
  return BANCAS[bancaSlug.toLowerCase()] ?? null
}

/**
 * Calcula selo de importância da matéria com base no peso/expectedQuestions.
 * Crítica → Alta → Média → Baixa
 */
export function getImportanciaMateria(input: {
  weight: number | null
  expectedQuestions: number | null
  totalQuestoes: number | null
}): { selo: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA'; cor: string; bg: string } {
  // Se temos expectedQuestions e totalQuestoes, calcula % real
  let pct = 0
  if (input.expectedQuestions && input.totalQuestoes && input.totalQuestoes > 0) {
    pct = (input.expectedQuestions / input.totalQuestoes) * 100
  } else if (input.weight) {
    // Fallback: peso como proxy (1.0 = média, > 1.5 = alta)
    pct = input.weight * 10
  }

  if (pct >= 15) return { selo: 'CRÍTICA', cor: '#dc2626', bg: '#fee2e2' }
  if (pct >= 10) return { selo: 'ALTA', cor: '#ea580c', bg: '#ffedd5' }
  if (pct >= 5) return { selo: 'MÉDIA', cor: '#ca8a04', bg: '#fef3c7' }
  return { selo: 'BAIXA', cor: '#475569', bg: '#f1f5f9' }
}
