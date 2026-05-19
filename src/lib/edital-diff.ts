import { prisma } from './prisma'
import crypto from 'crypto'

/**
 * Detecta mudanças entre um edital novo e o anterior do mesmo curso.
 * Compara: matérias adicionadas/removidas, programa alterado, pesos, formato.
 */

export type EditalChange = {
  changeType: 'MATERIA_ADICIONADA' | 'MATERIA_REMOVIDA' | 'PROGRAMA_ALTERADO' | 'PESO_ALTERADO' | 'FORMATO_ALTERADO'
  subjectId?: string
  subjectName?: string
  description: string
  diffData?: Record<string, unknown>
}

function hashProgram(text: string | null | undefined): string {
  if (!text) return ''
  return crypto.createHash('sha256').update(text.trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex').slice(0, 16)
}

export async function diffEditalAgainstPrevious(newEditalId: string): Promise<{
  previousEditalId: string | null
  changes: EditalChange[]
}> {
  const newEdital = await prisma.edital.findUnique({
    where: { id: newEditalId },
    include: { subjects: { include: { subject: true } }, course: true },
  })
  if (!newEdital) throw new Error('Edital não encontrado')

  // Edital anterior do mesmo curso (ano menor ou igual, excluindo o próprio)
  const previous = await prisma.edital.findFirst({
    where: { courseId: newEdital.courseId, id: { not: newEditalId }, ano: { lte: newEdital.ano } },
    include: { subjects: { include: { subject: true } } },
    orderBy: [{ ano: 'desc' }, { createdAt: 'desc' }],
  })

  if (!previous) return { previousEditalId: null, changes: [] }

  const changes: EditalChange[] = []

  const newBySubject = new Map(newEdital.subjects.map((s) => [s.subjectId, s]))
  const oldBySubject = new Map(previous.subjects.map((s) => [s.subjectId, s]))

  // Matérias adicionadas
  for (const [id, s] of newBySubject) {
    if (!oldBySubject.has(id)) {
      changes.push({
        changeType: 'MATERIA_ADICIONADA',
        subjectId: id,
        subjectName: s.subject.name,
        description: `Matéria "${s.subject.name}" foi ADICIONADA neste edital.`,
      })
    }
  }

  // Matérias removidas
  for (const [id, s] of oldBySubject) {
    if (!newBySubject.has(id)) {
      changes.push({
        changeType: 'MATERIA_REMOVIDA',
        subjectId: id,
        subjectName: s.subject.name,
        description: `Matéria "${s.subject.name}" foi REMOVIDA neste edital.`,
      })
    }
  }

  // Programa alterado (diff de hash) e peso alterado
  for (const [id, sNew] of newBySubject) {
    const sOld = oldBySubject.get(id)
    if (!sOld) continue
    if (hashProgram(sNew.programa) !== hashProgram(sOld.programa)) {
      changes.push({
        changeType: 'PROGRAMA_ALTERADO',
        subjectId: id,
        subjectName: sNew.subject.name,
        description: `Programa de "${sNew.subject.name}" foi alterado.`,
        diffData: {
          previous: sOld.programa?.slice(0, 500) ?? null,
          current: sNew.programa?.slice(0, 500) ?? null,
        },
      })
    }
    if (sNew.weight !== sOld.weight || sNew.expectedQuestions !== sOld.expectedQuestions) {
      changes.push({
        changeType: 'PESO_ALTERADO',
        subjectId: id,
        subjectName: sNew.subject.name,
        description: `Peso de "${sNew.subject.name}" mudou de ${sOld.weight} → ${sNew.weight} (questões esperadas: ${sOld.expectedQuestions ?? '?'} → ${sNew.expectedQuestions ?? '?'}).`,
      })
    }
  }

  // Formato alterado
  if (newEdital.examFormat !== previous.examFormat ||
      newEdital.totalQuestoes !== previous.totalQuestoes ||
      newEdital.duracaoMin !== previous.duracaoMin ||
      newEdital.hasRedacao !== previous.hasRedacao ||
      newEdital.wrongAnnulsRight !== previous.wrongAnnulsRight) {
    changes.push({
      changeType: 'FORMATO_ALTERADO',
      description: `Formato da prova mudou.`,
      diffData: {
        previous: {
          format: previous.examFormat,
          totalQuestoes: previous.totalQuestoes,
          duracaoMin: previous.duracaoMin,
          hasRedacao: previous.hasRedacao,
          wrongAnnulsRight: previous.wrongAnnulsRight,
        },
        current: {
          format: newEdital.examFormat,
          totalQuestoes: newEdital.totalQuestoes,
          duracaoMin: newEdital.duracaoMin,
          hasRedacao: newEdital.hasRedacao,
          wrongAnnulsRight: newEdital.wrongAnnulsRight,
        },
      },
    })
  }

  return { previousEditalId: previous.id, changes }
}

/**
 * Roda diff E persiste cada mudança no EditalChangeLog (skip duplicados não revisados).
 */
export async function detectAndPersistChanges(newEditalId: string) {
  const { previousEditalId, changes } = await diffEditalAgainstPrevious(newEditalId)
  if (changes.length === 0) return { previousEditalId, persisted: 0 }

  let persisted = 0
  for (const ch of changes) {
    // Evita duplicar
    const existing = await prisma.editalChangeLog.findFirst({
      where: { newEditalId, changeType: ch.changeType, subjectId: ch.subjectId ?? null, reviewed: false },
    })
    if (existing) continue
    await prisma.editalChangeLog.create({
      data: {
        newEditalId,
        previousEditalId,
        subjectId: ch.subjectId ?? null,
        changeType: ch.changeType,
        description: ch.description,
        diffData: ch.diffData as any,
      },
    })
    persisted++
  }
  return { previousEditalId, persisted, total: changes.length }
}
