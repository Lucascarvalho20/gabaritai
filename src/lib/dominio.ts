/**
 * Soma uma resposta ao domínio do aluno na matéria (UserSubjectMastery), num
 * único UPSERT atômico: a soma é feita pelo banco. Ler, somar no servidor e
 * gravar — como era antes — perde uma das contas quando duas respostas chegam
 * juntas (dois cliques rápidos, duas abas).
 */
import { prisma } from './prisma'

export async function somarAoDominio(a: { userId: string; courseId: string; subjectId: string; acertou: boolean; idNovo: string }) {
  const acerto = a.acertou ? 1 : 0
  const [l] = await prisma.$queryRaw<Array<{ totalAttempts: number; correctAttempts: number }>>`
    INSERT INTO user_subject_mastery (id, "userId", "courseId", "subjectId", "totalAttempts", "correctAttempts", "masteryScore", "lastAttemptAt", "updatedAt")
    VALUES (${a.idNovo}, ${a.userId}, ${a.courseId}, ${a.subjectId}, 1, ${acerto}, ${acerto * 100}, now(), now())
    ON CONFLICT ("userId", "courseId", "subjectId") DO UPDATE SET
      "totalAttempts" = user_subject_mastery."totalAttempts" + 1,
      "correctAttempts" = user_subject_mastery."correctAttempts" + ${acerto},
      "masteryScore" = round(100.0 * (user_subject_mastery."correctAttempts" + ${acerto}) / (user_subject_mastery."totalAttempts" + 1)),
      "lastAttemptAt" = now(),
      "updatedAt" = now()
    RETURNING "totalAttempts", "correctAttempts"`
  const novo = Math.round((l.correctAttempts / l.totalAttempts) * 100)
  const antes = l.totalAttempts > 1 ? Math.round(((l.correctAttempts - acerto) / (l.totalAttempts - 1)) * 100) : 0
  return { antes, novo, total: l.totalAttempts, acertos: l.correctAttempts }
}
