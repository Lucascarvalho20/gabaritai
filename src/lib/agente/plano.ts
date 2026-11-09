/**
 * Validação do que o agente entrega — a última barreira entre o modelo e a tela.
 *
 * O modelo pode errar de formas que a tela não aguenta: lista vazia, texto
 * gigante, matéria que não existe, nome de matéria "corrigido" por ele. Então:
 *
 *  - Toda matéria tem que estar no escopo do aluno (as do edital dele). Id
 *    fora do escopo é recusado — o modelo não inventa matéria.
 *  - O NOME exibido vem do banco, não do modelo. Mesmo que ele escreva
 *    "Direito Penal Avançado", a tela mostra o nome cadastrado.
 *  - Tamanhos limitados: plano é para ler em um minuto.
 *
 * Erro aqui volta para o modelo como resultado da ferramenta (ver loop.ts),
 * e ele tenta de novo dentro do teto de passos.
 */

export type PrioridadePlano = { materiaId: string; materia: string; motivo: string; acoes: string[] }
export type PlanoDiagnostico = { resumo: string; prioridades: PrioridadePlano[] }

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function validarPlano(args: Record<string, unknown>, escopo: Map<string, string>): PlanoDiagnostico {
  const resumo = texto(args.resumo)
  if (!resumo) throw new Error('Falta "resumo".')
  if (resumo.length > 700) throw new Error('"resumo" passa de 700 caracteres. Seja mais direto.')

  const brutas = Array.isArray(args.prioridades) ? args.prioridades : []
  if (brutas.length < 1 || brutas.length > 4) throw new Error('"prioridades" precisa ter de 1 a 4 itens.')

  const vistas = new Set<string>()
  const prioridades = brutas.map((p: any, i: number) => {
    const materiaId = texto(p?.materia_id)
    const nome = escopo.get(materiaId)
    if (!nome) throw new Error(`prioridades[${i}].materia_id "${materiaId}" não é matéria do edital do aluno. Use os ids de consultar_desempenho.`)
    if (vistas.has(materiaId)) throw new Error(`Matéria repetida em prioridades: ${nome}.`)
    vistas.add(materiaId)

    const motivo = texto(p?.motivo)
    if (!motivo || motivo.length > 320) throw new Error(`prioridades[${i}].motivo vazio ou com mais de 320 caracteres.`)

    const acoes = (Array.isArray(p?.acoes) ? p.acoes : []).map(texto).filter(Boolean)
    if (acoes.length < 1 || acoes.length > 4) throw new Error(`prioridades[${i}].acoes precisa ter de 1 a 4 itens.`)
    if (acoes.some((a: string) => a.length > 220)) throw new Error(`prioridades[${i}]: alguma ação passa de 220 caracteres.`)

    return { materiaId, materia: nome, motivo, acoes }
  })

  return { resumo, prioridades }
}

/** Para as ferramentas que recebem `materia_id`: recusa o que está fora do escopo. */
export function exigirMateria(args: Record<string, unknown>, escopo: Map<string, string>): string {
  const id = texto(args.materia_id)
  if (!escopo.has(id)) throw new Error(`materia_id "${id}" não é matéria do edital do aluno.`)
  return id
}
