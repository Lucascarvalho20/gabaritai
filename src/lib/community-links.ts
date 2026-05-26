/**
 * Catálogo de links de comunidade (WhatsApp) por concurso.
 *
 * Por enquanto é dado em código — admin edita aqui e re-deploy. Quando
 * crescer, vira tabela Prisma + UI no /admin/comunidade.
 *
 * Mapa: parentSlug → { url, descricao, ativo }
 * Se parentSlug não bate, comunidade não aparece pra esse curso.
 */

export type CommunityLink = {
  parentSlug: string
  nome: string
  whatsappUrl: string | null
  descricao: string
  ativo: boolean
  membros?: number  // estimativa exibida ("80+ membros")
}

export const COMMUNITY_LINKS: CommunityLink[] = [
  // Configura aqui os links reais quando criar os grupos.
  // Exemplos (placeholders — substitua pelos seus links de convite):
  {
    parentSlug: 'pf',
    nome: 'Polícia Federal · Comunidade',
    whatsappUrl: null, // ex: 'https://chat.whatsapp.com/INVITE_ID'
    descricao: 'Aprovados, candidatos e dúvidas sobre Agente, Escrivão, Delegado, Perito, Papiloscopista.',
    ativo: false,
    membros: 0,
  },
  {
    parentSlug: 'prf',
    nome: 'Polícia Rodoviária Federal',
    whatsappUrl: null,
    descricao: 'Discussão sobre o concurso PRF, dicas de TAF, materiais e simulados.',
    ativo: false,
    membros: 0,
  },
  {
    parentSlug: 'pmdf',
    nome: 'PM-DF · Soldado e Oficial',
    whatsappUrl: null,
    descricao: 'Estudo coletivo, dicas dos aprovados, atualizações do edital.',
    ativo: false,
    membros: 0,
  },
  {
    parentSlug: 'pcdf',
    nome: 'PC-DF · todos os cargos',
    whatsappUrl: null,
    descricao: 'Agente, Escrivão, Delegado, Perito. Trocas de provas e simulados.',
    ativo: false,
    membros: 0,
  },
  {
    parentSlug: 'cbmdf',
    nome: 'Bombeiros DF',
    whatsappUrl: null,
    descricao: 'Concurso CBMDF — preparação física, intelectual e dicas.',
    ativo: false,
    membros: 0,
  },
]

export function getCommunityForCourse(parentSlug: string | null | undefined): CommunityLink | null {
  if (!parentSlug) return null
  return COMMUNITY_LINKS.find((c) => c.parentSlug === parentSlug && c.ativo) ?? null
}

export function getAllActiveCommunities(): CommunityLink[] {
  return COMMUNITY_LINKS.filter((c) => c.ativo)
}

export function getAllCommunities(): CommunityLink[] {
  return COMMUNITY_LINKS
}
