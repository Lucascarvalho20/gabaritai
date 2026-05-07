/**
 * Usuários de demonstração / beta testers
 * Estes são os perfis de teste que vão ser usados pelos amigos do João
 *
 * SISTEMA DE ACESSO VITALÍCIO PARA BETA TESTERS:
 * - Quando o site for ao ar real, esses usuários podem cadastrar seu e-mail/senha real
 *   usando o código de beta que está em betaAccessCode
 * - Depois disso, a conta fica com plano LIFETIME para sempre
 * - Novos cadastros sem código = pagante
 */

export type CourseAccess = string[] | 'all'

export interface DemoUser {
  id: string
  name: string
  email: string
  password: string   // plaintext só para demo — em produção vai ser bcrypt no banco
  role: 'ADMIN' | 'STUDENT'
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'LIFETIME'
  courses: CourseAccess
  concursoAlvo: string
  nivel: string
  horasDia: string
  meta: string
  betaAccessCode?: string  // código pra virar conta vitalícia permanente
  isBetaTester?: boolean
}

export const DEMO_USERS: DemoUser[] = [
  // ─── ADMIN ──────────────────────────────────────────────────────────────────
  {
    id: 'admin-001',
    name: 'João Lucas — Admin',
    email: 'admin@gabaritai.com.br',
    password: 'Admin@2024!',
    role: 'ADMIN',
    plan: 'LIFETIME',
    courses: 'all',
    concursoAlvo: 'Administração',
    nivel: 'avancado',
    horasDia: '8',
    meta: 'Gerenciar a plataforma GabaritAI e ajudar todos os concurseiros a serem aprovados.',
  },

  // ─── BETA TESTER — ACESSO TOTAL (para testes completos) ─────────────────────
  {
    id: 'beta-full-001',
    name: 'Beta Tester — Acesso Total',
    email: 'beta@gabaritai.com.br',
    password: 'BetaFull@2024!',
    role: 'STUDENT',
    plan: 'LIFETIME',
    courses: 'all',
    concursoAlvo: 'Todos os cursos',
    nivel: 'intermediario',
    horasDia: '4',
    meta: 'Testar todas as funcionalidades da plataforma GabaritAI.',
    betaAccessCode: 'BETA-FULL-0001',
    isBetaTester: true,
  },

  // ─── PMDF — SOLDADO ─────────────────────────────────────────────────────────
  {
    id: 'beta-pmdf-001',
    name: 'Beta Tester — PMDF Soldado',
    email: 'pmdf@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'PREMIUM',
    courses: ['pmdf-soldado'],
    concursoAlvo: 'PMDF — Soldado',
    nivel: 'intermediario',
    horasDia: '4',
    meta: 'Ser aprovado no próximo concurso do PMDF para soldado e garantir estabilidade para minha família.',
    betaAccessCode: 'BETA-PMDF-0001',
    isBetaTester: true,
  },

  // ─── POLÍCIA FEDERAL ─────────────────────────────────────────────────────────
  {
    id: 'beta-pf-001',
    name: 'Beta Tester — PF + PRF',
    email: 'pf@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'PREMIUM',
    courses: ['pf-agente', 'prf-policial'],
    concursoAlvo: 'Polícia Federal',
    nivel: 'basico',
    horasDia: '3',
    meta: 'Passar na Polícia Federal ou PRF. Sonho de criança, vou realizar.',
    betaAccessCode: 'BETA-PF-0001',
    isBetaTester: true,
  },

  // ─── BANCO DO BRASIL ─────────────────────────────────────────────────────────
  {
    id: 'beta-bb-001',
    name: 'Beta Tester — Banco do Brasil',
    email: 'bb@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'BASIC',
    courses: ['bb-escriturario'],
    concursoAlvo: 'Banco do Brasil — Escriturário',
    nivel: 'zero',
    horasDia: '2',
    meta: 'Entrar no Banco do Brasil e ter uma carreira estável na área financeira.',
    betaAccessCode: 'BETA-BB-0001',
    isBetaTester: true,
  },

  // ─── TJDFT ───────────────────────────────────────────────────────────────────
  {
    id: 'beta-tjdft-001',
    name: 'Beta Tester — TJDFT',
    email: 'tjdft@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'PREMIUM',
    courses: ['tjdft-tecnico', 'tjdft-analista'],
    concursoAlvo: 'TJDFT — Técnico',
    nivel: 'intermediario',
    horasDia: '5',
    meta: 'Ser aprovado no TJDFT e construir uma carreira sólida no Poder Judiciário.',
    betaAccessCode: 'BETA-TJDFT-0001',
    isBetaTester: true,
  },

  // ─── CBMDF — BOMBEIRO MILITAR ────────────────────────────────────────────────
  {
    id: 'beta-cbmdf-001',
    name: 'Beta Tester — CBMDF (Praça e Oficial)',
    email: 'bombeiro@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'PREMIUM',
    courses: ['cbmdf-soldado', 'cbmdf-oficial'],
    concursoAlvo: 'CBMDF — Soldado/Oficial',
    nivel: 'basico',
    horasDia: '3',
    meta: 'Vestir a farda do Corpo de Bombeiros do DF, seja como soldado ou oficial.',
    betaAccessCode: 'BETA-CBMDF-0001',
    isBetaTester: true,
  },

  // ─── CEF — CAIXA ECONÔMICA ────────────────────────────────────────────────────
  {
    id: 'beta-cef-001',
    name: 'Beta Tester — Caixa Econômica',
    email: 'cef@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'BASIC',
    courses: ['cef-tecnico'],
    concursoAlvo: 'Caixa Econômica Federal',
    nivel: 'zero',
    horasDia: '2',
    meta: 'Trabalhar na Caixa Econômica Federal e ajudar minha família financeiramente.',
    betaAccessCode: 'BETA-CEF-0001',
    isBetaTester: true,
  },

  // ─── CNU / CONCURSO NACIONAL UNIFICADO ───────────────────────────────────────
  {
    id: 'beta-cnu-001',
    name: 'Beta Tester — CNU',
    email: 'cnu@gabaritai.com.br',
    password: 'Teste@2024!',
    role: 'STUDENT',
    plan: 'PREMIUM',
    courses: ['cnu-bloco1', 'cnu-bloco2', 'cnu-bloco3'],
    concursoAlvo: 'CNU — Concurso Nacional Unificado',
    nivel: 'intermediario',
    horasDia: '4',
    meta: 'Ser aprovado no CNU e entrar para o serviço público federal.',
    betaAccessCode: 'BETA-CNU-0001',
    isBetaTester: true,
  },
]

