-- ════════════════════════════════════════════════════════════════════════════
-- Migration: adiciona conceito de "curso principal" + tracking de diagnóstico
-- Data: 2026-05-29
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → Cola tudo → Run
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Adiciona colunas novas (idempotente: IF NOT EXISTS)
ALTER TABLE "user_course_enrollments"
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "user_course_enrollments"
  ADD COLUMN IF NOT EXISTS "lastDiagnosticAt" TIMESTAMP(3);

-- 2. Cria índice composto (userId, isPrimary) — acelera busca do curso principal
CREATE INDEX IF NOT EXISTS "user_course_enrollments_userId_isPrimary_idx"
  ON "user_course_enrollments" ("userId", "isPrimary");

-- 3. Backfill: pra cada usuário, marca o primeiro enrollment ATIVO como principal.
--    Se já tem 1 marcado (caso de re-execução), não mexe.
WITH first_active AS (
  SELECT DISTINCT ON ("userId") "id", "userId"
  FROM "user_course_enrollments"
  WHERE "isActive" = true
  ORDER BY "userId", "enrolledAt" ASC
)
UPDATE "user_course_enrollments" e
SET "isPrimary" = true
FROM first_active f
WHERE e.id = f.id
  AND NOT EXISTS (
    SELECT 1 FROM "user_course_enrollments" e2
    WHERE e2."userId" = f."userId" AND e2."isPrimary" = true
  );

-- 4. Verifica resultado (rode pra conferir)
-- SELECT "userId", COUNT(*) FILTER (WHERE "isPrimary") AS primaries
-- FROM "user_course_enrollments"
-- GROUP BY "userId"
-- HAVING COUNT(*) FILTER (WHERE "isPrimary") > 1;
-- ↑ deve retornar 0 linhas (nenhum user com mais de 1 principal)
