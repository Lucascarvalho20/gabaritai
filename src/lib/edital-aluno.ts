/**
 * O edital que o ALUNO manda (PDF ou texto colado) para a calculadora: a IA lê
 * e devolve o órgão, a banca, a data da prova e, por cargo, as matérias com o
 * número de questões e o programa (os tópicos). A conta de tempo em cima disso
 * fica em calculadora.ts (estimarPrograma).
 *
 * Por que separado do extrator do admin (api/admin/editais/extract-structure):
 * lá o resultado vira edital oficial do site, revisado por uma pessoa; aqui é
 * do aluno, não grava nada no edital do curso e precisa ser barato — um aluno
 * do plano gratuito usa.
 *
 * Este arquivo só tem regras puras (o teste cobre sem banco); a leitura com
 * IA, cache e cota fica em edital-aluno-leitura.ts.
 *
 * CUIDADOS
 *  - A resposta da IA é dado não confiável (o próprio PDF pode trazer texto
 *    tentando mandar na IA): passa por `limparExtracao`, que só aceita os
 *    campos esperados, com tamanho e quantidade limitados.
 *  - O PDF não é guardado. Fica só a estrutura extraída, no cache, pela
 *    impressão digital (SHA-256) do arquivo: o mesmo edital mandado por cem
 *    alunos é lido pela IA uma vez — e o cache só guarda o que parece edital.
 *  - A cota diária só conta quando a IA trabalha de verdade.
 */
import { createHash } from 'node:crypto'
import type { MateriaPrograma } from './calculadora'

export const MAX_PDF_BYTES = 4 * 1024 * 1024 // a Vercel recusa corpo acima de 4,5 MB
export const MAX_TEXTO = 400_000
export const MIN_TEXTO = 300
const MAX_CARGOS = 20
const MAX_MATERIAS = 40
const MAX_TOPICOS = 300
const MAX_SUBTOPICOS = 60
const MAX_NOME = 160
/** Muda quando o prompt ou a limpeza mudam: o cache antigo deixa de valer. */
export const VERSAO_LEITURA = 'v1'

export class ErroEdital extends Error {
  status: number
  constructor(mensagem: string, status = 422) {
    super(mensagem)
    this.status = status
  }
}

export type CargoDoEdital = { nome: string; totalQuestoes: number | null; materias: MateriaPrograma[] }
export type EditalDoAluno = {
  orgao: string | null
  banca: string | null
  ano: number | null
  /** yyyy-mm-dd, só quando o edital diz. */
  dataProva: string | null
  cargos: CargoDoEdital[]
}

export const PROMPT_EDITAL_ALUNO = `Você lê o edital de um concurso público brasileiro e devolve SOMENTE um JSON, sem texto antes ou depois.

Não invente. O que não estiver no edital é null.

{
  "editalGeral": {
    "orgao": "nome do órgão",
    "banca": "banca organizadora",
    "ano": 2026,
    "dataProva": "data da prova objetiva no formato aaaa-mm-dd, ou null se o edital não diz"
  },
  "cargos": [
    {
      "nome": "nome do cargo",
      "totalQuestoes": 120,
      "materias": [
        {
          "nome": "Direito Penal",
          "qtdQuestoes": 15,
          "peso": 1,
          "topicos": [
            { "nome": "Aplicação da lei penal", "subtopicos": [] },
            { "nome": "Crimes contra a pessoa", "subtopicos": ["Homicídio", "Lesão corporal"] }
          ]
        }
      ]
    }
  ]
}

Regras:
1. Liste TODAS as matérias do conteúdo programático de cada cargo. Edital de polícia costuma ter de 8 a 18. Se você listou menos de 6, releia o anexo do conteúdo programático.
2. Cada item numerado do programa da matéria (1, 2, 3...) é um tópico. Os subitens (1.1, 1.2...) vão em "subtopicos". Nomes curtos, até 120 caracteres.
3. "qtdQuestoes" e "peso" vêm do quadro de provas do edital; null quando o edital não diz.
4. Nome de matéria limpo: "Língua Portuguesa", não "CONHECIMENTOS BÁSICOS — LÍNGUA PORTUGUESA". Separe blocos como "Conhecimentos Básicos" nas matérias de dentro deles.
5. Vários cargos com o mesmo programa: repita o programa em cada cargo.
6. Se o documento não for o edital de um concurso, responda {"erro": "o que o documento parece ser"}.`

