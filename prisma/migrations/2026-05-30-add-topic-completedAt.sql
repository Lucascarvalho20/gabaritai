-- ════════════════════════════════════════════════════════════════════════════
-- Migration: adiciona "tópico concluído" pelo aluno
-- Data: 2026-05-30
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → Cola tudo → Run
--
-- Idempotente: pode rodar várias vezes.
--
-- Pra que serve: aluno marca um tópico como "dominado", sai da fila de ESTUDO
-- novo no cronograma, mas continua na fila de REVISAO via SM-2 (flashcards
-- ainda voltam). Permite ao aluno controlar o ritmo dele.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "topic_attempts"
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "topic_attempts_userId_completedAt_idx"
  ON "topic_attempts" ("userId", "completedAt");

-- Verifica resultado:
-- SELECT COUNT(*) FROM "topic_attempts" WHERE "completedAt" IS NOT NULL;
-- ↑ deve retornar 0 (nenhum tópico marcado como concluído ainda)
