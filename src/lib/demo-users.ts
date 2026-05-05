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
  { id: 'pmdf-soldado', label: 'PMDF — Soldado PM', categoria: 'policial', icon: '🛡️' },
  { id: 'pmdf-oficial', label: 'PMDF — Oficial', categoria: 'policial', icon: '⭐' },
  { id: 'pf-agente', label: 'Polícia Federal — Agente', categoria: 'policial', icon: '🔵' },
  { id: 'pf-delegado', label: 'Polícia Federal — Delegado', categoria: 'policial', icon: '🏅' },
  { id: 'prf-policial', label: 'PRF — Policial Rodoviário', categoria: 'policial', icon: '🚔' },
  { id: 'pcdf-delegado', label: 'PCDF — Delegado', categoria: 'policial', icon: '🔍' },
  { id: 'pcdf-agente', label: 'PCDF — Agente', categoria: 'policial', icon: '🔍' },
  { id: 'pol-legislativa', label: 'Polícia Legislativa', categoria: 'policial', icon: '🏛️' },
  { id: 'cbmdf-soldado', label: 'CBMDF — Soldado', categoria: 'militar', icon: '🚒' },
  { id: 'cbmdf-oficial', label: 'CBMDF — Oficial', categoria: 'militar', icon: '🚒' },
  { id: 'bb-escriturario', label: 'Banco do Brasil — Escriturário', categoria: 'banco', icon: '🏦' },
  { id: 'cef-tecnico', label: 'Caixa Econômica — Técnico', categoria: 'banco', icon: '💛' },
  { id: 'tjdft-tecnico', label: 'TJDFT — Técnico Judiciário', categoria: 'judiciario', icon: '⚖️' },
  { id: 'tjdft-analista', label: 'TJDFT — Analista Judiciário', categoria: 'judiciario', icon: '⚖️' },
  { id: 'cnu-bloco1', label: 'CNU — Bloco 1 (Infra/Eng)', categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco2', label: 'CNU — Bloco 2 (Regulação)', categoria: 'federal', icon: '🇧🇷' },
  { id: 'cnu-bloco3', label: 'CNU — Bloco 3 (Ambiental)', categoria: 'federal', icon: '🇧🇷' },
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
