/**
 * A leitura do edital do aluno: cache pela impressão digital do arquivo, cota
 * diária e a chamada à IA. As regras (prompt, limpeza da resposta, recorte do
 * texto) ficam em edital-aluno.ts.
 */
import { prisma } from './prisma'
import { callAI, callAIVision, parseAIJson } from './ai-client'
import { garantirCota, incrementQuota } from './ai-quota'
import {
  ErroEdital, impressaoDigital, limparExtracao, recortarEdital, PROMPT_EDITAL_ALUNO, VERSAO_LEITURA,
  type EditalDoAluno,
} from './edital-aluno'

/**
 * Lê o edital (do cache, se alguém já mandou o mesmo arquivo) e devolve a
 * estrutura limpa. `doCache` diz se a IA trabalhou agora.
 */
export async function lerEditalDoAluno(opts: {
  userId: string
  hasFullAccess: boolean
  pdf?: Buffer
  texto?: string
}): Promise<{ edital: EditalDoAluno; doCache: boolean }> {
  const { pdf } = opts
  const textoRecortado = opts.texto != null ? recortarEdital(opts.texto) : null
  if (!pdf && !textoRecortado) throw new ErroEdital('Mande o PDF do edital ou cole o texto dele.', 400)
  const chave = `edital-aluno:${VERSAO_LEITURA}:${impressaoDigital(pdf ?? textoRecortado!)}`

  const guardado = await prisma.aIGenerationCache.findUnique({ where: { cacheKey: chave } })
  if (guardado) {
    await prisma.aIGenerationCache.update({ where: { cacheKey: chave }, data: { hitCount: { increment: 1 }, lastUsedAt: new Date() } }).catch(() => {})
    return { edital: limparExtracao(guardado.content), doCache: true }
  }

  await garantirCota({ userId: opts.userId, kind: 'edital_aluno', hasFullAccess: opts.hasFullAccess })

  let bruto: string
  try {
    bruto = pdf
      ? await callAIVision({ prompt: PROMPT_EDITAL_ALUNO, imageBase64: pdf.toString('base64'), mimeType: 'application/pdf', maxTokens: 32000 })
      : await callAI(`${PROMPT_EDITAL_ALUNO}\n\nEDITAL:\n"""\n${textoRecortado}\n"""`, { task: 'extract', maxTokens: 16000, temperature: 0.1 })
  } catch (err) {
    console.error('[edital-aluno] IA', err)
    throw new ErroEdital(
      pdf
        ? 'Não consegui ler o PDF agora. Tente de novo em alguns minutos, ou cole o texto do edital.'
        : 'Não consegui ler o texto agora. Tente de novo em alguns minutos.',
      502,
    )
  }
  // Conta a partir daqui, mesmo que o arquivo não seja edital: a IA já trabalhou,
  // e mandar PDF aleatório em série não pode gastar a cota de IA do site de graça.
  await incrementQuota({ userId: opts.userId, kind: 'edital_aluno' })

  let edital: EditalDoAluno
  try {
    edital = limparExtracao(parseAIJson(bruto))
  } catch (err) {
    if (err instanceof ErroEdital) throw err
    throw new ErroEdital('A leitura do edital veio incompleta. Tente de novo; se repetir, cole o texto do conteúdo programático.', 502)
  }

  await prisma.aIGenerationCache.upsert({
    where: { cacheKey: chave },
    create: { cacheKey: chave, kind: 'edital_aluno', content: edital as unknown as object },
    update: { content: edital as unknown as object, lastUsedAt: new Date() },
  }).catch((err) => console.error('[edital-aluno] cache', err))
  return { edital, doCache: false }
}
