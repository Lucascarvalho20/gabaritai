/**
 * Contas de teste do admin: alunos de mentira para ver o site como cada tipo
 * de aluno (1 curso, 2 cursos, todos, conta gratuita), entrando nelas pelo
 * "entrar como" do painel (api/admin/impersonate).
 *
 * Uma conta é de teste se o e-mail termina em @exemplo.invalid — o domínio
 * `.invalid` é reservado (RFC 6761) e nunca recebe e-mail. As rotas do painel
 * só mexem nessas contas, e só se forem de aluno: um id de aluno real
 * responde como se não existisse.
 */
import { randomBytes } from 'node:crypto'

export const DOMINIO_CONTA_TESTE = '@exemplo.invalid'

export function ehContaDeTeste(u: { email: string | null; role: string } | null | undefined): boolean {
  return !!u?.email && u.email.toLowerCase().endsWith(DOMINIO_CONTA_TESTE) && u.role === 'STUDENT'
}

/** E-mail novo de conta de teste a partir do nome ("Aluno teste — 3 cursos" → aluno-teste-3-cursos-a1b2@exemplo.invalid). */
export function emailDeTeste(nome: string): string {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'aluno'
  return `${base}-${randomBytes(2).toString('hex')}${DOMINIO_CONTA_TESTE}`
}

/**
 * Cadastro "completo" de conta de teste. O site manda quem não tem CPF e
 * telefone para /completar-cadastro, que exige um CPF e um telefone válidos e
 * inéditos — a trava antifraude. Conta de teste não tem nem pode ter os de
 * alguém: recebe marcadores únicos que não são CPF nem telefone ("teste:…"),
 * e nenhum código envia nada para o telefone (ele só diz que o cadastro está
 * completo). A trava segue igual para quem é aluno de verdade.
 */
export function cadastroDeTeste() {
  const marca = () => `teste:${randomBytes(12).toString('hex')}`
  return { cpfHash: marca(), phoneHash: marca(), phone: 'teste' }
}

/** Como a conta enxerga o site, em uma frase — o mesmo cálculo da regra de acesso (plan-access). */
export function situacaoDaConta(limites: { isBypassed: boolean; planSlug: string | null; maxCourses: number | null; isTrial: boolean; isFree: boolean; hasPlan: boolean }): string {
  if (limites.isBypassed) return 'Todos os cursos (acesso completo)'
  if (limites.planSlug === 'cortesia') return `Plano de ${limites.maxCourses} ${limites.maxCourses === 1 ? 'curso' : 'cursos'} (cortesia)`
  if (limites.isTrial) return 'Teste de 7 dias'
  if (limites.isFree) return 'Conta gratuita'
  return limites.hasPlan ? 'Plano pago' : 'Sem plano'
}