// Cursos disponíveis no sistema
export const CURSOS_DISPONIVEIS = [
  // Polícia Federal
  { id: 'pf-agente',      label: 'PF — Agente de Polícia Federal',      categoria: 'federal-seg', icon: '🔵' },
  { id: 'pf-delegado',    label: 'PF — Delegado de Polícia Federal',    categoria: 'federal-seg', icon: '🏅' },
  { id: 'pf-escrivao',    label: 'PF — Escrivão de Polícia Federal',    categoria: 'federal-seg', icon: '✍️' },
  { id: 'pf-perito',      label: 'PF — Perito Criminal Federal',        categoria: 'federal-seg', icon: '🔬' },
  { id: 'prf-policial',   label: 'PRF — Policial Rodoviário Federal',   categoria: 'federal-seg', icon: '🚔' },
  { id: 'pol-legislativa-camara', label: 'Pol. Legislativa — Câmara', categoria: 'federal-seg', icon: '🏛️' },
  { id: 'pol-legislativa-senado', label: 'Pol. Legislativa — Senado', categoria: 'federal-seg', icon: '🏛️' },
  // CNU
  { id: 'cnu-bloco1', label: 'CNU — Bloco 1 (Infraestrutura)',     categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco2', label: 'CNU — Bloco 2 (TI e Dados)',         categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco3', label: 'CNU — Bloco 3 (Ambiental)',          categoria: 'federal', icon: '🌿' },
  { id: 'cnu-bloco4', label: 'CNU — Bloco 4 (Trabalho/Prev.)',     categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco5', label: 'CNU — Bloco 5 (Educação)',           categoria: 'federal', icon: '📚' },
  { id: 'cnu-bloco6', label: 'CNU — Bloco 6 (Adm. Pública)',       categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco7', label: 'CNU — Bloco 7 (Regulação)',          categoria: 'federal', icon: '⚖️' },
  { id: 'cnu-bloco8', label: 'CNU — Bloco 8 (Nível Médio)',        categoria: 'federal', icon: '🇧🇷' },
  // PMDF
  { id: 'pmdf-soldado', label: 'PMDF — Soldado PM',   categoria: 'pm', icon: '🛡️' },
  { id: 'pmdf-oficial', label: 'PMDF — Oficial PM',   categoria: 'pm', icon: '⭐' },
  // PMs Estaduais
  { id: 'pm-sp-soldado', label: 'PMESP — Soldado PM (SP)',         categoria: 'pm', icon: '🛡️' },
  { id: 'pm-rj-soldado', label: 'PMERJ — Soldado PM (RJ)',         categoria: 'pm', icon: '🛡️' },
  { id: 'pm-mg-soldado', label: 'PMMG — Soldado PM (MG)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-rs-soldado', label: 'BM-RS — Soldado Brigada Militar', categoria: 'pm', icon: '🛡️' },
  { id: 'pm-ba-soldado', label: 'PMBA — Soldado PM (BA)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-ce-soldado', label: 'PMCE — Soldado PM (CE)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-go-soldado', label: 'PMGO — Soldado PM (GO)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-pe-soldado', label: 'PMPE — Soldado PM (PE)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-pr-soldado', label: 'PMPR — Soldado PM (PR)',          categoria: 'pm', icon: '🛡️' },
  { id: 'pm-sc-soldado', label: 'PMSC — Soldado PM (SC)',          categoria: 'pm', icon: '🛡️' },
  // Polícia Civil — DF
  { id: 'pc-df-agente',   label: 'PCDF — Agente de Polícia',  categoria: 'pc', icon: '🔍' },
  { id: 'pc-df-delegado', label: 'PCDF — Delegado',           categoria: 'pc', icon: '🏅' },
  { id: 'pc-df-escrivao', label: 'PCDF — Escrivão',           categoria: 'pc', icon: '✍️' },
  // Polícia Civil — Estados
  { id: 'pc-sp-agente', label: 'PCSP — Investigador (SP)',    categoria: 'pc', icon: '🔍' },
  { id: 'pc-rj-agente', label: 'PCRJ — Inspetor (RJ)',        categoria: 'pc', icon: '🔍' },
  { id: 'pc-mg-agente', label: 'PCMG — Investigador (MG)',    categoria: 'pc', icon: '🔍' },
  { id: 'pc-rs-agente', label: 'PC-RS — Agente/Delegado',     categoria: 'pc', icon: '🔍' },
  { id: 'pc-ba-agente', label: 'PC-BA — Investigador (BA)',   categoria: 'pc', icon: '🔍' },
  { id: 'pc-ce-agente', label: 'PC-CE — Inspetor (CE)',       categoria: 'pc', icon: '🔍' },
  { id: 'pc-pe-agente', label: 'PC-PE — Agente (PE)',         categoria: 'pc', icon: '🔍' },
  { id: 'pc-go-agente', label: 'PC-GO — Investigador (GO)',   categoria: 'pc', icon: '🔍' },
  { id: 'pc-agente-custodia', label: 'Agente de Custódia (Sistema Prisional)', categoria: 'pc', icon: '🔐' },
  // Bombeiros
  { id: 'cbmdf-soldado',  label: 'CBMDF — Soldado Bombeiro',       categoria: 'bombeiro', icon: '🚒' },
  { id: 'cbmdf-oficial',  label: 'CBMDF — Oficial Bombeiro',       categoria: 'bombeiro', icon: '🚒' },
  { id: 'cbm-sp-soldado', label: 'CBMSP — Soldado Bombeiro (SP)',  categoria: 'bombeiro', icon: '🚒' },
  { id: 'cbm-rj-soldado', label: 'CBMRJ — Soldado Bombeiro (RJ)', categoria: 'bombeiro', icon: '🚒' },
  { id: 'cbm-mg-soldado', label: 'CBMMG — Soldado Bombeiro (MG)', categoria: 'bombeiro', icon: '🚒' },
  { id: 'cbm-ba-soldado', label: 'CBMBA — Soldado Bombeiro (BA)', categoria: 'bombeiro', icon: '🚒' },
  // Bancos
  { id: 'bb-escriturario', label: 'Banco do Brasil — Escriturário', categoria: 'banco', icon: '🏦' },
  { id: 'cef-tecnico',     label: 'Caixa Econômica — Técnico',     categoria: 'banco', icon: '💛' },
  { id: 'bndes-analista',  label: 'BNDES — Analista',              categoria: 'banco', icon: '🏛️' },
  { id: 'bacen-analista',  label: 'Banco Central — Analista',      categoria: 'banco', icon: '🏛️' },
  // Judiciário
  { id: 'tjdft-tecnico',    label: 'TJDFT — Técnico Judiciário',     categoria: 'judiciario', icon: '⚖️' },
  { id: 'tjdft-analista',   label: 'TJDFT — Analista Judiciário',    categoria: 'judiciario', icon: '⚖️' },
  { id: 'stj-tecnico',      label: 'STJ — Técnico Judiciário',       categoria: 'judiciario', icon: '⚖️' },
  { id: 'trf-tecnico',      label: 'TRF — Técnico Judiciário',       categoria: 'judiciario', icon: '⚖️' },
  { id: 'tj-sp-escrevente', label: 'TJ-SP — Escrevente Técnico',    categoria: 'judiciario', icon: '⚖️' },
  // DETRAN
  { id: 'detran-df-agente', label: 'DETRAN-DF — Agente de Trânsito', categoria: 'transito', icon: '🚦' },
  { id: 'detran-sp-agente', label: 'DETRAN-SP — Agente de Trânsito', categoria: 'transito', icon: '🚦' },
  // Guarda Civil / Municipal
  { id: 'gcm-sp',    label: 'GCM — Guarda Civil Metropolitano (SP)', categoria: 'guarda', icon: '🏙️' },
  { id: 'gcm-rj',    label: 'GM — Guarda Municipal (RJ)',            categoria: 'guarda', icon: '🏙️' },
  { id: 'guarda-df', label: 'GCM-DF — Guarda Civil Metropolitana',  categoria: 'guarda', icon: '🏙️' },
]

export function findUserByEmail(email: string): DemoUser | undefined {
  return DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export function getCourseLabel(courseId: string): string {
  return CURSOS_DISPONIVEIS.find(c => c.id === courseId)?.label ?? courseId
}

export function hasAccessToCourse(user: DemoUser, courseId: string): boolean {
  if (user.courses === 'all') return true
  if (user.role === 'ADMIN') return true
  return (user.courses as string[]).includes(courseId)
}
