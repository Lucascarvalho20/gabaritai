-- ════════════════════════════════════════════════════════════════════════════
-- Anotação do aluno em cada tentativa de prova anterior ("nesta prova fui
-- mediano porque…"), mostrada no resultado e no histórico do curso.
--
-- Só acrescenta uma coluna que pode ficar vazia: o código antigo continua
-- funcionando com ela (expand antes do contract). Idempotente.
-- No Supabase: SQL Editor → colar → Run. Se perguntar de RLS: "Run without RLS".
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "prova_tentativas" ADD COLUMN IF NOT EXISTS "anotacao" TEXT;

INSERT INTO "schema_migracoes" ("nome") VALUES ('2026-11-18-anotacao-tentativa') ON CONFLICT ("nome") DO NOTHING;

-- Conferência: deve mostrar a coluna nova.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'prova_tentativas' AND column_name = 'anotacao';