// ─── Limpeza da resposta da IA ───────────────────────────────────────────────

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function texto(v: unknown, max = MAX_NOME): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  // Caractere de controle vira espaço (vem de PDF quebrado e confunde a tela).
  const t = Array.from(String(v), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').replace(/\s+/g, ' ').trim()
  if (!t) return null
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

function numero(v: unknown, min: number, max: number, inteiro = true): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n) || n < min || n > max) return null
  return inteiro ? Math.round(n) : Math.round(n * 100) / 100
}

/** Data da prova aceitável: dia real entre 2000 e 2100. */
export function dataDoEdital(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(a, mes - 1, d))
  if (a < 2000 || a > 2100 || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== d) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

function limparMateria(v: unknown): MateriaPrograma | null {
  const m = obj(v)
  const nome = texto(m.nome)
  if (!nome) return null
  const topicos = lista(m.topicos).slice(0, MAX_TOPICOS).flatMap((t) => {
    const tt = obj(t)
    const nomeTopico = typeof t === 'string' ? texto(t) : texto(tt.nome)
    if (!nomeTopico) return []
    const subtopicos = lista(tt.subtopicos).slice(0, MAX_SUBTOPICOS)
      .map((s) => (typeof s === 'string' ? texto(s) : texto(obj(s).nome)))
      .filter((s): s is string => !!s)
    return [{ nome: nomeTopico, subtopicos }]
  })
  return { nome, qtdQuestoes: numero(m.qtdQuestoes, 1, 500), peso: numero(m.peso, 0.1, 100, false), topicos }
}

/** Só os campos esperados, com limites. Sem cargo com matéria, não é edital que dê para calcular. */
export function limparExtracao(bruto: unknown): EditalDoAluno {
  const raiz = obj(bruto)
  const erro = texto(raiz.erro, 300)
  if (erro && !Array.isArray(raiz.cargos)) {
    throw new ErroEdital(`Isto não parece um edital de concurso (${erro}). Mande o PDF do edital de abertura, com o conteúdo programático.`)
  }
  const geral = obj(raiz.editalGeral)
  const cargos = lista(raiz.cargos).slice(0, MAX_CARGOS).flatMap((c) => {
    const cc = obj(c)
    const materias = lista(cc.materias).slice(0, MAX_MATERIAS).map(limparMateria).filter((m): m is MateriaPrograma => !!m)
    if (!materias.length) return []
    return [{ nome: texto(cc.nome) ?? 'Cargo do edital', totalQuestoes: numero(cc.totalQuestoes, 1, 1000), materias }]
  })
  if (!cargos.length) {
    throw new ErroEdital('Não encontrei as matérias neste documento. Ele é o edital de abertura, com o conteúdo programático?')
  }
  return {
    orgao: texto(geral.orgao),
    banca: texto(geral.banca, 80),
    ano: numero(geral.ano, 1990, 2100),
    dataProva: dataDoEdital(geral.dataProva),
    cargos,
  }
}

// ─── Texto colado ────────────────────────────────────────────────────────────

/**
 * Edital colado como texto pode ter 300 mil caracteres. O que a conta usa está
 * no começo (órgão, datas, quadro de provas) e no anexo do conteúdo
 * programático: recorta os dois, para caber em modelos com janela menor.
 */
export function recortarEdital(t: string): string {
  const limpo = t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (limpo.length <= 120_000) return limpo
  const anexo = limpo.search(/CONTE[ÚU]DOS?\s+PROGRAM[ÁA]TICOS?|OBJETOS?\s+DE\s+AVALIA[ÇC][ÃA]O|CONHECIMENTOS\s+(?:B[ÁA]SICOS|GERAIS)\s*[:\n]/i)
  const inicio = limpo.slice(0, 30_000)
  if (anexo < 30_000) return limpo.slice(0, 120_000)
  return `${inicio}\n\n[…]\n\n${limpo.slice(anexo, anexo + 90_000)}`
}

// ─── Conferência do arquivo ──────────────────────────────────────────────────

export function impressaoDigital(conteudo: Buffer | string): string {
  return createHash('sha256').update(conteudo).digest('hex')
}

export function pareceComPdf(b: Buffer): boolean {
  return b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-'
}
