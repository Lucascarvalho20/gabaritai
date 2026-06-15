-- =====================================================================
-- Cronômetro / diário de tempo de estudo (StudyTimeEntry)
-- =====================================================================
-- Registro LIVRE de tempo — NÃO ligado ao cronograma/estatísticas.
-- O aluno cronometra ao vivo ou lança manual e vê o histórico.
-- Idempotente: pode rodar de novo.
-- Rode no Supabase → SQL Editor (sem RLS — projeto usa Prisma server-side).
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE "StudyTimeType" AS ENUM ('MATERIA','QUESTOES','FLASHCARDS','SIMULADO','REVISAO','LEITURA','AULA','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudyTimeSource" AS ENUM ('TIMER','MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "study_time_entries" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "type"        "StudyTimeType" NOT NULL DEFAULT 'OUTRO',
  "label"       TEXT,
  "note"        TEXT,
  "courseId"    TEXT,
  "topicId"     TEXT,
  "startedAt"   TIMESTAMP(3),
  "endedAt"     TIMESTAMP(3),
  "durationSec" INTEGER NOT NULL,
  "source"      "StudyTimeSource" NOT NULL DEFAULT 'TIMER',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "study_time_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "study_time_entries_userId_createdAt_idx"
  ON "study_time_entries" ("userId", "createdAt");
-- =====================================================================
