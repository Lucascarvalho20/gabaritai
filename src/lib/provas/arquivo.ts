/**
 * O formato de uma prova oficial pronta para importar (data/provas/<slug>.json)
 * e a validação dele. Os arquivos são gerados a partir dos PDFs oficiais
 * (caderno + gabarito definitivo) e revisados antes de entrar no repositório.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type ProvaArquivo = {
  slug: string
  curso: string // slug do curso que recebe a prova
  titulo: string
  ano: number
  banca: string // slug da banca
  orgao: string
  cargo: string
  formato: 'CE' | 'ME_5' | 'ME_4'
  erradaAnulaCerta: boolean
  duracaoMin: number
  incluiaDiscursiva: boolean
  aplicadaEm: string | null
  fonte: { pagina: string; caderno: string; gabarito: string; aviso: string }
  textos: Array<{ codigo: string; titulo: string; conteudo: string; pagina?: number }>
  itens: Array<{
    numero: number
    materia: string
    texto: string | null
    comando: string | null
    enunciado: string
    gabarito: string | null
    anulada: boolean
    figura: boolean
    formula: boolean
    pagina: number | null
  }>
}

const RESPOSTAS: Record<ProvaArquivo['formato'], string[]> = {
  CE: ['C', 'E'],
  ME_5: ['A', 'B', 'C', 'D', 'E'],
  ME_4: ['A', 'B', 'C', 'D'],
}

/** Lista os problemas do arquivo; vazio = pode importar. */
export function problemasDaProva(p: ProvaArquivo): string[] {
  const erros: string[] = []
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug ?? '')) erros.push(`slug inválido: ${p.slug}`)
  if (!p.curso) erros.push('sem curso')
  if (!p.titulo) erros.push('sem título')
  if (!Number.isInteger(p.ano) || p.ano < 1990 || p.ano > 2100) erros.push(`ano inválido: ${p.ano}`)
  if (!RESPOSTAS[p.formato]) erros.push(`formato inválido: ${p.formato}`)
  if (!(p.duracaoMin > 0 && p.duracaoMin <= 600)) erros.push(`duração inválida: ${p.duracaoMin}`)
  if (!p.fonte?.caderno || !p.fonte?.gabarito || !p.fonte?.aviso) erros.push('fonte incompleta: a banca exige citar a fonte')
  if (!Array.isArray(p.itens) || p.itens.length === 0) return [...erros, 'sem itens']

  const codigos = new Set((p.textos ?? []).map((t) => t.codigo))
  const validas = RESPOSTAS[p.formato] ?? []
  p.itens.forEach((i, idx) => {
    if (i.numero !== idx + 1) erros.push(`numeração quebrada: posição ${idx + 1} tem o item ${i.numero}`)
    if (!i.materia) erros.push(`item ${i.numero} sem matéria`)
    if (!i.enunciado?.trim()) erros.push(`item ${i.numero} sem enunciado`)
    if (i.anulada && i.gabarito) erros.push(`item ${i.numero} anulado com gabarito`)
    if (!i.anulada && !validas.includes(i.gabarito ?? '')) erros.push(`item ${i.numero} com gabarito inválido: ${i.gabarito}`)
    if (i.texto && !codigos.has(i.texto)) erros.push(`item ${i.numero} cita texto ${i.texto}, que não existe`)
  })
  return erros
}

export function alternativasDoFormato(formato: ProvaArquivo['formato']): Array<{ letra: string; texto: string }> {
  return formato === 'CE'
    ? [{ letra: 'C', texto: 'Certo' }, { letra: 'E', texto: 'Errado' }]
    : RESPOSTAS[formato].map((letra) => ({ letra, texto: '' }))
}

/** As provas prontas no repositório. No deploy, a pasta vai junto (next.config: outputFileTracingIncludes). */
const PASTA = () => join(process.cwd(), 'data', 'provas')

export function listarArquivosDeProva(): string[] {
  return readdirSync(PASTA()).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
}

export function lerArquivoDeProva(slug: string): ProvaArquivo {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('slug inválido')
  return JSON.parse(readFileSync(join(PASTA(), `${slug}.json`), 'utf8'))
}
